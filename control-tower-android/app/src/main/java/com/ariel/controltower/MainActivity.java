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
import static com.ariel.controltower.Theme.TEXT;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.ariel.controltower.model.Freshness;
import com.ariel.controltower.model.Hebrew;
import com.ariel.controltower.model.Portfolio;
import com.ariel.controltower.model.Project;
import com.ariel.controltower.model.TimeText;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Control Tower — private single-owner Android client.
 * Data: PROJECT_CONTROL_BOARD Sheet via the Apps Script gateway ({@link Gateway}).
 * Push: FCM, transport only ({@link PushNotifications}).
 * Presentation rules live in {@code com.ariel.controltower.model} and are unit-tested.
 */
public class MainActivity extends Activity {
    private static final int TAB_HOME = 0, TAB_PROJECTS = 1, TAB_DEPUTY = 2, TAB_ACTIVITY = 3;
    private static final String CACHE_PREFS = "control_tower_cache";

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private FrameLayout contentHost;
    private LinearLayout nav;
    private int activeTab = TAB_HOME;
    private boolean detailOpen = false;
    private Portfolio portfolio;          // last snapshot rendered (live or cached)
    private static final long REFRESH_MIN_INTERVAL = 45_000L;
    private boolean forceRefresh = false; // set by the explicit refresh button

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(NAV);
        // 0.3.0 kept Supabase session tokens here; the Drive-first client has no login, so purge them.
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
        // Never a dead end: detail -> its list, secondary tab -> Home, Home -> leave the app.
        if (contentHost != null && detailOpen) {
            selectTab(activeTab);
            return;
        }
        if (contentHost != null && activeTab != TAB_HOME) {
            selectTab(TAB_HOME);
            return;
        }
        super.onBackPressed();
    }

    private boolean applyRoutingIntent(Intent intent) {
        if (intent == null) return false;
        String target = intent.getStringExtra(PushNotifications.EXTRA_TARGET);
        if (target == null) target = intent.getStringExtra("target"); // FCM-displayed notifications pass raw data keys
        if (target == null) return false;
        switch (target) {
            case "now": activeTab = TAB_HOME; return true;
            case "projects": activeTab = TAB_PROJECTS; return true;
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

    private int dp(int n) {
        return Math.round(n * getResources().getDisplayMetrics().density);
    }

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
        t.setLineSpacing(0, 1.15f);
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

    private Button actionButton(String label, boolean primary) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(15);
        b.setAllCaps(false);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setTextColor(primary ? BG : TEXT);
        b.setBackground(box(primary ? BLUE : SURFACE_2, primary ? BLUE : BORDER, 14));
        b.setMinHeight(dp(46));
        return b;
    }

    private Button linkButton(String label) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(13);
        b.setAllCaps(false);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setTextColor(BLUE);
        b.setBackground(box(Theme.tint(BLUE, 28), Theme.tint(BLUE, 90), 12));
        b.setPadding(dp(14), 0, dp(14), 0);
        b.setMinHeight(dp(44));
        b.setMinimumHeight(dp(44));
        return b;
    }

    private EditText input(String hint, boolean multiline) {
        EditText e = new EditText(this);
        e.setHint(hint);
        e.setTextColor(TEXT);
        e.setHintTextColor(MUTED);
        e.setBackground(box(SURFACE, BORDER, 12));
        e.setPadding(dp(14), dp(multiline ? 14 : 0), dp(14), dp(multiline ? 14 : 0));
        if (!multiline) e.setSingleLine(true);
        return e;
    }

    private LinearLayout row() {
        LinearLayout r = new LinearLayout(this);
        r.setOrientation(LinearLayout.HORIZONTAL);
        r.setGravity(Gravity.CENTER_VERTICAL);
        r.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        return r;
    }

    private LinearLayout card() {
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setPadding(dp(14), dp(13), dp(14), dp(13));
        c.setBackground(box(SURFACE, BORDER, 14));
        c.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        return c;
    }

    private TextView chip(String label, int color) {
        TextView b = text(label, 11, color, true);
        b.setBackground(box(Theme.tint(color, 38), Theme.tint(color, 140), 20));
        b.setPadding(dp(9), dp(4), dp(9), dp(4));
        return b;
    }

    private LinearLayout.LayoutParams chipLp() {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        p.setMarginEnd(dp(6));
        p.bottomMargin = dp(4);
        return p;
    }

    private TextView section(String value) {
        TextView t = text(value, 16, TEXT, true);
        t.setPadding(0, dp(10), 0, dp(8));
        return t;
    }

    private View loading() {
        LinearLayout l = new LinearLayout(this);
        l.setGravity(Gravity.CENTER);
        ProgressBar p = new ProgressBar(this);
        l.addView(p, new LinearLayout.LayoutParams(dp(38), dp(38)));
        return l;
    }

    private String shortText(String value, int max) {
        String v = value == null ? "" : value.trim();
        if (v.length() <= max) return v;
        return v.substring(0, Math.max(0, max - 1)).trim() + "…";
    }

    private long now() { return System.currentTimeMillis(); }

    // ---------- setup state (replaces the old login) ----------

    private void showSetup(String problem) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);
        LinearLayout wrap = new LinearLayout(this);
        wrap.setOrientation(LinearLayout.VERTICAL);
        wrap.setGravity(Gravity.CENTER_VERTICAL);
        wrap.setPadding(dp(24), dp(36), dp(24), dp(36));
        wrap.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        ImageView mark = new ImageView(this);
        mark.setImageResource(R.drawable.ic_brand_mark);
        mark.setContentDescription("Control Tower");
        LinearLayout.LayoutParams markLp = new LinearLayout.LayoutParams(dp(72), dp(72));
        markLp.bottomMargin = dp(18);
        wrap.addView(mark, markLp);

        wrap.addView(text("מגדל הפיקוח", 30, TEXT, true));
        wrap.addView(text("חיבור לשער הנתונים", 16, MUTED, false), full(4, 20));
        String explain = Gateway.isBuildConfigured()
                ? "הגרסה נבנתה עם שער, אבל ההגדרה שנשמרה במכשיר אינה תקינה."
                : "הגרסה הזו נבנתה בלי טוקן. הדבק כאן פעם אחת את כתובת השער ואת הטוקן.";
        wrap.addView(text(explain, 14, MUTED, false), full(0, 18));

        EditText url = input("כתובת Web App של Apps Script", false);
        url.setText(Gateway.url(this));
        url.setTextDirection(View.TEXT_DIRECTION_LTR);
        url.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        wrap.addView(url, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(54), 0, 12));

        EditText token = input("טוקן השער (לפחות 32 תווים)", false);
        token.setTextDirection(View.TEXT_DIRECTION_LTR);
        token.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        wrap.addView(token, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(54), 0, 16));

        TextView status = text(problem == null ? "" : problem, 13, problem == null ? MUTED : RED, false);
        Button connect = actionButton("בדוק והתחבר", true);
        wrap.addView(connect, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(52), 0, 10));
        wrap.addView(status, full(8, 0));

        connect.setOnClickListener(v -> {
            String u = url.getText().toString().trim();
            String t = token.getText().toString().trim();
            if (!u.startsWith("https://script.google.com/")) {
                status.setText("הכתובת צריכה להתחיל ב-https://script.google.com/");
                status.setTextColor(RED);
                return;
            }
            if (t.length() < 32) {
                status.setText("הטוקן קצר מדי.");
                status.setTextColor(RED);
                return;
            }
            connect.setEnabled(false);
            status.setText("בודק מול השער…");
            status.setTextColor(MUTED);
            Gateway.saveOverride(this, u, t);
            io.execute(() -> {
                Gateway.Result r = Gateway.call(this, "health", new JSONObject());
                runOnUiThread(() -> {
                    if (r.ok()) {
                        Toast.makeText(this, "מחובר ללוח " + r.body.optString("spreadsheet_title", "PROJECT_CONTROL_BOARD"), Toast.LENGTH_SHORT).show();
                        showApp();
                    } else {
                        Gateway.saveOverride(this, "", "");
                        connect.setEnabled(true);
                        status.setText(r.describe());
                        status.setTextColor(RED);
                    }
                });
            });
        });

        scroll.addView(wrap);
        setContentView(scroll);
        Insets.applySystemBars(scroll);
    }

    // ---------- shell + navigation ----------

    private void showApp() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        contentHost = new FrameLayout(this);
        root.addView(contentHost, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        View divider = new View(this);
        divider.setBackgroundColor(BORDER);
        root.addView(divider, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(1)));

        nav = new LinearLayout(this);
        nav.setOrientation(LinearLayout.HORIZONTAL);
        nav.setPadding(dp(8), dp(6), dp(8), dp(8));
        nav.setGravity(Gravity.CENTER);
        nav.setBackgroundColor(NAV);
        root.addView(nav, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(66)));
        setContentView(root);
        // Status bar sits over the BG-coloured top padding; the nav bar extends under the gesture area.
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int[] bars = Insets.bars(insets);
            v.setPadding(bars[0], bars[1], bars[2], 0);
            nav.setPadding(dp(8), dp(6), dp(8), dp(8) + bars[3]);
            nav.getLayoutParams().height = dp(66) + bars[3];
            nav.requestLayout();
            return insets;
        });
        root.requestApplyInsets();
        selectTab(activeTab);
        PushNotifications.onAppReady(this);
    }

    private void buildNav() {
        nav.removeAllViews();
        String[] labels = {"בית", "פרויקטים", "סגן", "פעילות"};
        for (int i = 0; i < labels.length; i++) {
            final int index = i;
            boolean active = activeTab == i;
            Button b = new Button(this);
            b.setText(labels[i]);
            b.setAllCaps(false);
            b.setTextSize(active ? 14 : 13);
            b.setTypeface(Typeface.DEFAULT, active ? Typeface.BOLD : Typeface.NORMAL);
            b.setTextColor(active ? BG : TEXT);
            b.setBackground(active ? box(BLUE, BLUE, 14) : box(Color.TRANSPARENT, Color.TRANSPARENT, 14));
            b.setContentDescription(labels[i] + (active ? " (מסך נוכחי)" : ""));
            b.setOnClickListener(v -> selectTab(index));
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f);
            p.setMargins(dp(3), 0, dp(3), 0);
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
        else if (index == TAB_DEPUTY) showDeputy();
        else showActivity();
    }

    /** Screen scaffold: title row (with a small "בית" link on secondary tabs), then a column for content. */
    private ScrollView screen(String title, String subtitle, boolean secondary) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);
        LinearLayout col = new LinearLayout(this);
        col.setTag("screen-column");
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(dp(16), dp(16), dp(16), dp(28));
        col.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        LinearLayout head = row();
        TextView t = text(title, 26, TEXT, true);
        head.addView(t, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        if (secondary) {
            Button home = linkButton("בית ‹");
            home.setOnClickListener(v -> selectTab(TAB_HOME));
            head.addView(home);
        }
        col.addView(head);
        if (subtitle != null && !subtitle.isEmpty()) col.addView(text(subtitle, 13, MUTED, false), full(2, 12));
        else col.addView(new View(this), lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(8), 0, 0));
        LinearLayout content = new LinearLayout(this);
        content.setTag("screen-content");
        content.setOrientation(LinearLayout.VERTICAL);
        content.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        col.addView(content, full(0, 0));
        scroll.addView(col);
        return scroll;
    }

    /** The content container below the fixed header; safe to clear and re-render. */
    private LinearLayout column(ScrollView scroll) {
        return (LinearLayout) scroll.findViewWithTag("screen-content");
    }

    // ---------- portfolio loading with cache ----------

    private interface PortfolioCallback { void run(Portfolio p, String error); }

    private SharedPreferences cache() {
        return getSharedPreferences(CACHE_PREFS, MODE_PRIVATE);
    }

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
                    cache().edit().putString("portfolio", body.toString()).putLong("synced_at", at).apply();
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

    // ---------- snapshot freshness line ----------

    private int freshnessColor(Freshness.State s) {
        switch (s) {
            case FRESH: return GREEN;
            case AGING: return AMBER;
            case STALE: return RED;
            default: return MUTED;
        }
    }

    /** "עודכן לאחרונה: 18/09/2026 15:12 · לפני 2 דקות" (+ cache warning). */
    private View snapshotLine(Portfolio p, String refreshError) {
        return snapshotLine(p, refreshError, true);
    }

    private View snapshotLine(Portfolio p, String refreshError, boolean warnIfCached) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        long age = now() - p.syncedAt;
        int color = age < 15 * 60_000L ? GREEN : age < 2 * Freshness.HOUR ? AMBER : RED;
        box.addView(text("עודכן לאחרונה: " + TimeText.wall(p.syncedAt, now()), 13, color, true));
        // Only a real failed refresh earns the warning; a fresh cached snapshot is simply the data.
        if (warnIfCached && refreshError != null && !refreshError.isEmpty()) {
            String why = refreshError == null || refreshError.isEmpty() ? "" : " · " + refreshError;
            box.addView(text("מוצג עותק שמור מהמכשיר — הרענון האחרון נכשל" + why, 12, AMBER, false), full(2, 0));
        }
        return box;
    }

    // ---------- time wall ----------

    /** The per-project time wall: label, big absolute time, relative age, freshness chip, stale/unknown note. */
    private View timeWall(Project p, boolean large) {
        LinearLayout wall = new LinearLayout(this);
        wall.setOrientation(LinearLayout.VERTICAL);
        wall.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        int accent = freshnessColor(p.freshness.state);
        wall.setBackground(box(SURFACE_2, Theme.tint(accent, 150), 12));
        wall.setPadding(dp(12), dp(9), dp(12), dp(9));

        LinearLayout head = row();
        head.addView(text("פעילות אחרונה בפרויקט", large ? 12 : 11, MUTED, true), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        head.addView(chip(Hebrew.freshness(p.freshness.state), accent));
        wall.addView(head);

        if (p.lastProgressMillis > 0) {
            TextView abs = text(TimeText.absolute(p.lastProgressMillis), large ? 24 : 18, TEXT, true);
            abs.setTextDirection(View.TEXT_DIRECTION_LTR);
            abs.setGravity(Gravity.START);
            wall.addView(abs, full(4, 0));
            wall.addView(text(TimeText.relative(p.lastProgressMillis, now()), large ? 15 : 13, accent, true), full(1, 0));
        } else {
            wall.addView(text("אין חותמת פעילות עדכנית", large ? 18 : 15, TEXT, true), full(4, 0));
            if (!p.lastProgressRaw.isEmpty()) wall.addView(text("בלוח רשום: " + shortText(p.lastProgressRaw, 60), 12, MUTED, false), full(2, 0));
        }
        // Stale / aging / unknown-cadence explanations. The no-timestamp case is already the headline above.
        String note = p.freshness.note();
        if (p.freshness.reason != Freshness.Reason.NO_TIMESTAMP && !note.isEmpty()) {
            wall.addView(text(note, 12, p.freshness.state == Freshness.State.UNKNOWN ? MUTED : accent, false), full(3, 0));
        }
        return wall;
    }

    // ---------- project cards ----------

    private void addProjectCard(LinearLayout parent, Project p, boolean attention) {
        LinearLayout c = card();
        if (p.isRed()) c.setBackground(box(Theme.tint(RED, 26), Theme.tint(RED, 120), 14));
        else if (attention) c.setBackground(box(SURFACE, Theme.tint(BLUE, 140), 14));

        LinearLayout top = row();
        top.addView(text(p.name, 17, TEXT, true), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        top.addView(chip(Hebrew.ragBadge(p.rag), Theme.rag(p.rag)));
        c.addView(top);

        List<String> reasons = p.attentionReasons();
        reasons.removeIf(r -> r.startsWith("אדום")); // the RAG chip already says it
        if (attention && !reasons.isEmpty()) {
            LinearLayout chips = row();
            for (String r : reasons) chips.addView(chip(r, r.startsWith("צריך") ? RED : r.startsWith("מחכה") ? BLUE : AMBER), chipLp());
            c.addView(chips, full(8, 0));
        }

        String status = p.statusSentence();
        if (!status.isEmpty()) c.addView(text(shortText(status, 140), 13, TEXT, false), full(8, 0));

        if (attention) {
            String action = p.arielAction();
            if (!action.isEmpty()) {
                LinearLayout ask = row();
                ask.addView(chip("מה צריך ממך", RED));
                c.addView(ask, full(8, 0));
                c.addView(text(shortText(action, 180), 14, TEXT, true), full(4, 0));
            }
        } else if (!p.nextAction.isEmpty()) {
            c.addView(text("הבא: " + shortText(p.nextAction, 120), 13, MUTED, false), full(6, 0));
        }

        c.addView(timeWall(p, false), full(10, 0));

        TextView open = text("לפרטים ›", 12, BLUE, true);
        c.addView(open, full(8, 0));
        c.setOnClickListener(v -> showProjectDetail(p));
        parent.addView(c, full(0, 10));
    }

    private void addCount(LinearLayout strip, String label, int count, int color) {
        LinearLayout b = new LinearLayout(this);
        b.setOrientation(LinearLayout.VERTICAL);
        b.setGravity(Gravity.CENTER);
        TextView n = text(String.valueOf(count), 22, count > 0 ? color : MUTED, true);
        n.setGravity(Gravity.CENTER);
        b.addView(n);
        TextView l = text(label, 11, MUTED, true);
        l.setGravity(Gravity.CENTER);
        b.addView(l);
        strip.addView(b, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f));
    }

    // ---------- בית ----------

    private void showHome() {
        ScrollView s = screen("מגדל הפיקוח", null, false);
        contentHost.addView(s);
        LinearLayout c = column(s);
        Portfolio cached = cachedPortfolio();
        if (cached != null) {
            renderHome(c, cached, null, true);
        } else {
            c.addView(loading(), lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(80), 10, 0));
        }
        if (cached != null && !forceRefresh && now() - cached.syncedAt < REFRESH_MIN_INTERVAL) {
            // Fresh enough: render from cache without another gateway round-trip (no lifecycle churn).
            c.removeAllViews();
            renderHome(c, cached, null, false);
            return;
        }
        forceRefresh = false;
        loadPortfolio((p, err) -> {
            if (contentHost == null || activeTab != TAB_HOME || detailOpen) return;
            int y = s.getScrollY();
            c.removeAllViews();
            if (p != null) renderHome(c, p, null, false);
            else if (cached != null) renderHome(c, cached, err, false);
            else renderLoadError(c, err);
            if (y > 0) s.post(() -> s.scrollTo(0, y));
        });
    }

    private void renderLoadError(LinearLayout c, String err) {
        LinearLayout e = card();
        e.setBackground(box(Theme.tint(RED, 26), Theme.tint(RED, 120), 14));
        e.addView(text("לא ניתן לטעון את הפורטפוליו", 16, TEXT, true));
        e.addView(text(err == null || err.isEmpty() ? "בדוק חיבור לרשת או את הגדרת השער." : err, 13, MUTED, false), full(5, 10));
        Button retry = actionButton("נסה שוב", true);
        retry.setOnClickListener(v -> selectTab(activeTab));
        e.addView(retry, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(46), 0, 0));
        c.addView(e, full(8, 0));
    }

    private void renderHome(LinearLayout c, Portfolio p, String refreshError, boolean refreshing) {
        portfolio = p;

        LinearLayout head = row();
        head.addView(snapshotLine(p, refreshError), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        Button refresh = linkButton(refreshing ? "מרענן…" : "רענון ↻");
        refresh.setEnabled(!refreshing);
        refresh.setContentDescription("רענון הנתונים מהלוח");
        refresh.setOnClickListener(v -> { forceRefresh = true; selectTab(TAB_HOME); });
        head.addView(refresh);
        c.addView(head, full(0, 10));

        // תמונת מצב — counts first, so the situation is understood before any detail.
        LinearLayout summary = card();
        LinearLayout title = row();
        title.addView(text(p.projects.size() + " פרויקטים בלוח", 18, TEXT, true), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        summary.addView(title);
        String headline = p.needsAttention == 0 ? "אין כרגע פרויקט שמחכה לך" : p.needsAttention == 1 ? "פרויקט אחד מחכה לך" : p.needsAttention + " פרויקטים מחכים לך";
        summary.addView(text(headline, 14, p.needsAttention == 0 ? GREEN : RED, true), full(4, 10));
        LinearLayout strip = new LinearLayout(this);
        strip.setOrientation(LinearLayout.HORIZONTAL);
        strip.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        strip.setBackground(box(SURFACE_2, BORDER, 12));
        addCount(strip, "צריך אותך", p.needsAttention, RED);
        addCount(strip, "אדום", p.red, RED);
        addCount(strip, "במעקב", p.watch, AMBER);
        addCount(strip, "תקין", p.green, GREEN);
        addCount(strip, "ישן", p.stale, AMBER);
        summary.addView(strip, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(64), 0, 0));
        Project latest = p.latestActiveProject();
        if (latest != null) summary.addView(text("הכי עדכני: " + latest.name + " · " + TimeText.wall(latest.lastProgressMillis, now()), 12, MUTED, false), full(8, 0));
        if (p.unknownActivity > 0) summary.addView(text(p.unknownActivity == 1 ? "פרויקט אחד בלי חותמת פעילות בלוח" : p.unknownActivity + " פרויקטים בלי חותמת פעילות בלוח", 12, MUTED, false), full(3, 0));
        if (p.unknownCadence > 0) summary.addView(text(p.unknownCadence == 1 ? "פרויקט אחד בלי קצב צפוי מוגדר" : p.unknownCadence + " פרויקטים בלי קצב צפוי מוגדר", 12, MUTED, false), full(3, 0));
        c.addView(summary, full(0, 14));

        // צריך אותי עכשיו
        List<Project> attention = p.attention();
        c.addView(section("צריך אותי עכשיו" + (attention.isEmpty() ? "" : " (" + attention.size() + ")")));
        if (attention.isEmpty()) {
            LinearLayout ok = card();
            ok.setBackground(box(Theme.tint(GREEN, 22), Theme.tint(GREEN, 110), 14));
            ok.addView(text("✓ אין כרגע החלטה, חסם או בדיקה שמחכים לך", 14, GREEN, true));
            c.addView(ok, full(0, 10));
        } else {
            for (Project x : attention) addProjectCard(c, x, true);
        }

        // הפרויקטים — everything else, urgency order
        List<Project> calm = p.calm();
        c.addView(section("שאר הפרויקטים" + (calm.isEmpty() ? "" : " (" + calm.size() + ")")));
        if (calm.isEmpty()) c.addView(text("כל הפרויקטים נמצאים למעלה.", 13, MUTED, false));
        for (Project x : calm) addProjectCard(c, x, false);

        if (!p.infrastructure.isEmpty()) {
            c.addView(section("תשתית (לא פרויקט)"));
            for (Project x : p.infrastructure) addProjectCard(c, x, false);
        }
        c.addView(text("מקור: לוח הבקרה ב-Google Drive", 11, MUTED, false), full(6, 0));
    }

    // ---------- פרויקטים ----------

    private void showProjects() {
        ScrollView s = screen("פרויקטים", "לפי דחיפות: מה שמחכה לך ואדום למעלה, אחר כך לפי פעילות אחרונה.", true);
        contentHost.addView(s);
        LinearLayout c = column(s);
        Portfolio cached = cachedPortfolio();
        if (cached != null) renderProjects(c, cached, null);
        else c.addView(loading(), lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(80), 0, 0));
        if (cached != null && !forceRefresh && now() - cached.syncedAt < REFRESH_MIN_INTERVAL) return;
        forceRefresh = false;
        loadPortfolio((p, err) -> {
            if (contentHost == null || activeTab != TAB_PROJECTS || detailOpen) return;
            int y = s.getScrollY();
            c.removeAllViews();
            if (p != null) renderProjects(c, p, null);
            else if (cached != null) renderProjects(c, cached, err);
            else renderLoadError(c, err);
            if (y > 0) s.post(() -> s.scrollTo(0, y));
        });
    }

    private void renderProjects(LinearLayout c, Portfolio p, String refreshError) {
        portfolio = p;
        c.addView(snapshotLine(p, refreshError), full(0, 10));
        if (p.projects.isEmpty()) {
            c.addView(text("לא נמצאו פרויקטים בלוח.", 13, MUTED, false));
            return;
        }
        List<Project> attention = p.attention();
        if (!attention.isEmpty()) {
            c.addView(section("מחכה לך / דורש טיפול (" + attention.size() + ")"));
            for (Project x : attention) addProjectCard(c, x, true);
        }
        List<Project> calm = p.calm();
        if (!calm.isEmpty()) {
            c.addView(section("במעקב ותקין (" + calm.size() + ")"));
            for (Project x : calm) addProjectCard(c, x, false);
        }
        if (!p.infrastructure.isEmpty()) {
            c.addView(section("תשתית (לא פרויקט)"));
            for (Project x : p.infrastructure) addProjectCard(c, x, false);
        }
    }

    // ---------- פרטי פרויקט ----------

    private void addField(LinearLayout c, String label, String value) {
        if (value == null || value.trim().isEmpty() || "null".equals(value)) return;
        c.addView(text(label, 12, BLUE, true), full(14, 0));
        c.addView(text(value, 15, TEXT, false), full(3, 0));
    }

    /** Long free text: show the first {@code limit} characters with an inline "הצג עוד" toggle. */
    private void addExpandableField(LinearLayout c, String label, String value, int limit) {
        if (value == null || value.trim().isEmpty() || "null".equals(value)) return;
        String full = value.trim();
        if (full.length() <= limit + 40) {
            addField(c, label, full);
            return;
        }
        c.addView(text(label, 12, BLUE, true), full(14, 0));
        TextView body = text(shortText(full, limit), 15, TEXT, false);
        c.addView(body, full(3, 0));
        TextView more = text("הצג עוד", 13, BLUE, true);
        more.setMinHeight(dp(36));
        more.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
        more.setContentDescription("הצג את הטקסט המלא");
        c.addView(more, full(2, 0));
        more.setOnClickListener(v -> {
            boolean expanded = body.getText().length() > limit + 1;
            body.setText(expanded ? shortText(full, limit) : full);
            more.setText(expanded ? "הצג עוד" : "הצג פחות");
        });
    }

    /** Full-screen detail inside the shell (nav stays visible; Back returns to the list). */
    private void showProjectDetail(Project p) {
        detailOpen = true;
        contentHost.removeAllViews();
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setPadding(dp(16), dp(14), dp(16), dp(28));
        c.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        LinearLayout head = row();
        Button back = linkButton("‹ חזרה");
        back.setOnClickListener(v -> selectTab(activeTab));
        head.addView(back);
        head.addView(new View(this), new LinearLayout.LayoutParams(0, 1, 1f));
        c.addView(head, full(0, 10));

        c.addView(text(p.name, 26, TEXT, true));
        LinearLayout chips = row();
        chips.addView(chip(Hebrew.ragBadge(p.rag), Theme.rag(p.rag)), chipLp());
        for (String r : p.attentionReasons()) {
            if (r.startsWith("אדום")) continue;
            chips.addView(chip(r, r.startsWith("המידע") ? AMBER : r.startsWith("מחכה") ? BLUE : RED), chipLp());
        }
        if (!Hebrew.lifecycle(p.lifecycle).isEmpty() && !p.userTestRequired) chips.addView(chip(Hebrew.lifecycle(p.lifecycle), MUTED), chipLp());
        c.addView(chips, full(8, 10));

        c.addView(timeWall(p, true), full(0, 12));

        LinearLayout body = card();
        if (p.needsAttention()) {
            body.addView(text("מה צריך ממך", 12, RED, true));
            String action = p.arielAction();
            body.addView(text(action.isEmpty() ? "נדרשת החלטה או פעולה שלך" : action, 16, TEXT, true), full(3, 0));
        }
        addField(body, "מה המטרה", p.objective);
        addField(body, "מה המצב עכשיו", p.milestone.isEmpty() ? Hebrew.lifecycle(p.lifecycle) : p.milestone);
        addExpandableField(body, "מה קרה לאחרונה", p.progressEvidence, 280);
        addField(body, "הפעולה הבאה", p.nextAction);
        addField(body, "מה חוסם", p.blocker);
        if (!p.needsAttention()) addField(body, "צריך את אריאל", "לא נדרשת פעולה כרגע");
        addField(body, "רמת ביטחון", Hebrew.confidence(p.confidence));
        addField(body, "סיכון / סחיפה", p.risk);
        c.addView(body, full(0, 12));

        LinearLayout meta = card();
        meta.setBackground(box(Color.TRANSPARENT, BORDER, 14));
        meta.addView(text("נתוני בקרה", 12, MUTED, true));
        String check = p.lastControlCheckMillis > 0 ? TimeText.wall(p.lastControlCheckMillis, now()) : (p.lastControlCheckRaw.isEmpty() ? "לא נרשמה" : p.lastControlCheckRaw);
        meta.addView(text("בדיקת Control Tower אחרונה: " + check, 13, MUTED, false), full(6, 0));
        String cadence = p.expectedCadence.isEmpty() ? "לא הוגדר בלוח"
                : p.freshness.cadenceUnknown() ? "לא זוהה · בלוח רשום: " + p.expectedCadence
                : p.freshness.cadenceLabel;
        meta.addView(text("קצב צפוי: " + cadence, 13, MUTED, false), full(3, 0));
        if (!p.id.isEmpty()) meta.addView(text("מזהה בלוח: " + p.id, 12, MUTED, false), full(3, 0));
        c.addView(meta, full(0, 12));

        if (p.link.startsWith("http")) {
            Button open = actionButton("פתח את הקישור הראשי", false);
            open.setOnClickListener(v -> {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(p.link)));
                } catch (Exception e) {
                    Toast.makeText(this, "לא ניתן לפתוח את הקישור", Toast.LENGTH_SHORT).show();
                }
            });
            c.addView(open, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(48), 0, 8));
        }
        Button backBottom = actionButton("חזרה לרשימה", true);
        backBottom.setOnClickListener(v -> selectTab(activeTab));
        c.addView(backBottom, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(48), 4, 0));

        scroll.addView(c);
        contentHost.addView(scroll);
    }

    // ---------- סגן ----------

    private void showDeputy() {
        ScrollView s = screen("סגן", "כתוב מה לנהל, לבדוק או לקדם. הפקודה נרשמת בלוח כדיווח, ומאומתת רק עם ראיה.", true);
        contentHost.addView(s);
        LinearLayout c = column(s);

        EditText command = input("מה אתה רוצה שאנהל, אבדוק או אקדם?", true);
        command.setTextSize(16);
        command.setGravity(Gravity.TOP | Gravity.START);
        command.setTextDirection(View.TEXT_DIRECTION_ANY_RTL);
        command.setMinHeight(dp(120));
        command.setBackground(box(SURFACE, Theme.tint(BLUE, 140), 12));
        c.addView(command, full(4, 10));

        HorizontalScrollView hsv = new HorizontalScrollView(this);
        hsv.setHorizontalScrollBarEnabled(false);
        LinearLayout chips = new LinearLayout(this);
        chips.setOrientation(LinearLayout.HORIZONTAL);
        String[] quick = {"בדוק מה תקוע", "מה דורש החלטה שלי?", "רענן סטטוס", "תן לי 3 עדיפויות"};
        for (String q : quick) {
            Button chip = actionButton(q, false);
            chip.setTextSize(12);
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(44));
            p.setMarginEnd(dp(8));
            chips.addView(chip, p);
            chip.setOnClickListener(v -> command.setText(q));
        }
        hsv.addView(chips);
        c.addView(hsv, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(50), 0, 8));

        Button send = actionButton("שלח לסגן", true);
        c.addView(send, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(52), 0, 14));
        TextView result = text("", 12, MUTED, false);
        c.addView(result);
        send.setOnClickListener(v -> {
            String q = command.getText().toString().trim();
            if (q.isEmpty()) return;
            send.setEnabled(false);
            result.setText("שולח…");
            result.setTextColor(MUTED);
            io.execute(() -> {
                Gateway.Result r;
                try {
                    JSONObject params = new JSONObject()
                            .put("report_text", q)
                            .put("source", "deputy_command")
                            .put("device_id", Gateway.deviceId(this));
                    r = Gateway.call(this, "submit_report", params);
                } catch (Exception e) {
                    r = new Gateway.Result(0, null, "השליחה נכשלה.");
                }
                Gateway.Result done = r;
                runOnUiThread(() -> {
                    send.setEnabled(true);
                    if (done.ok()) {
                        command.setText("");
                        result.setText("הפקודה נרשמה בלוח וממתינה לאימות.");
                        result.setTextColor(GREEN);
                        loadInbox(c);
                    } else {
                        result.setText("השליחה נכשלה: " + done.describe());
                        result.setTextColor(RED);
                    }
                });
            });
        });

        c.addView(section("היסטוריית פקודות ודיווחים"));
        loadInbox(c);
    }

    private void loadInbox(LinearLayout c) {
        View old = c.findViewWithTag("commands-list");
        if (old != null) c.removeView(old);
        LinearLayout holder = new LinearLayout(this);
        holder.setTag("commands-list");
        holder.setOrientation(LinearLayout.VERTICAL);
        c.addView(holder);
        ProgressBar p = new ProgressBar(this);
        holder.addView(p, new LinearLayout.LayoutParams(dp(38), dp(38)));
        JSONObject params = new JSONObject();
        try { params.put("limit", 30); } catch (Exception ignored) {}
        fetchArray("inbox", params, "items", arr -> {
            holder.removeAllViews();
            if (arr.length() == 0) {
                holder.addView(text("עדיין אין פקודות או דיווחים.", 13, MUTED, false));
                return;
            }
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null) continue;
                LinearLayout item = card();
                LinearLayout top = row();
                top.addView(chip(Hebrew.inboxStatus(o.optString("status")), inboxColor(o.optString("status"))), chipLp());
                top.addView(chip(Hebrew.inboxSource(o.optString("source")), MUTED), chipLp());
                item.addView(top);
                String report = o.optString("report_text", "");
                boolean external = report.startsWith("EXTERNAL_PROJECT_REPORT_V1");
                if (external) report = report.substring("EXTERNAL_PROJECT_REPORT_V1".length()).trim();
                if (external) top.addView(chip("דוח חיצוני", AMBER), chipLp());
                item.addView(text(shortText(report, 220), 14, TEXT, true), full(8, 0));
                String notes = o.optString("notes", "");
                if (!notes.isEmpty()) item.addView(text(notes, 13, MUTED, false), full(6, 0));
                long at = TimeText.parse(o.optString("received_at", ""));
                item.addView(text(at > 0 ? TimeText.wall(at, now()) : o.optString("received_at", ""), 11, MUTED, false), full(6, 0));
                holder.addView(item, full(0, 8));
            }
        }, msg -> {
            holder.removeAllViews();
            holder.addView(text("לא ניתן לטעון את ההיסטוריה: " + msg, 13, RED, false));
        });
    }

    private int inboxColor(String s) {
        String n = s == null ? "" : s.trim().toUpperCase();
        if (n.equals("VERIFIED") || n.equals("DONE") || n.equals("COMPLETED")) return GREEN;
        if (n.equals("REJECTED") || n.equals("FAILED")) return RED;
        if (n.equals("NEEDS_DECISION") || n.equals("BLOCKED")) return AMBER;
        return BLUE;
    }

    // ---------- פעילות ----------

    private void showActivity() {
        ScrollView s = screen("פעילות", "התראות שנשלחו, מצב החיבור ואבחון.", true);
        contentHost.addView(s);
        LinearLayout c = column(s);

        Portfolio cached = cachedPortfolio();
        if (cached != null) c.addView(snapshotLine(cached, null, false), full(0, 10));

        LinearLayout system = card();
        system.addView(text("מצב מערכת", 13, BLUE, true));
        TextView gatewayLine = text("שער: בודק…", 13, TEXT, true);
        system.addView(gatewayLine, full(7, 0));
        TextView pushStatus = text(PushNotifications.statusLine(this), 12, MUTED, false);
        system.addView(pushStatus, full(6, 0));
        system.addView(text("גרסה " + BuildConfig.VERSION_NAME + " (" + BuildConfig.VERSION_CODE + ") · " + BuildConfig.GIT_SHA
                        + (Gateway.isBuildConfigured() ? " · שער מהבנייה" : " · שער מהמכשיר"), 11, MUTED, false), full(4, 0));

        Button testPush = actionButton("שלח התראת בדיקה", false);
        system.addView(testPush, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(46), 12, 0));
        testPush.setOnClickListener(v -> {
            testPush.setEnabled(false);
            pushStatus.setText("שולח התראת בדיקה…");
            PushNotifications.requestTestPush(this, msg -> runOnUiThread(() -> {
                testPush.setEnabled(true);
                pushStatus.setText(msg);
            }));
        });
        Button disconnect = actionButton("נתק מכשיר והגדר מחדש", false);
        system.addView(disconnect, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(46), 8, 0));
        disconnect.setOnClickListener(v -> PushNotifications.unregister(this, () -> {
            Gateway.saveOverride(this, "", "");
            cache().edit().clear().apply();
            if (Gateway.isBuildConfigured()) {
                Toast.makeText(this, "המכשיר נותק. השער מהבנייה נשאר פעיל.", Toast.LENGTH_LONG).show();
                selectTab(TAB_ACTIVITY);
            } else {
                showSetup(null);
            }
        }));
        c.addView(system, full(0, 14));

        io.execute(() -> {
            Gateway.Result r = Gateway.call(this, "health", new JSONObject());
            runOnUiThread(() -> {
                if (r.ok()) {
                    JSONArray missing = r.body.optJSONArray("unresolved_columns");
                    int contract = r.body.optInt("contract_version", 1);
                    StringBuilder sb = new StringBuilder("שער מחובר · ")
                            .append(r.body.optString("spreadsheet_title", "לוח הבקרה"))
                            .append(" · ").append(r.body.optInt("projects_rows", 0)).append(" שורות")
                            .append(" · מכשירים רשומים: ").append(r.body.optInt("active_devices", 0))
                            .append(r.body.optBoolean("fcm_configured", false) ? " · התראות מוגדרות" : " · התראות לא מוגדרות בשער")
                            .append(r.body.optBoolean("scanner_trigger_installed", false) ? " · סורק פעיל" : " · סורק לא מותקן");
                    if (contract < 2) sb.append(" · הגרסה בשער ישנה (ללא חותמות פעילות) — יש לפרוס את CombinedCode.gs המעודכן");
                    if (missing != null && missing.length() > 0) sb.append(" · עמודות שלא זוהו: ").append(TextUtils.join(", ", jsonStrings(missing)));
                    gatewayLine.setText(sb.toString());
                    gatewayLine.setTextColor(contract < 2 ? AMBER : TEXT);
                } else {
                    gatewayLine.setText("שער לא זמין: " + r.describe());
                    gatewayLine.setTextColor(RED);
                }
            });
        });

        c.addView(section("התראות שנשלחו"));
        View load = loading();
        c.addView(load, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(80), 0, 0));
        JSONObject params = new JSONObject();
        try { params.put("limit", 30); } catch (Exception ignored) {}
        fetchArray("activity", params, "items", arr -> {
            c.removeView(load);
            if (arr.length() == 0) {
                c.addView(text("עדיין לא נשלחו התראות אוטומטיות.", 13, MUTED, false));
                return;
            }
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null) continue;
                LinearLayout item = card();
                LinearLayout top = row();
                top.addView(text(projectDisplayName(cached, o.optString("project_key", "")), 15, TEXT, true), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
                top.addView(chip(Hebrew.pushEvent(o.optString("event")), BLUE));
                item.addView(top);
                item.addView(text(Hebrew.ragBadge(o.optString("rag", "")) + " · " + Hebrew.lifecycle(o.optString("lifecycle", "")), 12, MUTED, false), full(6, 0));
                long at = TimeText.parse(o.optString("occurred_at", ""));
                item.addView(text(at > 0 ? TimeText.wall(at, now()) : o.optString("occurred_at", ""), 11, MUTED, false), full(6, 0));
                c.addView(item, full(0, 8));
            }
        }, msg -> {
            c.removeView(load);
            c.addView(text("לא ניתן לטעון את ההתראות: " + msg, 13, RED, false));
        });
    }

    /** MobilePushState stores a lower-cased key; show the real project name when the snapshot knows it. */
    private String projectDisplayName(Portfolio p, String key) {
        if (p != null) {
            for (Project x : p.projects) if (x.name.equalsIgnoreCase(key)) return x.name;
            for (Project x : p.infrastructure) if (x.name.equalsIgnoreCase(key)) return x.name;
        }
        return key.isEmpty() ? "פרויקט" : key;
    }

    private String[] jsonStrings(JSONArray a) {
        String[] out = new String[a.length()];
        for (int i = 0; i < a.length(); i++) out[i] = a.optString(i, "");
        return out;
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
