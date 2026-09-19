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
import android.view.DragEvent;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
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
import com.ariel.controltower.model.OsAlignment;
import com.ariel.controltower.model.Portfolio;
import com.ariel.controltower.model.Project;
import com.ariel.controltower.model.Status;
import com.ariel.controltower.model.TimeText;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Control Tower — private single-owner Android client.
 * Data: PROJECT_CONTROL_BOARD Sheet via the Apps Script gateway ({@link Gateway}).
 * Push: FCM, transport only ({@link PushNotifications}).
 * Rule of the UI: compact first, detail only on explicit open. Every Ariel-facing string is Hebrew.
 */
public class MainActivity extends Activity {
    private static final int TAB_HOME = 0, TAB_PROJECTS = 1, TAB_IDEAS = 2, TAB_DEPUTY = 3, TAB_ACTIVITY = 4;
    private static final String CACHE_PREFS = "control_tower_cache";
    private static final long REFRESH_MIN_INTERVAL = 45_000L;
    private static final String REPO = "arieldeitch/ai-project-management-platform";

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private FrameLayout contentHost;
    private LinearLayout nav;
    private int activeTab = TAB_HOME;
    private boolean detailOpen = false;
    private boolean forceRefresh = false;
    private Portfolio portfolio;

    // Home / Projects filter state (in-memory; obvious on screen; one tap to clear)
    private Status filterStatus = null;
    private boolean filterStale = false;
    private boolean filterOs = false;
    private boolean legendOpen = false;

    // Ideas: optimistic local board + background sync
    private IdeaBoard ideaBoard;
    private boolean ideaSyncPending = false;
    private String expandedIdeaId = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(NAV);
        getSharedPreferences("control_tower_session", MODE_PRIVATE).edit().clear().apply();
        applyRoutingIntent(getIntent());
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
        if (contentHost != null && activeTab != TAB_HOME) { selectTab(TAB_HOME); return; }
        super.onBackPressed();
    }

    private boolean applyRoutingIntent(Intent intent) {
        if (intent == null) return false;
        String target = intent.getStringExtra(PushNotifications.EXTRA_TARGET);
        if (target == null) target = intent.getStringExtra("target");
        if (target == null) return false;
        switch (target) {
            case "now": activeTab = TAB_HOME; return true;
            case "projects": activeTab = TAB_PROJECTS; return true;
            case "ideas": activeTab = TAB_IDEAS; return true;
            case "deputy": activeTab = TAB_DEPUTY; return true;
            case "activity": activeTab = TAB_ACTIVITY; return true;
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

    private Button actionButton(String label, boolean primary) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(14);
        b.setAllCaps(false);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setTextColor(primary ? BG : TEXT);
        b.setBackground(box(primary ? BLUE : SURFACE_2, primary ? BLUE : BORDER, 12));
        b.setMinHeight(dp(44));
        b.setMinimumHeight(dp(44));
        return b;
    }

    private Button linkButton(String label) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(13);
        b.setAllCaps(false);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setTextColor(BLUE);
        b.setBackground(box(Theme.tint(BLUE, 24), Theme.tint(BLUE, 80), 12));
        b.setPadding(dp(12), 0, dp(12), 0);
        b.setMinHeight(dp(44));
        b.setMinimumHeight(dp(44));
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

    private LinearLayout card() {
        LinearLayout c = column();
        c.setPadding(dp(12), dp(10), dp(12), dp(10));
        c.setBackground(box(SURFACE, BORDER, 12));
        return c;
    }

    private TextView chip(String label, int color) {
        TextView b = text(label, 11, color, true);
        b.setBackground(box(Theme.tint(color, 34), Theme.tint(color, 120), 20));
        b.setPadding(dp(8), dp(3), dp(8), dp(3));
        return b;
    }

    private LinearLayout.LayoutParams chipLp() {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        p.setMarginEnd(dp(6));
        p.bottomMargin = dp(4);
        return p;
    }

    private TextView section(String value) {
        TextView t = text(value, 15, TEXT, true);
        t.setPadding(0, dp(8), 0, dp(6));
        return t;
    }

    private View loading() {
        LinearLayout l = new LinearLayout(this);
        l.setGravity(Gravity.CENTER);
        ProgressBar p = new ProgressBar(this);
        l.addView(p, new LinearLayout.LayoutParams(dp(34), dp(34)));
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
            case VERSION_DRIFT: return AMBER;
            case ACCESS_FAILED: return RED;
            default: return MUTED;
        }
    }

    private int freshnessColor(Freshness.State s) {
        switch (s) {
            case FRESH: return GREEN;
            case AGING: return AMBER;
            case STALE: return RED;
            default: return MUTED;
        }
    }

    /** "עוד פרטים ▾" toggle that reveals a block only on tap. */
    private void collapsible(LinearLayout parent, String title, LinearLayout body, boolean startOpen) {
        TextView toggle = text((startOpen ? "▾ " : "▸ ") + title, 13, BLUE, true);
        toggle.setMinHeight(dp(44));
        toggle.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
        toggle.setContentDescription(title);
        body.setVisibility(startOpen ? View.VISIBLE : View.GONE);
        toggle.setOnClickListener(v -> {
            boolean open = body.getVisibility() == View.VISIBLE;
            body.setVisibility(open ? View.GONE : View.VISIBLE);
            toggle.setText((open ? "▸ " : "▾ ") + title);
        });
        parent.addView(toggle, full(4, 0));
        parent.addView(body, full(0, 4));
    }

    private void openUrl(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            Toast.makeText(this, "לא ניתן לפתוח את הקישור", Toast.LENGTH_SHORT).show();
        }
    }

    // ---------- setup state ----------

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
        wrap.addView(text(Gateway.isBuildConfigured() ? "ההגדרה שנשמרה במכשיר אינה תקינה — הדבק שוב." : "הדבק פעם אחת את כתובת השער ואת הטוקן שקיבלת.", 14, MUTED, false), full(0, 16));

        EditText url = input("כתובת השער", false);
        url.setText(Gateway.url(this));
        url.setTextDirection(View.TEXT_DIRECTION_LTR);
        url.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        wrap.addView(url, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(52), 0, 10));
        EditText token = input("טוקן (לפחות 32 תווים)", false);
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
            if (t.length() < 32) { status.setText("הטוקן קצר מדי."); status.setTextColor(RED); return; }
            connect.setEnabled(false);
            status.setText("בודק…");
            status.setTextColor(MUTED);
            Gateway.saveOverride(this, u, t);
            io.execute(() -> {
                Gateway.Result r = Gateway.call(this, "health", new JSONObject());
                runOnUiThread(() -> {
                    if (r.ok()) showApp();
                    else { Gateway.saveOverride(this, "", ""); connect.setEnabled(true); status.setText(r.describe()); status.setTextColor(RED); }
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
        nav.setPadding(dp(6), dp(6), dp(6), dp(8));
        nav.setGravity(Gravity.CENTER);
        nav.setBackgroundColor(NAV);
        root.addView(nav, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(64)));
        setContentView(root);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int[] bars = Insets.bars(insets);
            v.setPadding(bars[0], bars[1], bars[2], 0);
            nav.setPadding(dp(6), dp(6), dp(6), dp(8) + bars[3]);
            nav.getLayoutParams().height = dp(64) + bars[3];
            nav.requestLayout();
            return insets;
        });
        root.requestApplyInsets();
        selectTab(activeTab);
        PushNotifications.onAppReady(this);
    }

    private void buildNav() {
        nav.removeAllViews();
        String[] labels = {"בית", "פרויקטים", "רעיונות", "סגן", "פעילות"};
        for (int i = 0; i < labels.length; i++) {
            final int index = i;
            boolean active = activeTab == i;
            Button b = new Button(this);
            b.setText(labels[i]);
            b.setAllCaps(false);
            b.setTextSize(13);
            b.setTypeface(Typeface.DEFAULT, active ? Typeface.BOLD : Typeface.NORMAL);
            b.setTextColor(active ? TEXT : MUTED);
            b.setBackground(active ? box(Theme.tint(BLUE, 60), Theme.tint(BLUE, 140), 12) : box(Color.TRANSPARENT, Color.TRANSPARENT, 12));
            b.setContentDescription(labels[i] + (active ? " (מסך נוכחי)" : ""));
            b.setOnClickListener(v -> selectTab(index));
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f);
            p.setMargins(dp(2), 0, dp(2), 0);
            nav.addView(b, p);
        }
    }

    private void selectTab(int index) {
        activeTab = index;
        detailOpen = false;
        buildNav();
        contentHost.removeAllViews();
        if (index == TAB_HOME) showHome();
        else if (index == TAB_PROJECTS) showProjects();
        else if (index == TAB_IDEAS) showIdeas();
        else if (index == TAB_DEPUTY) showDeputy();
        else showActivity();
    }

    /** Screen scaffold: compact title row (+ optional action button) then a re-renderable content column. */
    private ScrollView screen(String title, View action) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);
        LinearLayout col = column();
        col.setPadding(dp(14), dp(12), dp(14), dp(24));
        LinearLayout head = row();
        head.addView(text(title, 22, TEXT, true), grow());
        if (action != null) head.addView(action);
        col.addView(head, full(0, 8));
        LinearLayout content = column();
        content.setTag("screen-content");
        col.addView(content, full(0, 0));
        scroll.addView(col);
        return scroll;
    }

    private LinearLayout content(ScrollView scroll) {
        return (LinearLayout) scroll.findViewWithTag("screen-content");
    }

    // ---------- portfolio loading with cache ----------

    private interface PortfolioCallback { void run(Portfolio p, String error); }

    private SharedPreferences cache() { return getSharedPreferences(CACHE_PREFS, MODE_PRIVATE); }

    private Portfolio cachedPortfolio() {
        String json = cache().getString("portfolio", null);
        long at = cache().getLong("synced_at", -1);
        if (json == null || at <= 0) return null;
        try {
            JSONObject body = new JSONObject(json);
            body.put("synced_at", at);
            return Portfolio.from(body, now(), true);
        } catch (Exception e) {
            return null;
        }
    }

    private void loadPortfolio(PortfolioCallback cb) {
        io.execute(() -> {
            Gateway.Result r = Gateway.call(this, "portfolio", new JSONObject());
            if (r.ok()) {
                long at = now();
                try {
                    JSONObject body = r.body;
                    body.put("synced_at", at);
                    cache().edit().putString("portfolio", body.toString()).putLong("synced_at", at).putInt("contract", body.optInt("contract_version", 1)).apply();
                    Portfolio p = Portfolio.from(body, at, false);
                    runOnUiThread(() -> cb.run(p, null));
                } catch (Exception e) {
                    runOnUiThread(() -> cb.run(null, "התשובה מהשער אינה תקינה."));
                }
            } else {
                String msg = r.describe();
                runOnUiThread(() -> cb.run(null, msg));
            }
        });
    }

    /** Shared by Home and Projects: render cache instantly, refresh in place unless the snapshot is fresh. */
    private void loadInto(ScrollView s, LinearLayout c, int tab, Renderer render) {
        Portfolio cached = cachedPortfolio();
        if (cached != null) render.run(c, cached, null, true);
        else c.addView(loading(), lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(70), 10, 0));
        if (cached != null && !forceRefresh && now() - cached.syncedAt < REFRESH_MIN_INTERVAL) {
            c.removeAllViews();
            render.run(c, cached, null, false);
            return;
        }
        forceRefresh = false;
        loadPortfolio((p, err) -> {
            if (contentHost == null || activeTab != tab || detailOpen) return;
            int y = s.getScrollY();
            c.removeAllViews();
            if (p != null) render.run(c, p, null, false);
            else if (cached != null) render.run(c, cached, err, false);
            else renderLoadError(c, err);
            if (y > 0) s.post(() -> s.scrollTo(0, y));
        });
    }

    private interface Renderer { void run(LinearLayout c, Portfolio p, String refreshError, boolean refreshing); }

    private void renderLoadError(LinearLayout c, String err) {
        LinearLayout e = card();
        e.setBackground(box(Theme.tint(RED, 26), Theme.tint(RED, 120), 12));
        e.addView(text("לא ניתן לטעון את הפורטפוליו", 15, TEXT, true));
        e.addView(text(err == null || err.isEmpty() ? "בדוק חיבור לרשת או את הגדרת השער." : err, 13, MUTED, false), full(4, 8));
        Button retry = actionButton("נסה שוב", true);
        retry.setOnClickListener(v -> { forceRefresh = true; selectTab(activeTab); });
        e.addView(retry, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(44), 0, 0));
        c.addView(e, full(6, 0));
    }

    /** One line: when the data on screen was fetched, plus a warning only when a refresh actually failed. */
    private View snapshotLine(Portfolio p, String refreshError, boolean refreshing) {
        LinearLayout box = column();
        long age = now() - p.syncedAt;
        int color = age < 15 * 60_000L ? GREEN : age < 2 * Freshness.HOUR ? AMBER : RED;
        box.addView(text((refreshing ? "מרענן… · " : "") + "עודכן " + TimeText.relative(p.syncedAt, now()) + " · " + TimeText.absolute(p.syncedAt), 12, color, false));
        if (refreshError != null && !refreshError.isEmpty()) box.addView(text("מוצג עותק שמור — הרענון נכשל: " + refreshError, 12, AMBER, false), full(2, 0));
        return box;
    }

    // ---------- filters ----------

    private boolean filterActive() { return filterStatus != null || filterStale || filterOs; }

    private String filterLabel() {
        if (filterStatus != null) return filterStatus.label;
        if (filterStale) return "ישן";
        if (filterOs) return "לא מיושר ל-OS";
        return "";
    }

    private List<Project> applyFilter(Portfolio p) {
        List<Project> base = p.filter(filterStatus, filterStale);
        if (!filterOs) return base;
        List<Project> out = new ArrayList<>();
        for (Project x : base) if (x.osAlignment != OsAlignment.CURRENT) out.add(x);
        return out;
    }

    private TextView filterChip(String label, int count, int color, boolean active, Runnable onTap) {
        // RIGHT-TO-LEFT MARK keeps the count on the Hebrew side even when the label ends in Latin ("OS").
        TextView t = chip(label + String.valueOf((char) 0x200F) + " " + count, count > 0 ? color : MUTED);
        t.setTextSize(12);
        t.setMinHeight(dp(36));
        t.setGravity(Gravity.CENTER);
        t.setPadding(dp(10), dp(6), dp(10), dp(6));
        if (active) t.setBackground(box(Theme.tint(color, 110), color, 20));
        t.setContentDescription((active ? "מסנן פעיל: " : "סנן לפי ") + label);
        t.setOnClickListener(v -> onTap.run());
        return t;
    }

    /** Status counts as tappable filters + legend toggle. Tapping the active filter clears it. */
    private void addFilterBar(LinearLayout c, Portfolio p, int tab) {
        LinearLayout wrap = column();
        LinearLayout line1 = row();
        for (Status s : Status.values()) {
            final Status st = s;
            line1.addView(filterChip(s.label, p.count(s), statusColor(s), filterStatus == s, () -> {
                filterStatus = filterStatus == st ? null : st; filterStale = false; filterOs = false; selectTab(tab);
            }), chipLp());
        }
        wrap.addView(line1);
        LinearLayout line2 = row();
        line2.addView(filterChip("ישן", p.stale, AMBER, filterStale, () -> { filterStale = !filterStale; filterStatus = null; filterOs = false; selectTab(tab); }), chipLp());
        line2.addView(filterChip("לא מיושר ל-OS", p.osNeedsAction, MUTED, filterOs, () -> { filterOs = !filterOs; filterStatus = null; filterStale = false; selectTab(tab); }), chipLp());
        TextView legend = chip(legendOpen ? "✕ הסבר" : "ⓘ מה זה אומר", BLUE);
        legend.setMinHeight(dp(36));
        legend.setGravity(Gravity.CENTER);
        legend.setPadding(dp(10), dp(6), dp(10), dp(6));
        legend.setOnClickListener(v -> { legendOpen = !legendOpen; selectTab(tab); });
        line2.addView(legend, chipLp());
        wrap.addView(line2, full(2, 0));
        if (filterActive()) {
            LinearLayout f = row();
            f.addView(text("מסונן: " + filterLabel(), 13, TEXT, true), grow());
            Button clear = linkButton("נקה סינון ✕");
            clear.setOnClickListener(v -> { filterStatus = null; filterStale = false; filterOs = false; selectTab(tab); });
            f.addView(clear);
            wrap.addView(f, full(4, 0));
        }
        if (legendOpen) {
            LinearLayout lg = card();
            lg.addView(text("מה כל סטטוס אומר", 13, TEXT, true));
            for (Status s : Status.values()) lg.addView(text("• " + s.label + " — " + s.meaning + ". כלל: " + s.rule + ".", 12, MUTED, false), full(4, 0));
            lg.addView(text("• ישן — ההתקדמות המשמעותית האחרונה ישנה מפי שניים מהקצב הצפוי של הפרויקט.", 12, MUTED, false), full(4, 0));
            lg.addView(text("• לא מיושר ל-OS — אין ראיה שהפרויקט קרא את גרסת מערכת ההפעלה הנוכחית (לא נגזר מפעילות).", 12, MUTED, false), full(4, 0));
            wrap.addView(lg, full(6, 0));
        }
        c.addView(wrap, full(0, 6));
    }

    // ---------- compact project row ----------

    /** Two to three lines: name — purpose | status + why | activity time. Everything else is behind the tap. */
    private void addProjectRow(LinearLayout parent, Project p, boolean emphasise) {
        LinearLayout c = card();
        if (emphasise) c.setBackground(box(SURFACE, Theme.tint(statusColor(p.status), 140), 12));

        LinearLayout top = row();
        top.addView(text(p.compactTitle(), 15, TEXT, true), grow());
        top.addView(chip(p.status.label, statusColor(p.status)));
        c.addView(top);

        c.addView(text(p.statusReason, 12, MUTED, false), full(4, 0));
        if (p.status == Status.NEEDS_ARIEL || p.status == Status.BLOCKED) {
            String action = p.arielAction();
            if (!action.isEmpty() && !p.statusReason.contains(action)) c.addView(text("הבא: " + shortText(action, 110), 12, TEXT, false), full(3, 0));
        }

        LinearLayout when = row();
        StringBuilder t = new StringBuilder();
        if (p.latestActivityMillis > 0) t.append("פעילות ").append(TimeText.relative(p.latestActivityMillis, now())).append(" · ").append(TimeText.absolute(p.latestActivityMillis));
        else t.append("לא נצפתה פעילות");
        TextView whenText = text(t.toString(), 11, MUTED, false);
        when.addView(whenText, grow());
        if (p.freshness.state == Freshness.State.STALE || p.freshness.state == Freshness.State.AGING) when.addView(chip(Hebrew.freshness(p.freshness.state), freshnessColor(p.freshness.state)), chipLp());
        if (p.osAlignment != OsAlignment.CURRENT) when.addView(chip(p.osAlignment.label, osColor(p.osAlignment)), chipLp());
        c.addView(when, full(6, 0));

        c.setOnClickListener(v -> showProjectDetail(p));
        c.setContentDescription("פרויקט " + p.name + ", " + p.status.label + ". הקש לפרטים");
        parent.addView(c, full(0, 6));
    }

    // ---------- בית ----------

    private void showHome() {
        Button refresh = linkButton("רענון");
        refresh.setContentDescription("רענון הנתונים מהלוח");
        refresh.setOnClickListener(v -> { forceRefresh = true; selectTab(TAB_HOME); });
        ScrollView s = screen("מגדל הפיקוח", refresh);
        contentHost.addView(s);
        loadInto(s, content(s), TAB_HOME, this::renderHome);
    }

    private void renderHome(LinearLayout c, Portfolio p, String refreshError, boolean refreshing) {
        portfolio = p;
        c.addView(snapshotLine(p, refreshError, refreshing), full(0, 8));
        String headline = p.projects.size() + " פרויקטים · " + (p.needsAttention == 0 ? "אין משהו שמחכה לך" : p.needsAttention == 1 ? "אחד מחכה לך" : p.needsAttention + " מחכים לך")
                + (p.osAligned == p.projects.size() && !p.projects.isEmpty() ? " · כולם מיושרים ל-OS" : " · " + p.osNeedsAction + " ללא יישור OS");
        c.addView(text(headline, 13, TEXT, true), full(0, 8));
        addFilterBar(c, p, TAB_HOME);

        if (filterActive()) {
            List<Project> list = applyFilter(p);
            if (list.isEmpty()) c.addView(text("אין פרויקטים במסנן הזה.", 13, MUTED, false), full(6, 0));
            for (Project x : list) addProjectRow(c, x, x.needsAttention());
            return;
        }
        List<Project> attention = p.attention();
        if (!attention.isEmpty()) {
            c.addView(section("צריך אותי עכשיו (" + attention.size() + ")"));
            for (Project x : attention) addProjectRow(c, x, true);
        } else {
            LinearLayout ok = card();
            ok.setBackground(box(Theme.tint(GREEN, 22), Theme.tint(GREEN, 100), 12));
            ok.addView(text("✓ אין כרגע החלטה, חסם או בדיקה שמחכים לך", 13, GREEN, true));
            c.addView(ok, full(2, 6));
        }
        List<Project> calm = p.calm();
        if (!calm.isEmpty()) {
            c.addView(section("שאר הפרויקטים (" + calm.size() + ")"));
            for (Project x : calm) addProjectRow(c, x, false);
        }
        if (!p.infrastructure.isEmpty()) {
            c.addView(section("תשתית"));
            for (Project x : p.infrastructure) addProjectRow(c, x, false);
        }
    }

    // ---------- פרויקטים ----------

    private void showProjects() {
        Button home = linkButton("בית ‹");
        home.setOnClickListener(v -> selectTab(TAB_HOME));
        ScrollView s = screen("פרויקטים", home);
        contentHost.addView(s);
        loadInto(s, content(s), TAB_PROJECTS, this::renderProjects);
    }

    private void renderProjects(LinearLayout c, Portfolio p, String refreshError, boolean refreshing) {
        portfolio = p;
        c.addView(snapshotLine(p, refreshError, refreshing), full(0, 8));
        addFilterBar(c, p, TAB_PROJECTS);
        if (p.projects.isEmpty()) { c.addView(text("לא נמצאו פרויקטים בלוח.", 13, MUTED, false)); return; }
        if (filterActive()) {
            List<Project> list = applyFilter(p);
            if (list.isEmpty()) c.addView(text("אין פרויקטים במסנן הזה.", 13, MUTED, false), full(6, 0));
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

    // ---------- פרטי פרויקט ----------

    private void addField(LinearLayout c, String label, String value) {
        if (value == null || value.trim().isEmpty() || "null".equals(value)) return;
        c.addView(text(label, 11, BLUE, true), full(10, 0));
        c.addView(text(value, 14, TEXT, false), full(2, 0));
    }

    private void addExpandableField(LinearLayout c, String label, String value, int limit) {
        if (value == null || value.trim().isEmpty() || "null".equals(value)) return;
        String all = value.trim();
        if (all.length() <= limit + 40) { addField(c, label, all); return; }
        c.addView(text(label, 11, BLUE, true), full(10, 0));
        TextView body = text(shortText(all, limit), 14, TEXT, false);
        c.addView(body, full(2, 0));
        TextView more = text("הצג עוד", 12, BLUE, true);
        more.setMinHeight(dp(36));
        more.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
        c.addView(more, full(0, 0));
        more.setOnClickListener(v -> {
            boolean expanded = body.getText().length() > limit + 1;
            body.setText(expanded ? shortText(all, limit) : all);
            more.setText(expanded ? "הצג עוד" : "הצג פחות");
        });
    }

    private void showProjectDetail(Project p) {
        detailOpen = true;
        contentHost.removeAllViews();
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);
        LinearLayout c = column();
        c.setPadding(dp(14), dp(12), dp(14), dp(24));

        LinearLayout head = row();
        head.addView(text(p.name, 21, TEXT, true), grow());
        Button back = linkButton("‹ חזרה");
        back.setOnClickListener(v -> selectTab(activeTab));
        head.addView(back);
        c.addView(head);
        if (!p.shortDescription.isEmpty()) c.addView(text(p.shortDescription, 13, MUTED, false), full(2, 0));

        LinearLayout chips = row();
        chips.addView(chip(p.status.label, statusColor(p.status)), chipLp());
        chips.addView(chip(p.osAlignment.label, osColor(p.osAlignment)), chipLp());
        if (p.freshness.state != Freshness.State.FRESH) chips.addView(chip(Hebrew.freshness(p.freshness.state), freshnessColor(p.freshness.state)), chipLp());
        c.addView(chips, full(8, 0));
        String action = p.arielAction();
        boolean reasonRepeatsAction = p.needsAttention() && !action.isEmpty() && p.statusReason.contains(action);
        if (!reasonRepeatsAction) c.addView(text(p.statusReason, 13, TEXT, false), full(4, 8));

        // Compact time wall: two clocks, never conflated.
        LinearLayout wall = card();
        wall.setBackground(box(SURFACE_2, Theme.tint(freshnessColor(p.freshness.state), 140), 12));
        String act = p.latestActivityMillis > 0 ? TimeText.absolute(p.latestActivityMillis) + " · " + TimeText.relative(p.latestActivityMillis, now()) + " · " + Hebrew.activitySource(p.latestActivitySource) : "לא נצפתה פעילות";
        wall.addView(text("פעילות אחרונה: " + act, 13, TEXT, true));
        String prog = p.latestMeaningfulActivityMillis > 0 ? TimeText.absolute(p.latestMeaningfulActivityMillis) + " · " + TimeText.relative(p.latestMeaningfulActivityMillis, now()) : "לא זוהתה";
        wall.addView(text("התקדמות משמעותית: " + prog, 12, MUTED, false), full(3, 0));
        String note = p.freshness.note();
        if (!note.isEmpty()) wall.addView(text(note, 12, p.freshness.state == Freshness.State.UNKNOWN ? MUTED : freshnessColor(p.freshness.state), false), full(3, 0));
        c.addView(wall, full(0, 8));

        LinearLayout main = card();
        if (p.needsAttention()) {
            main.addView(text("מה צריך ממך", 11, RED, true));
            main.addView(text(action.isEmpty() ? "נדרשת החלטה או פעולה שלך" : action, 15, TEXT, true), full(2, 0));
        }
        addField(main, "הפעולה הבאה", p.nextAction);
        addField(main, "מה חוסם", p.blocker);
        addField(main, "מה המצב עכשיו", p.milestone.isEmpty() ? Hebrew.lifecycle(p.lifecycle) : p.milestone);
        c.addView(main, full(0, 6));

        LinearLayout more = card();
        addField(more, "מה המטרה", p.objective);
        addExpandableField(more, "מה נצפה לאחרונה", p.latestActivitySummary, 240);
        if (!p.progressEvidence.isEmpty() && !p.progressEvidence.equals(p.latestActivitySummary)) addExpandableField(more, "עדכון מאומת בלוח", p.progressEvidence, 240);
        addField(more, "רמת ביטחון", Hebrew.confidence(p.confidence));
        addField(more, "סיכון / סחיפה", p.risk);
        collapsible(c, "עוד פרטים", more, false);

        LinearLayout os = card();
        os.addView(text(p.osAlignment.label + " — " + p.osAlignment.meaning, 13, osColor(p.osAlignment), true));
        os.addView(text("בדיקת OS אחרונה: " + (p.lastOsCheckMillis > 0 ? TimeText.wall(p.lastOsCheckMillis, now()) : "אף פעם"), 12, MUTED, false), full(4, 0));
        if (!p.osChangeMarker.isEmpty() || !p.osCurrentMarker.isEmpty()) {
            os.addView(text("גרסת OS שנראתה: " + (p.osChangeMarker.isEmpty() ? "—" : p.osChangeMarker) + (p.osCurrentMarker.isEmpty() ? "" : " · נוכחית: " + p.osCurrentMarker), 12, MUTED, false), full(2, 0));
        }
        if (!p.osSyncAction.isEmpty()) os.addView(text("מה נדרש: " + p.osSyncAction, 12, TEXT, false), full(4, 0));
        String evUrl = p.osEvidenceUrl();
        if (!evUrl.isEmpty()) {
            Button ev = linkButton("פתח ראיית OS");
            ev.setOnClickListener(v -> openUrl(evUrl));
            os.addView(ev, lp(ViewGroup.LayoutParams.WRAP_CONTENT, dp(40), 6, 0));
        } else if (!p.osEvidence.isEmpty()) os.addView(text("ראיה: " + shortText(p.osEvidence, 120), 11, MUTED, false), full(3, 0));
        String check = p.lastControlCheckMillis > 0 ? TimeText.wall(p.lastControlCheckMillis, now()) : "לא נרשמה";
        os.addView(text("בדיקת מגדל הפיקוח האחרונה: " + check, 12, MUTED, false), full(8, 0));
        String cadence = p.expectedCadence.isEmpty() ? "לא הוגדר בלוח" : p.freshness.cadenceUnknown() ? "לא זוהה · בלוח רשום: " + p.expectedCadence : p.freshness.cadenceLabel;
        os.addView(text("קצב צפוי: " + cadence, 12, MUTED, false), full(2, 0));
        if (!p.id.isEmpty()) os.addView(text("מזהה בלוח: " + p.id, 11, MUTED, false), full(2, 0));
        collapsible(c, "יישור למערכת ההפעלה ובקרה", os, p.osAlignment != OsAlignment.CURRENT);

        if (p.link.startsWith("http")) {
            Button open = actionButton("פתח את הקישור הראשי", false);
            open.setOnClickListener(v -> openUrl(p.link));
            c.addView(open, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(46), 8, 6));
        }
        Button backBottom = actionButton("חזרה לרשימה", true);
        backBottom.setOnClickListener(v -> selectTab(activeTab));
        c.addView(backBottom, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(46), 2, 0));
        scroll.addView(c);
        contentHost.addView(scroll);
    }

    // ---------- רעיונות ----------

    private IdeaBoard cachedIdeas() {
        String json = cache().getString("ideas", null);
        if (json == null) return null;
        try { return IdeaBoard.from(new JSONArray(json)); } catch (Exception e) { return null; }
    }

    private void showIdeas() {
        Button add = linkButton("+ רעיון");
        ScrollView s = screen("רעיונות", add);
        contentHost.addView(s);
        LinearLayout c = content(s);
        LinearLayout form = column();
        form.setVisibility(View.GONE);
        LinearLayout list = column();
        c.addView(form, full(0, 6));
        c.addView(list);
        add.setOnClickListener(v -> {
            boolean open = form.getVisibility() == View.VISIBLE;
            form.setVisibility(open ? View.GONE : View.VISIBLE);
            add.setText(open ? "+ רעיון" : "✕ סגור");
        });
        buildIdeaForm(form, list);

        IdeaBoard cached = cachedIdeas();
        if (cached != null) { ideaBoard = cached; renderIdeas(list); }
        else list.addView(loading(), lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(70), 0, 0));
        refreshIdeas(list, cached == null);
    }

    /** Background refresh: never blocks, never overwrites unsaved local reordering. */
    private void refreshIdeas(LinearLayout list, boolean showErrors) {
        JSONObject p = new JSONObject();
        try { p.put("limit", 200); } catch (Exception ignored) {}
        fetchArray("ideas", p, "items", arr -> {
            if (activeTab != TAB_IDEAS) return;
            cache().edit().putString("ideas", arr.toString()).apply();
            if (ideaSyncPending) return; // local edits win until they are synced
            ideaBoard = IdeaBoard.from(arr);
            renderIdeas(list);
        }, msg -> {
            if (showErrors && activeTab == TAB_IDEAS) { list.removeAllViews(); list.addView(text("לא ניתן לטעון רעיונות: " + msg, 13, RED, false)); }
        });
    }

    private void buildIdeaForm(LinearLayout form, LinearLayout list) {
        LinearLayout card = card();
        EditText title = input("שם קצר לרעיון", false);
        card.addView(title, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(48), 0, 6));
        EditText need = input("מה זה פותר? (אופציונלי)", true);
        card.addView(need, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(64), 0, 6));
        final String[] bucket = {"LATER"};
        LinearLayout buckets = row();
        for (int i = 0; i < IdeaBoard.BUCKETS.length; i++) {
            final String b = IdeaBoard.BUCKETS[i];
            TextView ch = chip(IdeaBoard.BUCKET_LABELS[i], TEAL);
            ch.setMinHeight(dp(36)); ch.setGravity(Gravity.CENTER); ch.setPadding(dp(12), dp(6), dp(12), dp(6));
            if (b.equals(bucket[0])) ch.setBackground(box(Theme.tint(TEAL, 110), TEAL, 20));
            ch.setOnClickListener(v -> {
                bucket[0] = b;
                for (int j = 0; j < buckets.getChildCount(); j++) {
                    TextView x = (TextView) buckets.getChildAt(j);
                    boolean active = x == ch;
                    x.setBackground(active ? box(Theme.tint(TEAL, 110), TEAL, 20) : box(Theme.tint(TEAL, 34), Theme.tint(TEAL, 120), 20));
                }
            });
            buckets.addView(ch, chipLp());
        }
        card.addView(buckets, full(0, 6));
        Button save = actionButton("שמור", true);
        TextView status = text("", 12, MUTED, false);
        card.addView(save, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(44), 0, 2));
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
                    if (r.ok()) { title.setText(""); need.setText(""); status.setText("נשמר"); status.setTextColor(GREEN); refreshIdeas(list, false); }
                    else { status.setText(r.describe()); status.setTextColor(RED); }
                });
            });
        });
    }

    private void renderIdeas(LinearLayout list) {
        list.removeAllViews();
        if (ideaBoard == null || ideaBoard.size() == 0) { list.addView(text("עדיין אין רעיונות. הקש על + רעיון.", 13, MUTED, false)); return; }
        list.addView(text("החזק וגרור כדי לסדר · הקש כדי לפתוח", 11, MUTED, false), full(0, 4));
        for (int b = 0; b < IdeaBoard.BUCKETS.length; b++) {
            final String bucket = IdeaBoard.BUCKETS[b];
            List<IdeaBoard.Idea> items = ideaBoard.inBucket(bucket);
            TextView head = section(IdeaBoard.BUCKET_LABELS[b] + " (" + items.size() + ")");
            head.setBackground(box(Color.TRANSPARENT, Color.TRANSPARENT, 8));
            head.setOnDragListener(dropListener(bucket, null, list, head));
            list.addView(head);
            if (items.isEmpty()) {
                TextView empty = text("— ריק —", 12, MUTED, false);
                empty.setMinHeight(dp(40));
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
        top.addView(text(idea.title, 15, TEXT, true), grow());
        top.addView(chip(Hebrew.ideaStage(idea.stage), TEAL));
        c.addView(top);

        boolean expanded = idea.id.equals(expandedIdeaId);
        if (expanded) {
            if (!idea.need.isEmpty()) c.addView(text(shortText(idea.need, 300), 13, TEXT, false), full(6, 0));
            if (!idea.nextStep.isEmpty()) c.addView(text("הצעד הבא: " + shortText(idea.nextStep, 160), 12, BLUE, true), full(4, 0));
            c.addView(text("בשלות " + idea.maturity + "% · " + ("HIGH".equals(idea.urgency) ? "דחוף" : "LOW".equals(idea.urgency) ? "לא דחוף" : "דחיפות בינונית"), 11, MUTED, false), full(4, 0));
            LinearLayout actions = row();
            for (int i = 0; i < IdeaBoard.BUCKETS.length; i++) {
                final String b = IdeaBoard.BUCKETS[i];
                if (b.equals(idea.bucket)) continue;
                Button mv = actionButton("→ " + IdeaBoard.BUCKET_LABELS[i], false);
                mv.setTextSize(12);
                mv.setOnClickListener(v -> moveIdea(idea.id, b, Integer.MAX_VALUE, list));
                LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(40));
                p.setMarginEnd(dp(6));
                actions.addView(mv, p);
            }
            Button up = actionButton("▲", false); up.setTextSize(12); up.setContentDescription("הזז למעלה");
            Button down = actionButton("▼", false); down.setTextSize(12); down.setContentDescription("הזז למטה");
            up.setOnClickListener(v -> nudgeIdea(idea.id, -1, list));
            down.setOnClickListener(v -> nudgeIdea(idea.id, +1, list));
            LinearLayout.LayoutParams sq = new LinearLayout.LayoutParams(dp(44), dp(40));
            sq.setMarginEnd(dp(6));
            actions.addView(up, sq);
            actions.addView(down, new LinearLayout.LayoutParams(dp(44), dp(40)));
            c.addView(actions, full(8, 0));
            String nextStage = nextIdeaStage(idea.stage);
            if (!nextStage.isEmpty()) {
                Button adv = actionButton("קדם ל־" + Hebrew.ideaStage(nextStage), false);
                adv.setTextSize(12);
                adv.setOnClickListener(v -> updateIdeaField(idea.id, "stage", nextStage, list));
                c.addView(adv, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(40), 6, 0));
            }
        }
        c.setOnClickListener(v -> { expandedIdeaId = expanded ? null : idea.id; renderIdeas(list); });
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
        if (ideaBoard == null || !ideaBoard.move(id, bucket, position)) return;
        renderIdeas(list);            // optimistic: the screen changes now
        syncIdeaOrder(list);          // background: the sheet follows
    }

    private void nudgeIdea(String id, int delta, LinearLayout list) {
        if (ideaBoard == null || !ideaBoard.nudge(id, delta)) return;
        renderIdeas(list);
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
                if (!r.ok()) Toast.makeText(this, "הסדר לא נשמר בלוח: " + r.describe(), Toast.LENGTH_LONG).show();
                refreshIdeas(list, false); // re-read the sheet so cache + screen reflect what was actually saved
            });
        });
    }

    private void updateIdeaField(String id, String field, String value, LinearLayout list) {
        IdeaBoard.Idea idea = ideaBoard == null ? null : ideaBoard.find(id);
        if (idea != null && "stage".equals(field)) { idea.stage = value; renderIdeas(list); }
        JSONObject p = new JSONObject();
        try { p.put("idea_id", id); p.put(field, value); } catch (Exception ignored) {}
        io.execute(() -> {
            Gateway.Result r = Gateway.call(this, "update_idea", p);
            runOnUiThread(() -> { if (!r.ok()) Toast.makeText(this, r.describe(), Toast.LENGTH_LONG).show(); refreshIdeas(list, false); });
        });
    }

    private String nextIdeaStage(String s) {
        if ("INBOX".equals(s)) return "CLARIFY"; if ("CLARIFY".equals(s)) return "SHAPE";
        if ("SHAPE".equals(s)) return "VALIDATE"; if ("VALIDATE".equals(s)) return "READY";
        return "";
    }

    // ---------- סגן ----------

    private void showDeputy() {
        Button compose = linkButton("+ פקודה");
        ScrollView s = screen("סגן", compose);
        contentHost.addView(s);
        LinearLayout c = content(s);
        LinearLayout form = column();
        form.setVisibility(View.GONE);
        c.addView(form, full(0, 6));
        LinearLayout list = column();
        c.addView(list);
        compose.setOnClickListener(v -> {
            boolean open = form.getVisibility() == View.VISIBLE;
            form.setVisibility(open ? View.GONE : View.VISIBLE);
            compose.setText(open ? "+ פקודה" : "✕ סגור");
        });

        LinearLayout card = card();
        EditText command = input("מה לנהל, לבדוק או לקדם?", true);
        card.addView(command, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(84), 0, 6));
        LinearLayout quick = row();
        for (String q : new String[]{"בדוק מה תקוע", "מה דורש החלטה שלי?", "תן לי 3 עדיפויות"}) {
            TextView ch = chip(q, BLUE);
            ch.setMinHeight(dp(36)); ch.setGravity(Gravity.CENTER); ch.setPadding(dp(10), dp(6), dp(10), dp(6));
            ch.setOnClickListener(v -> command.setText(q));
            quick.addView(ch, chipLp());
        }
        card.addView(quick, full(0, 6));
        Button send = actionButton("שלח לסגן", true);
        TextView result = text("", 12, MUTED, false);
        card.addView(send, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(44), 0, 2));
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
                    if (done.ok()) { command.setText(""); result.setText("נרשם. הסגן יטפל וידווח."); result.setTextColor(GREEN); loadDeputy(list); }
                    else { result.setText("השליחה נכשלה: " + done.describe()); result.setTextColor(RED); }
                });
            });
        });
        loadDeputy(list);
    }

    private void loadDeputy(LinearLayout list) {
        list.removeAllViews();
        list.addView(loading(), lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(60), 0, 0));
        JSONObject params = new JSONObject();
        try { params.put("limit", 100); } catch (Exception ignored) {}
        fetchArray("inbox", params, "items", arr -> {
            list.removeAllViews();
            List<String> names = new ArrayList<>();
            Portfolio p = portfolio != null ? portfolio : cachedPortfolio();
            if (p != null) for (Project x : p.projects) names.add(x.name);
            List<DeputyDigest.Item> items = DeputyDigest.from(arr, names, now());
            if (items.isEmpty()) { list.addView(text("אין כרגע משהו שמחכה לטיפול.", 13, MUTED, false)); return; }
            int open = 0;
            for (DeputyDigest.Item it : items) if (it.isOpen()) open++;
            list.addView(text(open == 0 ? "הכל טופל" : open == 1 ? "פריט אחד פתוח" : open + " פריטים פתוחים", 13, TEXT, true), full(0, 6));
            for (DeputyDigest.Item it : items) list.addView(deputyRow(it), full(0, 6));
        }, msg -> { list.removeAllViews(); list.addView(text("לא ניתן לטעון: " + msg, 13, RED, false)); });
    }

    private View deputyRow(DeputyDigest.Item it) {
        LinearLayout c = card();
        int color = it.kind == DeputyDigest.Kind.TECH_FAILURE || it.kind == DeputyDigest.Kind.SYNC_FAILURE ? RED
                : it.kind == DeputyDigest.Kind.USER_TEST || it.kind == DeputyDigest.Kind.DECISION || it.kind == DeputyDigest.Kind.DEPLOY_BLOCKED ? AMBER : BLUE;
        if (!it.isOpen()) c.setAlpha(0.7f);
        LinearLayout top = row();
        top.addView(text(it.problem, 14, TEXT, true), grow());
        top.addView(chip(DeputyDigest.kindLabel(it.kind), color), chipLp());
        if (it.count > 1) top.addView(chip("×" + it.count, MUTED), chipLp());
        c.addView(top);
        if (!it.impact.isEmpty()) c.addView(text("למה זה חשוב: " + it.impact, 12, MUTED, false), full(4, 0));
        LinearLayout next = row();
        next.addView(text("הבא: " + it.nextAction, 12, TEXT, false), grow());
        if (!it.owner.isEmpty()) next.addView(chip(it.owner, MUTED), chipLp());
        c.addView(next, full(4, 0));
        c.addView(text((it.isOpen() ? "פתוח" : "טופל") + " · " + (it.lastSeenMillis > 0 ? TimeText.relative(it.lastSeenMillis, now()) : ""), 11, MUTED, false), full(4, 0));
        LinearLayout ev = column();
        for (String e : it.evidence) ev.addView(text(shortText(e, 400), 11, MUTED, false), full(4, 0));
        collapsible(c, "ראיות (" + it.evidence.size() + ")", ev, false);
        return c;
    }

    // ---------- פעילות ----------

    private void showActivity() {
        Button home = linkButton("בית ‹");
        home.setOnClickListener(v -> selectTab(TAB_HOME));
        ScrollView s = screen("פעילות", home);
        contentHost.addView(s);
        LinearLayout c = content(s);

        Portfolio cached = cachedPortfolio();
        if (cached != null) c.addView(snapshotLine(cached, null, false), full(0, 8));

        // גרסה: installed vs newest — two different facts, labelled as such.
        LinearLayout ver = card();
        ver.addView(text("גרסה", 12, BLUE, true));
        BuildIdentity installed = new BuildIdentity(BuildConfig.VERSION_NAME, BuildConfig.VERSION_CODE, BuildConfig.GIT_SHA, BuildConfig.GIT_REF, TimeText.parse(BuildConfig.BUILD_TIME));
        boolean localBuild = BuildConfig.GIT_REF.isEmpty() || "local".equals(BuildConfig.GIT_REF) || "local".equals(BuildConfig.GIT_SHA);
        ver.addView(text("מותקן במכשיר", 11, MUTED, true), full(6, 0));
        ver.addView(text(installed.line(now()) + (localBuild ? " · בנייה מקומית (לא מ-CI)" : " · " + BuildConfig.GIT_REF), 12, TEXT, false), full(2, 0));
        ver.addView(text("הכי חדש שנבנה ב-GitHub", 11, MUTED, true), full(8, 0));
        TextView latestLine = text("בודק…", 12, MUTED, false);
        ver.addView(latestLine, full(2, 0));
        c.addView(ver, full(0, 8));
        io.execute(() -> {
            BuildIdentity latest = Gateway.latestBuild(REPO, "control-tower-apk-build");
            runOnUiThread(() -> {
                if (latest == null) { latestLine.setText("לא זמין כרגע (אין גישה ל-GitHub)"); return; }
                String verdict;
                int color;
                if (latest.isNewerThan(installed)) { verdict = "יש גרסה חדשה יותר להתקנה"; color = AMBER; }
                else if (installed.isNewerThan(latest)) { verdict = "המכשיר מריץ גרסה שעדיין לא נבנתה ב-GitHub"; color = MUTED; }
                else { verdict = "זו הגרסה המותקנת"; color = GREEN; }
                latestLine.setText(latest.line(now()) + " · " + verdict);
                latestLine.setTextColor(color);
            });
        });

        LinearLayout system = card();
        system.addView(text("חיבור והתראות", 12, BLUE, true));
        TextView gatewayLine = text("שער: בודק…", 12, TEXT, false);
        system.addView(gatewayLine, full(4, 0));
        TextView pushStatus = text(PushNotifications.statusLine(this), 12, MUTED, false);
        system.addView(pushStatus, full(3, 0));
        LinearLayout buttons = row();
        Button testPush = actionButton("התראת בדיקה", false);
        testPush.setTextSize(12);
        testPush.setOnClickListener(v -> {
            testPush.setEnabled(false);
            pushStatus.setText("שולח התראת בדיקה…");
            PushNotifications.requestTestPush(this, msg -> runOnUiThread(() -> { testPush.setEnabled(true); pushStatus.setText(msg); }));
        });
        Button disconnect = actionButton("נתק והגדר מחדש", false);
        disconnect.setTextSize(12);
        disconnect.setOnClickListener(v -> PushNotifications.unregister(this, () -> {
            Gateway.saveOverride(this, "", "");
            cache().edit().clear().apply();
            if (Gateway.isBuildConfigured()) { Toast.makeText(this, "המכשיר נותק.", Toast.LENGTH_LONG).show(); selectTab(TAB_ACTIVITY); }
            else showSetup(null);
        }));
        LinearLayout.LayoutParams bl = new LinearLayout.LayoutParams(0, dp(40), 1f);
        bl.setMarginEnd(dp(6));
        buttons.addView(testPush, bl);
        buttons.addView(disconnect, new LinearLayout.LayoutParams(0, dp(40), 1f));
        system.addView(buttons, full(8, 0));
        c.addView(system, full(0, 8));

        io.execute(() -> {
            Gateway.Result r = Gateway.call(this, "health", new JSONObject());
            runOnUiThread(() -> {
                if (r.ok()) {
                    int contract = r.body.optInt("contract_version", 1);
                    StringBuilder sb = new StringBuilder("שער מחובר · ").append(r.body.optInt("projects_rows", 0)).append(" פרויקטים בלוח");
                    sb.append(r.body.optBoolean("fcm_configured", false) ? " · התראות מוגדרות" : " · התראות לא מוגדרות בשער");
                    if (contract < 5) sb.append(" · הגרסה שפרוסה בשער ישנה — יישור OS ומיון רעיונות יעבדו אחרי פריסה מחדש");
                    JSONObject osH = r.body.optJSONObject("os");
                    if (osH != null && !osH.optBoolean("os_current_marker_configured", false)) sb.append(" · סמן גרסת ה-OS הנוכחי לא הוגדר בשער");
                    gatewayLine.setText(sb.toString());
                    gatewayLine.setTextColor(contract < 5 ? AMBER : TEXT);
                } else {
                    gatewayLine.setText("שער לא זמין: " + r.describe());
                    gatewayLine.setTextColor(RED);
                }
            });
        });

        c.addView(section("התראות שנשלחו"));
        View load = loading();
        c.addView(load, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(60), 0, 0));
        JSONObject params = new JSONObject();
        try { params.put("limit", 30); } catch (Exception ignored) {}
        fetchArray("activity", params, "items", arr -> {
            c.removeView(load);
            if (arr.length() == 0) { c.addView(text("עדיין לא נשלחו התראות אוטומטיות.", 13, MUTED, false)); return; }
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null) continue;
                LinearLayout item = card();
                LinearLayout top = row();
                top.addView(text(projectDisplayName(cached, o.optString("project_key", "")), 14, TEXT, true), grow());
                top.addView(chip(Hebrew.pushEvent(o.optString("event")), BLUE));
                item.addView(top);
                long at = TimeText.parse(o.optString("occurred_at", ""));
                item.addView(text(Hebrew.ragBadge(o.optString("rag", "")) + " · " + (at > 0 ? TimeText.wall(at, now()) : ""), 11, MUTED, false), full(4, 0));
                c.addView(item, full(0, 6));
            }
        }, msg -> { c.removeView(load); c.addView(text("לא ניתן לטעון את ההתראות: " + msg, 13, RED, false)); });
    }

    private String projectDisplayName(Portfolio p, String key) {
        if (p != null) {
            for (Project x : p.projects) if (x.name.equalsIgnoreCase(key)) return x.name;
            for (Project x : p.infrastructure) if (x.name.equalsIgnoreCase(key)) return x.name;
        }
        return key.isEmpty() ? "פרויקט" : key;
    }

    // ---------- plumbing ----------

    private interface ArraySuccess { void run(JSONArray data); }
    private interface Failure { void run(String message); }

    private void fetchArray(String action, JSONObject params, String arrayKey, ArraySuccess ok, Failure fail) {
        io.execute(() -> {
            Gateway.Result r = Gateway.call(this, action, params);
            if (!r.ok()) {
                String msg = r.describe();
                runOnUiThread(() -> fail.run(msg));
                return;
            }
            JSONArray a = r.body.optJSONArray(arrayKey);
            JSONArray data = a == null ? new JSONArray() : a;
            runOnUiThread(() -> ok.run(data));
        });
    }
}
