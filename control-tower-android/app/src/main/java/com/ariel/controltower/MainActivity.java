package com.ariel.controltower;

import static com.ariel.controltower.Theme.AMBER;
import static com.ariel.controltower.Theme.BG;
import static com.ariel.controltower.Theme.BLUE;
import static com.ariel.controltower.Theme.BORDER;
import static com.ariel.controltower.Theme.GREEN;
import static com.ariel.controltower.Theme.MUTED;
import static com.ariel.controltower.Theme.NAV;
import static com.ariel.controltower.Theme.RED;
import static com.ariel.controltower.Theme.SURFACE;
import static com.ariel.controltower.Theme.SURFACE_2;
import static com.ariel.controltower.Theme.TEAL;
import static com.ariel.controltower.Theme.TEXT;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.text.TextUtils;
import android.util.Log;
import android.view.DragEvent;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.ariel.controltower.model.BuildIdentity;
import com.ariel.controltower.model.DeputyDigest;
import com.ariel.controltower.model.Freshness;
import com.ariel.controltower.model.Hebrew;
import com.ariel.controltower.model.IdeaBoard;
import com.ariel.controltower.model.Labels;
import com.ariel.controltower.model.OsAlignment;
import com.ariel.controltower.model.Perf;
import com.ariel.controltower.model.Portfolio;
import com.ariel.controltower.model.Project;
import com.ariel.controltower.model.ProjectCard;
import com.ariel.controltower.model.Status;
import com.ariel.controltower.model.TimeText;
import com.ariel.controltower.model.UserMessage;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Control Tower — private single-owner Android client.
 * Data: PROJECT_CONTROL_BOARD Sheet via the Apps Script gateway ({@link Gateway}). Push: FCM, transport only.
 *
 * Two layers, one rule: what Ariel sees by default is short management Hebrew ({@link Labels}, {@link UserMessage},
 * {@link ProjectCard}); the structured machine data stays intact in {@link Project#raw} and is shown only
 * under "מידע למערכת". Every tap renders from memory first; the network only ever refreshes in the background.
 */
public class MainActivity extends Activity {
    private static final int TAB_NOW = 0, TAB_PROJECTS = 1, TAB_IDEAS = 2, TAB_DEPUTY = 3, TAB_SYSTEM = 4;
    private static final String CACHE_PREFS = "control_tower_cache";
    private static final long REFRESH_MIN_INTERVAL = 45_000L;
    private static final String REPO = "arieldeitch/ai-project-management-platform";
    private static final String TAG = "ControlTower";

    // Three workers: a slow GitHub probe or a stuck gateway call must never queue behind a tap's refresh.
    private final ExecutorService io = Executors.newFixedThreadPool(3);
    private FrameLayout contentHost;
    private LinearLayout nav;
    private int activeTab = TAB_NOW;
    private boolean detailOpen = false;
    private final int[] scrollY = new int[5];

    // In-memory state (parsed once; screens render from here without touching prefs or the network)
    private Portfolio portfolio;
    private IdeaBoard ideaBoard;
    private JSONArray inboxRaw;
    private List<DeputyDigest.Item> deputyItems = new ArrayList<>();
    private JSONArray alertsRaw;
    private final Map<String, Long> fetchedAt = new HashMap<>();
    private final Map<String, Boolean> inFlight = new HashMap<>();
    private String lastHumanError = "";
    private final List<String> technicalLog = new ArrayList<>();
    private BuildIdentity latestBuild;
    private boolean latestBuildChecked = false;
    private JSONObject healthRaw;

    // Projects filter state (obvious on screen; one tap to clear)
    private Status filterStatus = null;
    private boolean filterStale = false;
    private boolean filterOs = false;
    private boolean legendOpen = false;

    private boolean ideaSyncPending = false;
    private String expandedIdeaId = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Perf.setSink(line -> Log.d(TAG, line));
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(NAV);
        getSharedPreferences("control_tower_session", MODE_PRIVATE).edit().clear().apply();
        applyRoutingIntent(getIntent());
        loadCaches();
        if (Gateway.isConfigured(this)) showApp(); else showSetup(null);
    }

    @Override
    protected void onDestroy() {
        io.shutdownNow();
        super.onDestroy();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (applyRoutingIntent(intent) && contentHost != null) selectTab(activeTab);
    }

    @Override
    public void onBackPressed() {
        if (contentHost != null && detailOpen) { selectTab(activeTab); return; }
        if (contentHost != null && activeTab != TAB_NOW) { selectTab(TAB_NOW); return; }
        super.onBackPressed();
    }

    private boolean applyRoutingIntent(Intent intent) {
        if (intent == null) return false;
        String target = intent.getStringExtra(PushNotifications.EXTRA_TARGET);
        if (target == null) target = intent.getStringExtra("target");
        if (target == null) return false;
        switch (target) {
            case "now": activeTab = TAB_NOW; return true;
            case "projects": activeTab = TAB_PROJECTS; return true;
            case "ideas": activeTab = TAB_IDEAS; return true;
            case "deputy": activeTab = TAB_DEPUTY; return true;
            case "activity": case "system": activeTab = TAB_SYSTEM; return true;
            default: return false;
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PushNotifications.PERMISSION_REQUEST) PushNotifications.refreshAndRegisterToken(this);
    }

    // ---------- view helpers ----------

    private int dp(int n) { return Math.round(n * getResources().getDisplayMetrics().density); }

    private GradientDrawable box(int color, int strokeColor, int radiusDp) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(radiusDp));
        if (strokeColor != Color.TRANSPARENT) d.setStroke(dp(1), strokeColor);
        return d;
    }

    private TextView text(String value, float sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value);
        t.setTextColor(color);
        t.setTextSize(sp);
        t.setGravity(Gravity.START);
        t.setTextDirection(View.TEXT_DIRECTION_ANY_RTL);
        t.setTextAlignment(View.TEXT_ALIGNMENT_VIEW_START);
        t.setLineSpacing(0, 1.12f);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return t;
    }

    private LinearLayout.LayoutParams lp(int width, int height, int top, int bottom) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(width, height);
        p.topMargin = dp(top);
        p.bottomMargin = dp(bottom);
        return p;
    }

    private LinearLayout.LayoutParams full(int top, int bottom) {
        return lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, top, bottom);
    }

    private LinearLayout.LayoutParams grow() {
        return new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
    }

    /** Full-width primary/secondary button: one line, never clipped (the label list is bounded by Labels tests). */
    private Button actionButton(String label, boolean primary) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(15);
        b.setAllCaps(false);
        b.setMaxLines(1);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setTextColor(primary ? BG : TEXT);
        b.setBackground(box(primary ? BLUE : SURFACE_2, primary ? BLUE : BORDER, 12));
        b.setPadding(dp(14), 0, dp(14), 0);
        b.setMinHeight(dp(48));
        b.setMinimumHeight(dp(48));
        b.setMinWidth(0);
        b.setMinimumWidth(0);
        return b;
    }

    /** Small link-style button for the title row; wraps content so the title keeps the rest. */
    private Button linkButton(String label) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(14);
        b.setAllCaps(false);
        b.setMaxLines(1);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setTextColor(BLUE);
        b.setBackground(box(Theme.tint(BLUE, 24), Theme.tint(BLUE, 80), 12));
        b.setPadding(dp(14), 0, dp(14), 0);
        b.setMinHeight(dp(44));
        b.setMinimumHeight(dp(44));
        b.setMinWidth(0);
        b.setMinimumWidth(0);
        return b;
    }

    private EditText input(String hint, boolean multiline) {
        EditText e = new EditText(this);
        e.setHint(hint);
        e.setTextColor(TEXT);
        e.setHintTextColor(MUTED);
        e.setTextSize(15);
        e.setBackground(box(SURFACE, BORDER, 12));
        e.setPadding(dp(14), dp(multiline ? 12 : 0), dp(14), dp(multiline ? 12 : 0));
        e.setTextDirection(View.TEXT_DIRECTION_ANY_RTL);
        if (!multiline) e.setSingleLine(true); else e.setGravity(Gravity.TOP | Gravity.START);
        return e;
    }

    private LinearLayout row() {
        LinearLayout r = new LinearLayout(this);
        r.setOrientation(LinearLayout.HORIZONTAL);
        r.setGravity(Gravity.CENTER_VERTICAL);
        r.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        return r;
    }

    private LinearLayout column() {
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        return c;
    }

    /** Wrapping row for chips / small buttons: nothing is ever clipped at 360 dp or at large font scale. */
    private FlowLayout flow() {
        FlowLayout f = new FlowLayout(this, dp(6), dp(6));
        f.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        return f;
    }

    private LinearLayout card() {
        LinearLayout c = column();
        c.setPadding(dp(12), dp(10), dp(12), dp(10));
        c.setBackground(box(SURFACE, BORDER, 12));
        return c;
    }

    private TextView chip(String label, int color) {
        TextView b = text(label, 12, color, true);
        b.setMaxLines(1);
        b.setBackground(box(Theme.tint(color, 34), Theme.tint(color, 120), 20));
        b.setPadding(dp(9), dp(4), dp(9), dp(4));
        return b;
    }

    /** Tappable chip (filters, quick commands): 40 dp tall, wrap width, one line. */
    private TextView tapChip(String label, int color, boolean active) {
        TextView t = chip(label, color);
        t.setTextSize(13);
        t.setMinHeight(dp(40));
        t.setGravity(Gravity.CENTER);
        t.setPadding(dp(12), dp(8), dp(12), dp(8));
        if (active) { t.setBackground(box(Theme.tint(color, 110), color, 20)); t.setTextColor(TEXT); }
        return t;
    }

    private TextView section(String value) {
        TextView t = text(value, 15, TEXT, true);
        t.setPadding(0, dp(10), 0, dp(6));
        return t;
    }

    private View loading() {
        LinearLayout l = new LinearLayout(this);
        l.setGravity(Gravity.CENTER);
        ProgressBar p = new ProgressBar(this);
        l.addView(p, new LinearLayout.LayoutParams(dp(30), dp(30)));
        l.addView(text(Labels.LOADING, 13, MUTED, false));
        return l;
    }

    private String shortText(String value, int max) {
        String v = value == null ? "" : value.trim();
        if (v.length() <= max) return v;
        return v.substring(0, Math.max(0, max - 1)).trim() + "…";
    }

    private long now() { return System.currentTimeMillis(); }

    private int statusColor(Status s) {
        switch (s) {
            case NEEDS_ARIEL: return RED;
            case BLOCKED: return AMBER;
            case AT_RISK: return RED;
            case WATCH: return AMBER;
            default: return GREEN;
        }
    }

    private int osColor(OsAlignment a) {
        switch (a) {
            case CURRENT: return GREEN;
            case VERSION_DRIFT: case NEVER_SEEN: return AMBER;
            case ACCESS_FAILED: return RED;
            default: return MUTED;
        }
    }

    /** "▸ title" toggle that reveals a block only on tap — the progressive-disclosure primitive. */
    private void collapsible(LinearLayout parent, String title, LinearLayout body, boolean startOpen) {
        TextView toggle = text((startOpen ? "▾ " : "▸ ") + title, 14, BLUE, true);
        toggle.setMinHeight(dp(44));
        toggle.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
        toggle.setContentDescription(title);
        body.setVisibility(startOpen ? View.VISIBLE : View.GONE);
        toggle.setOnClickListener(v -> {
            Perf.Token t = Perf.begin("expand:" + title);
            boolean open = body.getVisibility() == View.VISIBLE;
            body.setVisibility(open ? View.GONE : View.VISIBLE);
            toggle.setText((open ? "▸ " : "▾ ") + title);
            endOnNextFrame(t);
        });
        parent.addView(toggle, full(2, 0));
        parent.addView(body, full(0, 2));
    }

    private void openUrl(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            Toast.makeText(this, "לא ניתן לפתוח את הקישור", Toast.LENGTH_SHORT).show();
        }
    }

    /** Stop the perf clock when the next frame is about to draw: tap → first visible response. */
    private void endOnNextFrame(Perf.Token t) {
        final View v = getWindow().getDecorView();
        v.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
            @Override public boolean onPreDraw() {
                v.getViewTreeObserver().removeOnPreDrawListener(this);
                Perf.end(t);
                return true;
            }
        });
    }

    private void technical(String line) {
        technicalLog.add(0, TimeText.absolutePlain(now()) + " " + line);
        while (technicalLog.size() > 20) technicalLog.remove(technicalLog.size() - 1);
        Log.d(TAG, line);
    }

    // ---------- caches (read once at start; every screen renders from memory) ----------

    private SharedPreferences cache() { return getSharedPreferences(CACHE_PREFS, MODE_PRIVATE); }

    private void loadCaches() {
        try {
            String json = cache().getString("portfolio", null);
            long at = cache().getLong("synced_at", -1);
            if (json != null && at > 0) {
                JSONObject body = new JSONObject(json);
                body.put("synced_at", at);
                portfolio = Portfolio.from(body, now(), true);
            }
        } catch (Exception ignored) { portfolio = null; }
        try {
            String json = cache().getString("ideas", null);
            if (json != null) ideaBoard = IdeaBoard.from(new JSONArray(json));
        } catch (Exception ignored) { ideaBoard = null; }
        try {
            String json = cache().getString("inbox", null);
            if (json != null) setInbox(new JSONArray(json));
        } catch (Exception ignored) { inboxRaw = null; }
        try {
            String json = cache().getString("alerts", null);
            if (json != null) alertsRaw = new JSONArray(json);
        } catch (Exception ignored) { alertsRaw = null; }
    }

    private void setInbox(JSONArray arr) {
        inboxRaw = arr;
        List<String> names = new ArrayList<>();
        if (portfolio != null) for (Project x : portfolio.projects) names.add(x.name);
        deputyItems = DeputyDigest.from(arr, names, now());
    }

    private boolean due(String key) {
        Long at = fetchedAt.get(key);
        return !Boolean.TRUE.equals(inFlight.get(key)) && (at == null || now() - at > REFRESH_MIN_INTERVAL);
    }

    private interface AfterFetch { void run(Gateway.Result r); }

    /** Background fetch with de-duplication; the callback runs on the UI thread and only if still relevant. */
    private void fetch(String key, String action, JSONObject params, AfterFetch after) {
        inFlight.put(key, true);
        io.execute(() -> {
            Gateway.Result r = Gateway.call(this, action, params);
            runOnUiThread(() -> {
                inFlight.put(key, false);
                if (r.ok()) { fetchedAt.put(key, now()); lastHumanError = ""; }
                else { lastHumanError = r.human(); technical(action + ": " + r.technical()); }
                if (contentHost != null) after.run(r);
            });
        });
    }

    private void refreshPortfolio(boolean force, Runnable onChange) {
        if (!force && !due("portfolio")) return;
        fetch("portfolio", "portfolio", new JSONObject(), r -> {
            if (r.ok()) {
                try {
                    long at = now();
                    JSONObject body = r.body;
                    body.put("synced_at", at);
                    cache().edit().putString("portfolio", body.toString()).putLong("synced_at", at).putInt("contract", body.optInt("contract_version", 1)).apply();
                    portfolio = Portfolio.from(body, at, false);
                    if (inboxRaw != null) setInbox(inboxRaw);
                } catch (Exception e) {
                    lastHumanError = "המידע שהתקבל אינו תקין — " + UserMessage.FIX_RUN;
                    technical("portfolio parse: " + e);
                }
            }
            onChange.run();
        });
    }

    private void refreshIdeas(boolean force, Runnable onChange) {
        if (!force && !due("ideas")) return;
        JSONObject p = new JSONObject();
        try { p.put("limit", 200); } catch (Exception ignored) {}
        fetch("ideas", "ideas", p, r -> {
            if (r.ok()) {
                JSONArray arr = r.body.optJSONArray("items");
                if (arr != null) {
                    cache().edit().putString("ideas", arr.toString()).apply();
                    if (!ideaSyncPending) ideaBoard = IdeaBoard.from(arr); // local edits win until synced
                }
            }
            onChange.run();
        });
    }

    private void refreshInbox(boolean force, Runnable onChange) {
        if (!force && !due("inbox")) return;
        JSONObject p = new JSONObject();
        try { p.put("limit", 100); } catch (Exception ignored) {}
        fetch("inbox", "inbox", p, r -> {
            if (r.ok()) {
                JSONArray arr = r.body.optJSONArray("items");
                if (arr != null) { cache().edit().putString("inbox", arr.toString()).apply(); setInbox(arr); }
            }
            onChange.run();
        });
    }

    private void refreshAlerts(boolean force, Runnable onChange) {
        if (!force && !due("alerts")) return;
        JSONObject p = new JSONObject();
        try { p.put("limit", 30); } catch (Exception ignored) {}
        fetch("alerts", "activity", p, r -> {
            if (r.ok()) {
                JSONArray arr = r.body.optJSONArray("items");
                if (arr != null) { cache().edit().putString("alerts", arr.toString()).apply(); alertsRaw = arr; }
            }
            onChange.run();
        });
    }

    // ---------- setup state (one-time; the only screen that may mention the connection address) ----------

    private void showSetup(String problem) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);
        LinearLayout wrap = column();
        wrap.setGravity(Gravity.CENTER_VERTICAL);
        wrap.setPadding(dp(24), dp(36), dp(24), dp(36));

        ImageView mark = new ImageView(this);
        mark.setImageResource(R.drawable.ic_brand_mark);
        mark.setContentDescription("מגדל הפיקוח");
        LinearLayout.LayoutParams markLp = new LinearLayout.LayoutParams(dp(64), dp(64));
        markLp.bottomMargin = dp(16);
        wrap.addView(mark, markLp);
        wrap.addView(text("מגדל הפיקוח", 28, TEXT, true));
        wrap.addView(text("חיבור חד־פעמי ללוח הבקרה", 15, MUTED, false), full(4, 18));
        wrap.addView(text(Gateway.isBuildConfigured() ? "ההגדרה שנשמרה במכשיר אינה תקינה — הדבק שוב." : "הדבק פעם אחת את הכתובת ואת הקוד שקיבלת.", 14, MUTED, false), full(0, 16));

        EditText url = input("כתובת החיבור", false);
        url.setText(Gateway.url(this));
        url.setTextDirection(View.TEXT_DIRECTION_LTR);
        url.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        wrap.addView(url, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(52), 0, 10));
        EditText token = input("קוד גישה (לפחות 32 תווים)", false);
        token.setTextDirection(View.TEXT_DIRECTION_LTR);
        token.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        wrap.addView(token, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(52), 0, 14));
        TextView status = text(problem == null ? "" : problem, 13, problem == null ? MUTED : RED, false);
        Button connect = actionButton("בדוק והתחבר", true);
        wrap.addView(connect, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(50), 0, 8));
        wrap.addView(status, full(6, 0));

        connect.setOnClickListener(v -> {
            String u = url.getText().toString().trim();
            String t = token.getText().toString().trim();
            if (!u.startsWith("https://script.google.com/")) { status.setText("הכתובת צריכה להתחיל ב-https://script.google.com/"); status.setTextColor(RED); return; }
            if (t.length() < 32) { status.setText("קוד הגישה קצר מדי."); status.setTextColor(RED); return; }
            connect.setEnabled(false);
            status.setText("בודק…");
            status.setTextColor(MUTED);
            Gateway.saveOverride(this, u, t);
            io.execute(() -> {
                Gateway.Result r = Gateway.call(this, "health", new JSONObject());
                runOnUiThread(() -> {
                    if (r.ok()) showApp();
                    else { Gateway.saveOverride(this, "", ""); connect.setEnabled(true); status.setText(r.human()); status.setTextColor(RED); technical("setup health: " + r.technical()); }
                });
            });
        });
        scroll.addView(wrap);
        setContentView(scroll);
        Insets.applySystemBars(scroll);
    }

    // ---------- shell + navigation ----------

    private void showApp() {
        LinearLayout root = column();
        root.setBackgroundColor(BG);
        contentHost = new FrameLayout(this);
        root.addView(contentHost, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        View divider = new View(this);
        divider.setBackgroundColor(BORDER);
        root.addView(divider, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(1)));
        nav = new LinearLayout(this);
        nav.setOrientation(LinearLayout.HORIZONTAL);
        nav.setPadding(dp(4), dp(6), dp(4), dp(6));
        nav.setGravity(Gravity.CENTER);
        nav.setBackgroundColor(NAV);
        root.addView(nav, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        setContentView(root);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int[] bars = Insets.bars(insets);
            v.setPadding(bars[0], bars[1], bars[2], 0);
            nav.setPadding(dp(4), dp(6), dp(4), dp(6) + bars[3]);
            return insets;
        });
        root.requestApplyInsets();
        selectTab(activeTab);
        PushNotifications.onAppReady(this);
    }

    /** Glyph above a one-line label: the label gets the tab's full width, so it never wraps at 360 dp / 1.3× font. */
    private void buildNav() {
        nav.removeAllViews();
        for (int i = 0; i < Labels.NAV.length; i++) {
            final int index = i;
            boolean active = activeTab == i;
            LinearLayout tab = column();
            tab.setGravity(Gravity.CENTER);
            tab.setPadding(0, dp(4), 0, dp(4));
            tab.setBackground(active ? box(Theme.tint(BLUE, 60), Theme.tint(BLUE, 140), 12) : box(Color.TRANSPARENT, Color.TRANSPARENT, 12));
            TextView glyph = text(Labels.NAV_GLYPH[i], 17, active ? TEXT : MUTED, false);
            glyph.setGravity(Gravity.CENTER);
            glyph.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
            tab.addView(glyph);
            TextView label = text(Labels.NAV[i], 12, active ? TEXT : MUTED, active);
            label.setMaxLines(1);
            label.setGravity(Gravity.CENTER);
            label.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
            tab.addView(label, full(1, 0));
            tab.setContentDescription(Labels.NAV[i] + (active ? " (מסך נוכחי)" : ""));
            tab.setOnClickListener(v -> selectTab(index));
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
            p.setMargins(dp(2), 0, dp(2), 0);
            nav.addView(tab, p);
        }
    }

    private ScrollView currentScroll() {
        return contentHost != null && contentHost.getChildCount() > 0 && contentHost.getChildAt(0) instanceof ScrollView ? (ScrollView) contentHost.getChildAt(0) : null;
    }

    private void selectTab(int index) {
        Perf.Token t = Perf.begin("tab:" + Labels.NAV[index]);
        ScrollView prev = currentScroll();
        if (prev != null && !detailOpen) scrollY[activeTab] = prev.getScrollY();
        activeTab = index;
        detailOpen = false;
        buildNav();
        contentHost.removeAllViews();
        if (index == TAB_NOW) showNow();
        else if (index == TAB_PROJECTS) showProjects();
        else if (index == TAB_IDEAS) showIdeas();
        else if (index == TAB_DEPUTY) showDeputy();
        else showSystem();
        ScrollView s = currentScroll();
        if (s != null && scrollY[index] > 0) { final int y = scrollY[index]; s.post(() -> s.scrollTo(0, y)); }
        endOnNextFrame(t);
    }

    /** Screen scaffold: title row (+ optional action button) then a re-renderable content column. */
    private ScrollView screen(String title, View action) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);
        LinearLayout col = column();
        col.setPadding(dp(14), dp(12), dp(14), dp(24));
        LinearLayout head = row();
        TextView t = text(title, 21, TEXT, true);
        t.setMaxLines(2);
        head.addView(t, grow());
        if (action != null) head.addView(action);
        col.addView(head, full(0, 6));
        LinearLayout content = column();
        content.setTag("screen-content");
        col.addView(content, full(0, 0));
        scroll.addView(col);
        return scroll;
    }

    private LinearLayout content(ScrollView scroll) {
        return (LinearLayout) scroll.findViewWithTag("screen-content");
    }

    /** One quiet line: how old the data on screen is; a human error line only when a refresh really failed. */
    private View freshnessLine(boolean refreshing) {
        LinearLayout box = column();
        if (portfolio != null) {
            long age = now() - portfolio.syncedAt;
            int color = age < 15 * 60_000L ? MUTED : age < 2 * Freshness.HOUR ? AMBER : RED;
            box.addView(text((refreshing ? Labels.REFRESHING + " · " : "") + Labels.UPDATED + " " + TimeText.relative(portfolio.syncedAt, now()), 12, color, false));
        } else if (refreshing) box.addView(text(Labels.LOADING, 12, MUTED, false));
        if (!lastHumanError.isEmpty()) box.addView(text(lastHumanError, 12, AMBER, false), full(2, 0));
        return box;
    }

    // ---------- project card: the management projection, nothing else ----------

    /** [Hebrew name] [status chip] / [one signal] / [updated · פתח]. Built only from ProjectCard — board prose cannot reach it. */
    private void addProjectRow(LinearLayout parent, Project p, boolean emphasise) {
        ProjectCard card = ProjectCard.of(p, now());
        LinearLayout c = card();
        if (emphasise) c.setBackground(box(SURFACE, Theme.tint(statusColor(card.statusValue), 140), 12));

        LinearLayout top = row();
        TextView name = text(card.title, 16, TEXT, true);
        name.setMaxLines(1);
        name.setEllipsize(TextUtils.TruncateAt.END);
        top.addView(name, grow());
        TextView st = chip(card.status, statusColor(card.statusValue));
        LinearLayout.LayoutParams stLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        stLp.setMarginStart(dp(8));
        top.addView(st, stLp);
        c.addView(top);

        if (!card.signal.isEmpty()) c.addView(text(card.signal, 14, TEXT, false), full(4, 0));

        FlowLayout meta = flow();
        TextView when = text(card.updated, 12, MUTED, false);
        when.setPadding(0, dp(4), 0, dp(4));
        meta.addView(when);
        for (String extra : ProjectCard.extraChips(p)) meta.addView(chip(extra, AMBER));
        TextView open = text(card.action + " ›", 12, BLUE, true);
        open.setPadding(0, dp(4), 0, dp(4));
        meta.addView(open);
        c.addView(meta, full(4, 0));

        c.setOnClickListener(v -> showProjectDetail(p));
        c.setContentDescription("פרויקט " + card.title + ", " + card.status + ". הקש לפתיחה");
        parent.addView(c, full(0, 8));
    }


    // ---------- עכשיו: what needs me now ----------

    private void showNow() {
        Button refresh = linkButton(Labels.ACTION_REFRESH);
        refresh.setContentDescription("רענון הנתונים מהלוח");
        ScrollView s = screen(Labels.TITLE_NOW, refresh);
        contentHost.addView(s);
        LinearLayout c = content(s);
        refresh.setOnClickListener(v -> {
            Perf.Token t = Perf.begin("refresh:now");
            renderNow(c, true);
            endOnNextFrame(t);
            refreshPortfolio(true, () -> { if (activeTab == TAB_NOW && !detailOpen) renderNow(c, false); });
            refreshInbox(true, () -> { if (activeTab == TAB_NOW && !detailOpen) renderNow(c, false); });
        });
        boolean refreshing = portfolio == null || due("portfolio");
        renderNow(c, refreshing);
        refreshPortfolio(false, () -> { if (activeTab == TAB_NOW && !detailOpen) renderNow(c, false); });
        refreshInbox(false, () -> { if (activeTab == TAB_NOW && !detailOpen) renderNow(c, false); });
    }

    private void renderNow(LinearLayout c, boolean refreshing) {
        c.removeAllViews();
        c.addView(freshnessLine(refreshing), full(0, 8));
        Portfolio p = portfolio;
        if (p == null) {
            if (refreshing) c.addView(loading(), full(20, 0));
            else renderLoadError(c);
            return;
        }
        List<Project> attention = p.attention();
        if (attention.isEmpty()) {
            LinearLayout ok = card();
            ok.setBackground(box(Theme.tint(GREEN, 22), Theme.tint(GREEN, 100), 12));
            ok.addView(text("✓ " + Labels.CALM_NOTHING_NEEDS_ME, 15, GREEN, true));
            c.addView(ok, full(2, 8));
        } else {
            c.addView(section(Labels.SECTION_NEEDS_ME + " (" + attention.size() + ")"));
            for (Project x : attention) addProjectRow(c, x, true);
        }

        c.addView(section(Labels.SECTION_PORTFOLIO));
        LinearLayout sum = card();
        int total = p.projects.size();
        int blocked = p.count(Status.BLOCKED), risk = p.count(Status.AT_RISK), needs = p.count(Status.NEEDS_ARIEL), ok = p.count(Status.OK);
        addSummaryLine(sum, Labels.portfolioSummary(total, ok, needs, blocked, risk), v -> { clearFilter(); selectTab(TAB_PROJECTS); });
        String os = Labels.osSummary(total, p.osAligned);
        if (!os.isEmpty()) addSummaryLine(sum, os, v -> { clearFilter(); filterOs = p.osAligned < total; selectTab(TAB_PROJECTS); });
        int openDeputy = 0;
        for (DeputyDigest.Item it : deputyItems) if (it.isOpen()) openDeputy++;
        addSummaryLine(sum, Labels.deputySummary(openDeputy), v -> selectTab(TAB_DEPUTY));
        c.addView(sum, full(0, 8));
        Button all = actionButton(Labels.ACTION_ALL_PROJECTS + " ›", false);
        all.setOnClickListener(v -> { clearFilter(); selectTab(TAB_PROJECTS); });
        c.addView(all, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(48), 0, 0));
    }

    private void addSummaryLine(LinearLayout card, String label, View.OnClickListener onTap) {
        TextView t = text("‹ " + label, 14, TEXT, false);
        t.setMinHeight(dp(44));
        t.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
        t.setOnClickListener(onTap);
        card.addView(t);
    }

    private void renderLoadError(LinearLayout c) {
        LinearLayout e = card();
        e.setBackground(box(Theme.tint(RED, 26), Theme.tint(RED, 120), 12));
        e.addView(text(lastHumanError.isEmpty() ? "עדיין אין מידע מהלוח" : lastHumanError, 15, TEXT, true));
        Button retry = actionButton("נסה שוב", true);
        retry.setOnClickListener(v -> selectTab(activeTab));
        e.addView(retry, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(48), 8, 0));
        c.addView(e, full(6, 0));
    }

    // ---------- פרויקטים: the whole portfolio, filterable ----------

    private void clearFilter() { filterStatus = null; filterStale = false; filterOs = false; }

    private boolean filterActive() { return filterStatus != null || filterStale || filterOs; }

    private String filterLabel() {
        if (filterStatus != null) return filterStatus.label;
        if (filterStale) return Labels.FILTER_STALE;
        if (filterOs) return Labels.FILTER_OS;
        return "";
    }

    private List<Project> applyFilter(Portfolio p) {
        List<Project> base = p.filter(filterStatus, filterStale);
        if (!filterOs) return base;
        List<Project> out = new ArrayList<>();
        for (Project x : base) if (x.osAlignment != OsAlignment.CURRENT) out.add(x);
        return out;
    }

    private void showProjects() {
        Button refresh = linkButton(Labels.ACTION_REFRESH);
        ScrollView s = screen(Labels.TITLE_PROJECTS, refresh);
        contentHost.addView(s);
        LinearLayout c = content(s);
        refresh.setOnClickListener(v -> {
            Perf.Token t = Perf.begin("refresh:projects");
            renderProjects(c, true);
            endOnNextFrame(t);
            refreshPortfolio(true, () -> { if (activeTab == TAB_PROJECTS && !detailOpen) renderProjects(c, false); });
        });
        renderProjects(c, portfolio == null || due("portfolio"));
        refreshPortfolio(false, () -> { if (activeTab == TAB_PROJECTS && !detailOpen) renderProjects(c, false); });
    }

    /** Filters re-render this column in place: the scroll view, title and scroll position stay. */
    private void rerenderProjects(LinearLayout c, String perfName) {
        Perf.Token t = Perf.begin(perfName);
        renderProjects(c, false);
        endOnNextFrame(t);
    }

    private void renderProjects(LinearLayout c, boolean refreshing) {
        c.removeAllViews();
        c.addView(freshnessLine(refreshing), full(0, 6));
        Portfolio p = portfolio;
        if (p == null) { if (refreshing) c.addView(loading(), full(20, 0)); else renderLoadError(c); return; }
        addFilterBar(c, p);
        if (p.projects.isEmpty()) { c.addView(text(Labels.EMPTY_PROJECTS, 14, MUTED, false)); return; }
        if (filterActive()) {
            List<Project> list = applyFilter(p);
            if (list.isEmpty()) c.addView(text(Labels.EMPTY_FILTER, 14, MUTED, false), full(6, 0));
            for (Project x : list) addProjectRow(c, x, false);
        } else {
            for (Status s : Status.values()) {
                List<Project> group = p.filter(s, false);
                if (group.isEmpty()) continue;
                c.addView(section(s.label + " (" + group.size() + ")"));
                for (Project x : group) addProjectRow(c, x, false);
            }
        }
        if (!p.infrastructure.isEmpty()) {
            c.addView(section("תשתית"));
            for (Project x : p.infrastructure) addProjectRow(c, x, false);
        }
    }

    private TextView filterChip(String label, int count, int color, boolean active, Runnable onTap) {
        // RIGHT-TO-LEFT MARK keeps the count on the Hebrew side even when the label ends in Latin.
        TextView t = tapChip(label + String.valueOf((char) 0x200F) + " " + count, count > 0 ? color : MUTED, active);
        t.setContentDescription((active ? "מסנן פעיל: " : "סנן לפי ") + label);
        t.setOnClickListener(v -> onTap.run());
        return t;
    }

    /** Status counts as tappable filters + legend toggle, wrapping as needed. Tapping the active filter clears it. */
    private void addFilterBar(LinearLayout c, Portfolio p) {
        FlowLayout chips = flow();
        for (Status s : Status.values()) {
            final Status st = s;
            chips.addView(filterChip(s.label, p.count(s), statusColor(s), filterStatus == s, () -> {
                boolean same = filterStatus == st; clearFilter(); if (!same) filterStatus = st; rerenderProjects(c, "filter:status");
            }));
        }
        chips.addView(filterChip(Labels.FILTER_STALE, p.stale, AMBER, filterStale, () -> { boolean was = filterStale; clearFilter(); filterStale = !was; rerenderProjects(c, "filter:stale"); }));
        chips.addView(filterChip(Labels.FILTER_OS, p.osNeedsAction, AMBER, filterOs, () -> { boolean was = filterOs; clearFilter(); filterOs = !was; rerenderProjects(c, "filter:os"); }));
        TextView legend = tapChip((legendOpen ? "✕ " : "ⓘ ") + (legendOpen ? Labels.ACTION_LEGEND_CLOSE : Labels.ACTION_LEGEND), BLUE, false);
        legend.setOnClickListener(v -> { legendOpen = !legendOpen; rerenderProjects(c, "legend"); });
        chips.addView(legend);
        c.addView(chips, full(0, 6));
        if (filterActive()) {
            LinearLayout f = row();
            f.addView(text("מסונן: " + filterLabel(), 14, TEXT, true), grow());
            Button clear = linkButton(Labels.ACTION_CLEAR_FILTER + " ✕");
            clear.setOnClickListener(v -> { clearFilter(); rerenderProjects(c, "filter:clear"); });
            f.addView(clear);
            c.addView(f, full(2, 4));
        }
        if (legendOpen) {
            LinearLayout lg = card();
            lg.addView(text("מה כל סטטוס אומר", 14, TEXT, true));
            for (Status s : Status.values()) lg.addView(text("• " + s.label + " — " + s.meaning + ".", 13, MUTED, false), full(4, 0));
            lg.addView(text("• " + Labels.FILTER_STALE + " — לא התקבל עדכון מהפרויקט זמן רב ביחס לקצב הצפוי שלו.", 13, MUTED, false), full(4, 0));
            lg.addView(text("• " + Labels.FILTER_OS + " — הפרויקט לא אישר שהוא עובד לפי מערכת ההפעלה הנוכחית.", 13, MUTED, false), full(4, 0));
            c.addView(lg, full(0, 8));
        }
    }

    // ---------- פרטי פרויקט ----------

    private void showProjectDetail(Project p) {
        Perf.Token perf = Perf.begin("open:project");
        ScrollView prev = currentScroll();
        if (prev != null) scrollY[activeTab] = prev.getScrollY();
        detailOpen = true;
        contentHost.removeAllViews();
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);
        LinearLayout c = column();
        c.setPadding(dp(14), dp(12), dp(14), dp(24));
        ProjectCard card = ProjectCard.of(p, now());

        LinearLayout head = row();
        TextView title = text(card.title, 21, TEXT, true);
        title.setMaxLines(2);
        head.addView(title, grow());
        Button back = linkButton("‹ " + Labels.ACTION_BACK);
        back.setOnClickListener(v -> selectTab(activeTab));
        head.addView(back);
        c.addView(head);

        FlowLayout chips = flow();
        chips.addView(chip(card.status, statusColor(card.statusValue)));
        for (String extra : ProjectCard.extraChips(p)) chips.addView(chip(extra, AMBER));
        if (p.osAlignment == OsAlignment.CURRENT) chips.addView(chip(p.osAlignment.label, GREEN));
        c.addView(chips, full(8, 6));

        // Management level only: status meaning, whether Ariel is needed, sync, freshness.
        LinearLayout main = card();
        main.addView(text(ProjectCard.detailLine(p), 16, TEXT, true));
        main.addView(text(p.status.meaning, 14, MUTED, false), full(4, 0));
        if (!card.signal.isEmpty()) main.addView(text(card.signal, 14, AMBER, false), full(4, 0));
        if (p.status == Status.NEEDS_ARIEL) main.addView(text("הפרטים אצל ה-GPT / הסוכן של הפרויקט", 13, MUTED, false), full(4, 0));
        if (p.osNeedsChip() || p.osAlignment == OsAlignment.ACCESS_FAILED) main.addView(text(p.osAlignment.meaning, 14, osColor(p.osAlignment), false), full(8, 0));
        main.addView(text(card.updated + (p.lastOsCheckMillis > 0 ? " · סנכרון אחרון " + TimeText.relative(p.lastOsCheckMillis, now()) : ""), 12, MUTED, false), full(8, 0));
        c.addView(main, full(0, 6));

        if (p.link.startsWith("http")) {
            Button open = actionButton("פתח את הפרויקט", true);
            open.setOnClickListener(v -> openUrl(p.link));
            c.addView(open, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(48), 6, 6));
        }

        // Secondary, visually separated, closed by default: the machine layer for GPT / Claude / the Chief.
        LinearLayout machine = card();
        machine.setBackground(box(SURFACE_2, BORDER, 12));
        machine.addView(text(Labels.MACHINE_NOTE, 12, MUTED, false), full(0, 6));
        for (String[] kv : p.boardProse()) {
            TextView k = text(kv[0], 11, BLUE, true);
            k.setTextDirection(View.TEXT_DIRECTION_LTR);
            k.setTypeface(Typeface.MONOSPACE);
            machine.addView(k, full(8, 0));
            TextView v = text(kv[1], 13, MUTED, false);
            machine.addView(v, full(2, 0));
        }
        String evUrl = p.osEvidenceUrl();
        if (!evUrl.isEmpty()) {
            Button ev = linkButton("אישור סנכרון");
            ev.setOnClickListener(v -> openUrl(evUrl));
            machine.addView(ev, lp(ViewGroup.LayoutParams.WRAP_CONTENT, dp(44), 8, 4));
        }
        LinearLayout tech = column();
        tech.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        for (String l : p.technicalLines()) {
            TextView t = text(l, 11, MUTED, false);
            t.setTextDirection(View.TEXT_DIRECTION_LTR);
            t.setTextAlignment(View.TEXT_ALIGNMENT_TEXT_START);
            t.setGravity(Gravity.START);
            t.setTypeface(Typeface.MONOSPACE);
            tech.addView(t, full(2, 0));
        }
        machine.addView(tech, full(10, 0));
        collapsible(c, Labels.SECTION_MACHINE, machine, false);

        Button backBottom = actionButton(Labels.ACTION_BACK, false);
        backBottom.setOnClickListener(v -> selectTab(activeTab));
        c.addView(backBottom, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(48), 10, 0));
        scroll.addView(c);
        contentHost.addView(scroll);
        endOnNextFrame(perf);
    }


    // ---------- רעיונות ----------

    private void showIdeas() {
        Button add = linkButton("+ " + Labels.ACTION_NEW_IDEA);
        ScrollView s = screen(Labels.TITLE_IDEAS, add);
        contentHost.addView(s);
        LinearLayout c = content(s);
        LinearLayout form = column();
        form.setVisibility(View.GONE);
        LinearLayout list = column();
        c.addView(form, full(0, 6));
        c.addView(list);
        add.setOnClickListener(v -> {
            Perf.Token t = Perf.begin("ideas:form");
            boolean open = form.getVisibility() == View.VISIBLE;
            form.setVisibility(open ? View.GONE : View.VISIBLE);
            add.setText(open ? "+ " + Labels.ACTION_NEW_IDEA : "✕ " + Labels.ACTION_CLOSE);
            endOnNextFrame(t);
        });
        buildIdeaForm(form, list);
        renderIdeas(list, ideaBoard == null);
        refreshIdeas(false, () -> { if (activeTab == TAB_IDEAS) renderIdeas(list, false); });
    }

    private void buildIdeaForm(LinearLayout form, LinearLayout list) {
        LinearLayout card = card();
        EditText title = input("שם קצר לרעיון", false);
        card.addView(title, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(48), 0, 6));
        EditText need = input("מה זה פותר? (לא חובה)", true);
        card.addView(need, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(64), 0, 6));
        final String[] bucket = {"LATER"};
        FlowLayout buckets = flow();
        for (int i = 0; i < IdeaBoard.BUCKETS.length; i++) {
            final String b = IdeaBoard.BUCKETS[i];
            TextView ch = tapChip(IdeaBoard.BUCKET_LABELS[i], TEAL, b.equals(bucket[0]));
            ch.setOnClickListener(v -> {
                bucket[0] = b;
                for (int j = 0; j < buckets.getChildCount(); j++) {
                    TextView x = (TextView) buckets.getChildAt(j);
                    boolean active = x == ch;
                    x.setBackground(active ? box(Theme.tint(TEAL, 110), TEAL, 20) : box(Theme.tint(TEAL, 34), Theme.tint(TEAL, 120), 20));
                    x.setTextColor(active ? TEXT : TEAL);
                }
            });
            buckets.addView(ch);
        }
        card.addView(buckets, full(0, 8));
        Button save = actionButton("שמור", true);
        TextView status = text("", 13, MUTED, false);
        card.addView(save, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(48), 0, 2));
        card.addView(status);
        form.addView(card);
        save.setOnClickListener(v -> {
            String t = title.getText().toString().trim();
            if (t.isEmpty()) { title.setError("צריך שם קצר"); return; }
            save.setEnabled(false);
            status.setText("שומר…");
            JSONObject p = new JSONObject();
            try { p.put("title", t); p.put("need", need.getText().toString().trim()); p.put("planning_bucket", bucket[0]); } catch (Exception ignored) {}
            io.execute(() -> {
                Gateway.Result r = Gateway.call(this, "create_idea", p);
                runOnUiThread(() -> {
                    save.setEnabled(true);
                    if (r.ok()) { title.setText(""); need.setText(""); status.setText("נשמר"); status.setTextColor(GREEN); refreshIdeas(true, () -> { if (activeTab == TAB_IDEAS) renderIdeas(list, false); }); }
                    else { status.setText(r.human()); status.setTextColor(RED); technical("create_idea: " + r.technical()); }
                });
            });
        });
    }

    private void renderIdeas(LinearLayout list, boolean loading) {
        list.removeAllViews();
        if (ideaBoard == null) { list.addView(loading ? loading() : text(lastHumanError.isEmpty() ? Labels.EMPTY_IDEAS : lastHumanError, 14, MUTED, false), full(10, 0)); return; }
        if (ideaBoard.size() == 0) { list.addView(text(Labels.EMPTY_IDEAS + " — הקש על " + Labels.ACTION_NEW_IDEA, 14, MUTED, false)); return; }
        list.addView(text("החזק וגרור כדי לסדר · הקש כדי לפתוח", 12, MUTED, false), full(0, 4));
        for (int b = 0; b < IdeaBoard.BUCKETS.length; b++) {
            final String bucket = IdeaBoard.BUCKETS[b];
            List<IdeaBoard.Idea> items = ideaBoard.inBucket(bucket);
            TextView head = section(IdeaBoard.BUCKET_LABELS[b] + " (" + items.size() + ")");
            head.setOnDragListener(dropListener(bucket, null, list, head));
            list.addView(head);
            if (items.isEmpty()) {
                TextView empty = text("— ריק —", 13, MUTED, false);
                empty.setMinHeight(dp(44));
                empty.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
                empty.setOnDragListener(dropListener(bucket, null, list, empty));
                list.addView(empty);
            }
            for (IdeaBoard.Idea idea : items) list.addView(ideaRow(idea, list), full(0, 6));
        }
    }

    private View ideaRow(IdeaBoard.Idea idea, LinearLayout list) {
        LinearLayout c = card();
        c.setBackground(box(SURFACE, Theme.tint(TEAL, 70), 12));
        LinearLayout top = row();
        TextView handle = text("≡", 18, MUTED, false);
        handle.setPadding(0, 0, dp(8), 0);
        handle.setContentDescription("גרור לשינוי סדר");
        top.addView(handle);
        TextView title = text(idea.title, 15, TEXT, true);
        title.setMaxLines(2);
        top.addView(title, grow());
        TextView stage = chip(Hebrew.ideaStage(idea.stage), TEAL);
        LinearLayout.LayoutParams stLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        stLp.setMarginStart(dp(8));
        top.addView(stage, stLp);
        c.addView(top);

        boolean expanded = idea.id.equals(expandedIdeaId);
        if (expanded) {
            if (!idea.need.isEmpty()) c.addView(text(shortText(idea.need, 300), 14, TEXT, false), full(6, 0));
            if (!idea.nextStep.isEmpty()) c.addView(text(Labels.NEXT + ": " + shortText(idea.nextStep, 160), 13, BLUE, true), full(4, 0));
            c.addView(text("בשלות " + idea.maturity + "% · " + ("HIGH".equals(idea.urgency) ? "דחוף" : "LOW".equals(idea.urgency) ? "לא דחוף" : "דחיפות בינונית"), 12, MUTED, false), full(4, 0));
            FlowLayout actions = flow();
            for (int i = 0; i < IdeaBoard.BUCKETS.length; i++) {
                final String b = IdeaBoard.BUCKETS[i];
                if (b.equals(idea.bucket)) continue;
                TextView mv = tapChip("→ " + IdeaBoard.BUCKET_LABELS[i], TEAL, false);
                mv.setOnClickListener(v -> moveIdea(idea.id, b, Integer.MAX_VALUE, list));
                actions.addView(mv);
            }
            TextView up = tapChip("▲ למעלה", TEAL, false);
            TextView down = tapChip("▼ למטה", TEAL, false);
            up.setOnClickListener(v -> nudgeIdea(idea.id, -1, list));
            down.setOnClickListener(v -> nudgeIdea(idea.id, +1, list));
            actions.addView(up);
            actions.addView(down);
            String nextStage = nextIdeaStage(idea.stage);
            if (!nextStage.isEmpty()) {
                TextView adv = tapChip("קדם ל־" + Hebrew.ideaStage(nextStage), BLUE, false);
                adv.setOnClickListener(v -> updateIdeaField(idea.id, "stage", nextStage, list));
                actions.addView(adv);
            }
            c.addView(actions, full(8, 0));
        }
        c.setOnClickListener(v -> {
            Perf.Token t = Perf.begin("ideas:expand");
            expandedIdeaId = expanded ? null : idea.id;
            renderIdeas(list, false);
            endOnNextFrame(t);
        });
        c.setOnLongClickListener(v -> {
            ClipData data = ClipData.newPlainText("idea", idea.id);
            v.startDragAndDrop(data, new View.DragShadowBuilder(v), idea.id, 0);
            return true;
        });
        c.setOnDragListener(dropListener(idea.bucket, idea.id, list, c));
        return c;
    }

    /** Drop on a row = insert before it; drop on a bucket header = append to that bucket. */
    private View.OnDragListener dropListener(String bucket, String beforeId, LinearLayout list, View target) {
        return (v, event) -> {
            switch (event.getAction()) {
                case DragEvent.ACTION_DRAG_STARTED: return event.getClipDescription() != null;
                case DragEvent.ACTION_DRAG_ENTERED: target.setAlpha(0.6f); return true;
                case DragEvent.ACTION_DRAG_EXITED: case DragEvent.ACTION_DRAG_ENDED: target.setAlpha(1f); return true;
                case DragEvent.ACTION_DROP: {
                    target.setAlpha(1f);
                    Object local = event.getLocalState();
                    String id = local instanceof String ? (String) local : (event.getClipData() != null && event.getClipData().getItemCount() > 0 ? String.valueOf(event.getClipData().getItemAt(0).getText()) : "");
                    if (id.isEmpty() || id.equals(beforeId)) return true;
                    int position = Integer.MAX_VALUE;
                    if (beforeId != null) {
                        List<IdeaBoard.Idea> items = ideaBoard.inBucket(bucket);
                        for (int i = 0; i < items.size(); i++) if (items.get(i).id.equals(beforeId)) { position = i; break; }
                        IdeaBoard.Idea moving = ideaBoard.find(id);
                        if (moving != null && moving.bucket.equals(bucket)) {
                            int from = -1;
                            for (int i = 0; i < items.size(); i++) if (items.get(i).id.equals(id)) from = i;
                            if (from >= 0 && from < position) position--;
                        }
                    }
                    moveIdea(id, bucket, position, list);
                    return true;
                }
                default: return true;
            }
        };
    }

    private void moveIdea(String id, String bucket, int position, LinearLayout list) {
        Perf.Token t = Perf.begin("ideas:move");
        if (ideaBoard == null || !ideaBoard.move(id, bucket, position)) return;
        renderIdeas(list, false);   // optimistic: the screen changes now
        endOnNextFrame(t);
        syncIdeaOrder(list);        // background: the sheet follows
    }

    private void nudgeIdea(String id, int delta, LinearLayout list) {
        Perf.Token t = Perf.begin("ideas:nudge");
        if (ideaBoard == null || !ideaBoard.nudge(id, delta)) return;
        renderIdeas(list, false);
        endOnNextFrame(t);
        syncIdeaOrder(list);
    }

    private void syncIdeaOrder(LinearLayout list) {
        ideaSyncPending = true;
        JSONObject p = new JSONObject();
        try { p.put("items", ideaBoard.reorderPayload()); } catch (Exception ignored) {}
        io.execute(() -> {
            Gateway.Result r = Gateway.call(this, "reorder_ideas", p);
            runOnUiThread(() -> {
                ideaSyncPending = false;
                if (!r.ok()) { Toast.makeText(this, "הסדר החדש לא נשמר — " + UserMessage.FIX_RUN, Toast.LENGTH_LONG).show(); technical("reorder_ideas: " + r.technical()); }
                refreshIdeas(true, () -> { if (activeTab == TAB_IDEAS) renderIdeas(list, false); });
            });
        });
    }

    private void updateIdeaField(String id, String field, String value, LinearLayout list) {
        IdeaBoard.Idea idea = ideaBoard == null ? null : ideaBoard.find(id);
        if (idea != null && "stage".equals(field)) { idea.stage = value; renderIdeas(list, false); }
        JSONObject p = new JSONObject();
        try { p.put("idea_id", id); p.put(field, value); } catch (Exception ignored) {}
        io.execute(() -> {
            Gateway.Result r = Gateway.call(this, "update_idea", p);
            runOnUiThread(() -> {
                if (!r.ok()) { Toast.makeText(this, r.human(), Toast.LENGTH_LONG).show(); technical("update_idea: " + r.technical()); }
                refreshIdeas(true, () -> { if (activeTab == TAB_IDEAS) renderIdeas(list, false); });
            });
        });
    }

    private String nextIdeaStage(String s) {
        if ("INBOX".equals(s)) return "CLARIFY"; if ("CLARIFY".equals(s)) return "SHAPE";
        if ("SHAPE".equals(s)) return "VALIDATE"; if ("VALIDATE".equals(s)) return "READY";
        return "";
    }

    // ---------- סגן ----------

    private void showDeputy() {
        Button compose = linkButton("+ " + Labels.ACTION_NEW_COMMAND);
        ScrollView s = screen(Labels.TITLE_DEPUTY, compose);
        contentHost.addView(s);
        LinearLayout c = content(s);
        LinearLayout form = column();
        form.setVisibility(View.GONE);
        c.addView(form, full(0, 6));
        LinearLayout list = column();
        c.addView(list);
        compose.setOnClickListener(v -> {
            Perf.Token t = Perf.begin("deputy:form");
            boolean open = form.getVisibility() == View.VISIBLE;
            form.setVisibility(open ? View.GONE : View.VISIBLE);
            compose.setText(open ? "+ " + Labels.ACTION_NEW_COMMAND : "✕ " + Labels.ACTION_CLOSE);
            endOnNextFrame(t);
        });

        LinearLayout card = card();
        EditText command = input("מה לנהל, לבדוק או לקדם?", true);
        card.addView(command, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(84), 0, 6));
        FlowLayout quick = flow();
        for (String q : new String[]{"בדוק מה תקוע", "מה דורש החלטה שלי?", "תן לי 3 עדיפויות"}) {
            TextView ch = tapChip(q, BLUE, false);
            ch.setOnClickListener(v -> command.setText(q));
            quick.addView(ch);
        }
        card.addView(quick, full(0, 8));
        Button send = actionButton("שלח לסגן", true);
        TextView result = text("", 13, MUTED, false);
        card.addView(send, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(48), 0, 2));
        card.addView(result);
        form.addView(card);
        send.setOnClickListener(v -> {
            String q = command.getText().toString().trim();
            if (q.isEmpty()) return;
            send.setEnabled(false);
            result.setText("שולח…");
            result.setTextColor(MUTED);
            io.execute(() -> {
                Gateway.Result r;
                try {
                    r = Gateway.call(this, "submit_report", new JSONObject().put("report_text", q).put("source", "deputy_command").put("device_id", Gateway.deviceId(this)));
                } catch (Exception e) {
                    r = new Gateway.Result(0, null, "השליחה נכשלה.");
                }
                Gateway.Result done = r;
                runOnUiThread(() -> {
                    send.setEnabled(true);
                    if (done.ok()) { command.setText(""); result.setText("נרשם. הסגן יטפל וידווח."); result.setTextColor(GREEN); refreshInbox(true, () -> { if (activeTab == TAB_DEPUTY) renderDeputy(list, false); }); }
                    else { result.setText(done.human()); result.setTextColor(RED); technical("submit_report: " + done.technical()); }
                });
            });
        });
        renderDeputy(list, inboxRaw == null);
        refreshInbox(false, () -> { if (activeTab == TAB_DEPUTY) renderDeputy(list, false); });
    }

    private void renderDeputy(LinearLayout list, boolean loading) {
        list.removeAllViews();
        if (inboxRaw == null) { list.addView(loading ? loading() : text(lastHumanError.isEmpty() ? Labels.EMPTY_DEPUTY : lastHumanError, 14, MUTED, false), full(10, 0)); return; }
        if (deputyItems.isEmpty()) { list.addView(text(Labels.EMPTY_DEPUTY, 14, MUTED, false)); return; }
        int open = 0;
        for (DeputyDigest.Item it : deputyItems) if (it.isOpen()) open++;
        list.addView(text(open == 0 ? "הכל טופל" : open == 1 ? "פריט אחד פתוח" : open + " פריטים פתוחים", 14, TEXT, true), full(0, 6));
        for (DeputyDigest.Item it : deputyItems) list.addView(deputyRow(it), full(0, 8));
    }

    private View deputyRow(DeputyDigest.Item it) {
        LinearLayout c = card();
        int color = it.kind == DeputyDigest.Kind.TECH_FAILURE || it.kind == DeputyDigest.Kind.SYNC_FAILURE ? RED
                : it.kind == DeputyDigest.Kind.USER_TEST || it.kind == DeputyDigest.Kind.DECISION || it.kind == DeputyDigest.Kind.DEPLOY_BLOCKED ? AMBER : BLUE;
        if (!it.isOpen()) c.setAlpha(0.7f);
        c.addView(text(it.problem, 15, TEXT, true));
        FlowLayout tags = flow();
        tags.addView(chip(DeputyDigest.kindLabel(it.kind), color));
        if (it.count > 1) tags.addView(chip("×" + it.count, MUTED));
        if (!it.owner.isEmpty()) tags.addView(chip(it.owner, MUTED));
        c.addView(tags, full(6, 0));
        if (!it.impact.isEmpty()) c.addView(text(Labels.WHY + ": " + it.impact, 13, MUTED, false), full(6, 0));
        c.addView(text(Labels.NEXT + ": " + it.nextAction, 14, TEXT, false), full(4, 0));
        c.addView(text((it.isOpen() ? "פתוח" : "טופל") + (it.lastSeenMillis > 0 ? " · " + TimeText.relative(it.lastSeenMillis, now()) : ""), 12, MUTED, false), full(4, 0));
        LinearLayout ev = column();
        for (String e : it.evidence) {
            TextView t = text(shortText(e, 400), 11, MUTED, false);
            t.setTypeface(Typeface.MONOSPACE);
            ev.addView(t, full(4, 0));
        }
        collapsible(c, Labels.SECTION_EVIDENCE + " (" + it.evidence.size() + ")", ev, false);
        return c;
    }

    // ---------- מערכת: version, connection, alerts; technical detail behind one toggle ----------

    private void showSystem() {
        ScrollView s = screen(Labels.TITLE_SYSTEM, null);
        contentHost.addView(s);
        LinearLayout c = content(s);
        renderSystem(c);
        // Background probes; each re-renders only its own line.
        if (!latestBuildChecked) {
            io.execute(() -> {
                BuildIdentity latest = Gateway.latestBuild(REPO, "control-tower-apk-build");
                runOnUiThread(() -> { latestBuild = latest; latestBuildChecked = true; if (activeTab == TAB_SYSTEM) renderSystem(c); });
            });
        }
        if (due("health")) {
            fetch("health", "health", new JSONObject(), r -> { if (r.ok()) healthRaw = r.body; if (activeTab == TAB_SYSTEM) renderSystem(c); });
        }
        refreshAlerts(false, () -> { if (activeTab == TAB_SYSTEM) renderSystem(c); });
    }

    private void renderSystem(LinearLayout c) {
        c.removeAllViews();
        BuildIdentity installed = new BuildIdentity(BuildConfig.VERSION_NAME, BuildConfig.VERSION_CODE, BuildConfig.GIT_SHA, BuildConfig.GIT_REF, TimeText.parse(BuildConfig.BUILD_TIME));

        LinearLayout ver = card();
        ver.addView(text(Labels.SECTION_VERSION, 12, BLUE, true));
        ver.addView(text("מותקנת בטלפון: " + BuildConfig.VERSION_NAME, 15, TEXT, true), full(4, 0));
        String verdict; int verdictColor = MUTED;
        if (!latestBuildChecked) verdict = "בודק אם יש גרסה חדשה…";
        else if (latestBuild == null) verdict = "לא ניתן לבדוק כרגע אם יש גרסה חדשה";
        else if (latestBuild.isNewerThan(installed)) { verdict = "יש גרסה חדשה להתקנה: " + latestBuild.versionName; verdictColor = AMBER; }
        else if (installed.isNewerThan(latestBuild)) verdict = "הטלפון מריץ גרסת פיתוח חדשה מהגרסה שפורסמה";
        else { verdict = "זו הגרסה העדכנית"; verdictColor = GREEN; }
        ver.addView(text(verdict, 13, verdictColor, false), full(3, 0));
        c.addView(ver, full(0, 8));

        LinearLayout system = card();
        system.addView(text(Labels.SECTION_CONNECTION, 12, BLUE, true));
        String conn;
        int connColor;
        if (healthRaw != null && lastHumanError.isEmpty()) {
            conn = "מחובר למגדל הפיקוח · " + healthRaw.optInt("projects_rows", 0) + " פרויקטים בלוח";
            connColor = TEXT;
            JSONObject osH = healthRaw.optJSONObject("os");
            if (healthRaw.optInt("contract_version", 1) < 5) { conn += " · מגדל הפיקוח צריך עדכון — " + UserMessage.FIX_RUN; connColor = AMBER; }
            else if (osH != null && !osH.optBoolean("os_current_marker_configured", false)) { conn += " · סנכרון מערכת ההפעלה עדיין לא הופעל"; connColor = AMBER; }
        } else if (!lastHumanError.isEmpty()) { conn = lastHumanError; connColor = RED; }
        else { conn = "בודק חיבור…"; connColor = MUTED; }
        system.addView(text(conn, 14, connColor, false), full(4, 0));
        TextView pushStatus = text(PushNotifications.humanStatus(this), 13, MUTED, false);
        system.addView(pushStatus, full(3, 0));
        FlowLayout buttons = flow();
        TextView testPush = tapChip("שלח התראת בדיקה", BLUE, false);
        testPush.setOnClickListener(v -> {
            testPush.setEnabled(false);
            pushStatus.setText("שולח התראת בדיקה…");
            PushNotifications.requestTestPush(this, msg -> runOnUiThread(() -> { testPush.setEnabled(true); pushStatus.setText(PushNotifications.humanTestResult(msg)); technical("test_push: " + msg); }));
        });
        TextView disconnect = tapChip("נתק והגדר מחדש", RED, false);
        disconnect.setOnClickListener(v -> PushNotifications.unregister(this, () -> {
            Gateway.saveOverride(this, "", "");
            cache().edit().clear().apply();
            if (Gateway.isBuildConfigured()) { Toast.makeText(this, "הטלפון נותק.", Toast.LENGTH_LONG).show(); selectTab(TAB_SYSTEM); }
            else showSetup(null);
        }));
        buttons.addView(testPush);
        buttons.addView(disconnect);
        system.addView(buttons, full(10, 0));
        c.addView(system, full(0, 8));

        c.addView(section(Labels.SECTION_ALERTS));
        if (alertsRaw == null) c.addView(text(due("alerts") ? Labels.LOADING : Labels.EMPTY_ALERTS, 13, MUTED, false));
        else if (alertsRaw.length() == 0) c.addView(text(Labels.EMPTY_ALERTS, 13, MUTED, false));
        else {
            for (int i = 0; i < alertsRaw.length(); i++) {
                JSONObject o = alertsRaw.optJSONObject(i);
                if (o == null) continue;
                LinearLayout item = card();
                LinearLayout top = row();
                top.addView(text(projectDisplayName(o.optString("project_key", "")), 14, TEXT, true), grow());
                top.addView(chip(Hebrew.pushEvent(o.optString("event")), BLUE));
                item.addView(top);
                long at = TimeText.parse(o.optString("occurred_at", ""));
                item.addView(text(Hebrew.ragMeaning(o.optString("rag", "")) + (at > 0 ? " · " + TimeText.relative(at, now()) : ""), 12, MUTED, false), full(4, 0));
                c.addView(item, full(0, 6));
            }
        }

        // Machine layer: everything raw, in one place, closed by default.
        LinearLayout tech = card();
        tech.setBackground(box(SURFACE_2, BORDER, 12));
        tech.setLayoutDirection(View.LAYOUT_DIRECTION_LTR); // machine text reads left-to-right
        List<String> lines = new ArrayList<>();
        lines.add("installed: " + installed.line(now()) + " · ref " + BuildConfig.GIT_REF + " · sha " + BuildConfig.GIT_SHA);
        lines.add("latest CI build: " + (latestBuild == null ? (latestBuildChecked ? "unavailable" : "checking") : latestBuild.line(now()) + " · " + latestBuild.ref));
        lines.add("gateway: " + Gateway.url(this));
        if (healthRaw != null) {
            lines.add("gateway_version " + healthRaw.optString("gateway_version") + " · contract " + healthRaw.optInt("contract_version") + " · fcm_configured " + healthRaw.optBoolean("fcm_configured") + " · scanner " + healthRaw.optBoolean("scanner_trigger_installed"));
            JSONObject osH = healthRaw.optJSONObject("os");
            if (osH != null) lines.add("os: " + osH.toString());
            JSONObject act = healthRaw.optJSONObject("activity");
            if (act != null) lines.add("activity: " + act.toString());
        }
        lines.add("push: " + PushNotifications.statusLine(this));
        lines.add("cache: portfolio " + (portfolio == null ? "-" : TimeText.absolutePlain(portfolio.syncedAt) + " contract " + portfolio.contractVersion) + " · ideas " + (ideaBoard == null ? "-" : ideaBoard.size()) + " · inbox " + (inboxRaw == null ? "-" : inboxRaw.length()));
        lines.add("perf (tap → first frame):\n" + Perf.report());
        if (!technicalLog.isEmpty()) { lines.add("last errors:"); lines.addAll(technicalLog); }
        for (String l : lines) {
            TextView t = text(l, 11, MUTED, false);
            t.setTextDirection(View.TEXT_DIRECTION_LTR);
            t.setTextAlignment(View.TEXT_ALIGNMENT_TEXT_START);
            t.setGravity(Gravity.START);
            t.setTypeface(Typeface.MONOSPACE);
            tech.addView(t, full(3, 0));
        }
        collapsible(c, Labels.SECTION_TECH, tech, false);
    }

    private String projectDisplayName(String key) {
        Portfolio p = portfolio;
        if (p != null) {
            for (Project x : p.projects) if (x.name.equalsIgnoreCase(key)) return x.displayName;
            for (Project x : p.infrastructure) if (x.name.equalsIgnoreCase(key)) return x.displayName;
        }
        String known = com.ariel.controltower.model.DisplayName.known(key);
        return known != null ? known : key.isEmpty() ? "פרויקט" : key;
    }
}
