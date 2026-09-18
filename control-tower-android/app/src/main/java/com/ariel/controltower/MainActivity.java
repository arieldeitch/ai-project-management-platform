package com.ariel.controltower;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
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

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Control Tower — private single-owner Android client.
 * Data: PROJECT_CONTROL_BOARD Sheet via the Apps Script gateway ({@link Gateway}).
 * Push: FCM, transport only ({@link PushNotifications}).
 */
public class MainActivity extends Activity {
    // Calm, high-contrast light palette: portfolio information should dominate the screen,
    // not the chrome around it.
    private static final int BG = Color.rgb(246, 248, 251);
    private static final int SURFACE = Color.rgb(255, 255, 255);
    private static final int SURFACE_2 = Color.rgb(235, 241, 248);
    private static final int BORDER = Color.rgb(215, 222, 232);
    private static final int TEXT = Color.rgb(27, 34, 46);
    private static final int MUTED = Color.rgb(92, 104, 121);
    private static final int BLUE = Color.rgb(45, 101, 174);
    private static final int YELLOW = Color.rgb(169, 112, 0);
    private static final int RED = Color.rgb(188, 52, 52);
    private static final int GREEN = Color.rgb(35, 134, 83);

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private FrameLayout contentHost;
    private LinearLayout nav;
    private int activeTab = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        // 0.3.0 kept Supabase session tokens here; the Drive-first client has no login, so purge them.
        getSharedPreferences("control_tower_session", MODE_PRIVATE).edit().clear().apply();
        applyRoutingIntent(getIntent());
        if (Gateway.isConfigured(this)) {
            showApp();
        } else {
            showSetup(null);
        }
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
        // Ariel should never get "lost" in the app. Secondary sections always return Home first.
        if (contentHost != null && activeTab != 0) {
            selectTab(0);
            return;
        }
        super.onBackPressed();
    }

    /**
     * Low-risk deep link: a push payload may name a target tab. Project-level routing data is
     * preserved on the intent (ct_project_id) but not acted on yet.
     */
    private boolean applyRoutingIntent(Intent intent) {
        if (intent == null) return false;
        String target = intent.getStringExtra(PushNotifications.EXTRA_TARGET);
        if (target == null) target = intent.getStringExtra("target"); // FCM-displayed notifications pass raw data keys
        if (target == null) return false;
        switch (target) {
            case "now": activeTab = 0; return true;
            case "projects": activeTab = 1; return true;
            case "deputy": activeTab = 2; return true;
            case "activity": activeTab = 3; return true;
            default: return false;
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PushNotifications.PERMISSION_REQUEST) {
            PushNotifications.refreshAndRegisterToken(this);
        }
    }

    // ---------- small UI helpers (unchanged visual language) ----------

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
        t.setGravity(Gravity.RIGHT);
        t.setTextDirection(View.TEXT_DIRECTION_RTL);
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

    private Button actionButton(String label, boolean primary) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(15);
        b.setAllCaps(false);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setTextColor(primary ? BG : TEXT);
        b.setBackground(box(primary ? BLUE : SURFACE_2, primary ? BLUE : BORDER, 14));
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

    // ---------- setup state (replaces the old login) ----------

    /** One clear configuration state: shown only when no gateway URL/token is available. */
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
        markLp.gravity = Gravity.START;
        wrap.addView(mark, markLp);

        wrap.addView(text("CONTROL TOWER", 12, BLUE, true));
        wrap.addView(text("חיבור לשער", 32, TEXT, true), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 6, 0));
        String explain = Gateway.isBuildConfigured()
                ? "הגרסה נבנתה עם שער, אבל ההגדרה שנשמרה במכשיר אינה תקינה."
                : "הגרסה הזו נבנתה בלי כתובת שער (CT_GATEWAY_URL / CT_GATEWAY_TOKEN). אפשר להדביק אותם כאן פעם אחת, או לבנות מחדש עם הסודות ב-GitHub.";
        wrap.addView(text(explain, 15, MUTED, false), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 22));

        EditText url = input("כתובת Web App של Apps Script (https://script.google.com/macros/s/…/exec)", false);
        url.setText(Gateway.url(this));
        url.setTextDirection(View.TEXT_DIRECTION_LTR);
        url.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        wrap.addView(url, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(54), 0, 12));

        EditText token = input("GATEWAY_TOKEN (לפחות 32 תווים)", false);
        token.setTextDirection(View.TEXT_DIRECTION_LTR);
        token.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        wrap.addView(token, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(54), 0, 16));

        TextView status = text(problem == null ? "" : problem, 13, problem == null ? MUTED : RED, false);
        Button connect = actionButton("בדוק והתחבר", true);
        wrap.addView(connect, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(52), 0, 10));
        wrap.addView(status, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 0));

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
                        Toast.makeText(this, "מחובר ל-" + r.body.optString("spreadsheet_title", "PROJECT_CONTROL_BOARD"), Toast.LENGTH_SHORT).show();
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
    }

    // ---------- main shell ----------

    private void showApp() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        contentHost = new FrameLayout(this);
        LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f);
        root.addView(contentHost, cp);

        nav = new LinearLayout(this);
        nav.setOrientation(LinearLayout.HORIZONTAL);
        nav.setPadding(dp(8), dp(6), dp(8), dp(8));
        nav.setGravity(Gravity.CENTER);
        nav.setBackgroundColor(SURFACE);
        root.addView(nav, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(76)));
        setContentView(root);
        selectTab(activeTab);
        PushNotifications.onAppReady(this);
    }

    private void buildNav() {
        nav.removeAllViews();
        String[] labels = {"⌂ בית", "פרויקטים", "סגן", "פעילות"};
        for (int i = 0; i < labels.length; i++) {
            final int index = i;
            Button b = new Button(this);
            b.setText(labels[i]);
            b.setAllCaps(false);
            b.setTextSize(activeTab == i ? 13 : 12);
            b.setTypeface(Typeface.DEFAULT, activeTab == i ? Typeface.BOLD : Typeface.NORMAL);
            b.setTextColor(activeTab == i ? BLUE : TEXT);
            if (activeTab == i) {
                b.setBackground(box(Color.rgb(232, 240, 250), Color.rgb(184, 203, 227), 12));
            } else {
                b.setBackgroundColor(Color.TRANSPARENT);
            }
            b.setOnClickListener(v -> selectTab(index));
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f);
            p.setMargins(dp(2), 0, dp(2), 0);
            nav.addView(b, p);
        }
    }

    private void selectTab(int index) {
        activeTab = index;
        buildNav();
        contentHost.removeAllViews();
        if (index == 0) showHome();
        else if (index == 1) showProjects();
        else if (index == 2) showDeputy();
        else showActivity();
    }

    private ScrollView screen(String eyebrow, String title) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);
        LinearLayout col = new LinearLayout(this);
        col.setTag("screen-column");
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(dp(18), dp(18), dp(18), dp(30));
        col.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        if (activeTab != 0) {
            Button home = actionButton("⌂ חזרה לבית", false);
            home.setTextColor(BLUE);
            home.setBackground(box(Color.rgb(238, 244, 251), Color.rgb(196, 211, 230), 12));
            home.setOnClickListener(v -> selectTab(0));
            col.addView(home, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(44), 0, 14));
        }

        col.addView(text(eyebrow, 11, BLUE, true));
        col.addView(text(title, 28, TEXT, true), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 4, 0));
        TextView sync = text("נתוני Control Tower • קריאה חיה מהלוח", 11, MUTED, false);
        col.addView(sync, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 4, 16));
        scroll.addView(col);
        return scroll;
    }

    private LinearLayout column(ScrollView scroll) {
        return (LinearLayout) scroll.findViewWithTag("screen-column");
    }

    private View loading() {
        LinearLayout l = new LinearLayout(this);
        l.setGravity(Gravity.CENTER);
        ProgressBar p = new ProgressBar(this);
        l.addView(p, new LinearLayout.LayoutParams(dp(42), dp(42)));
        return l;
    }

    private TextView section(String value) {
        TextView t = text(value, 17, TEXT, true);
        t.setPadding(0, dp(12), 0, dp(8));
        return t;
    }

    private LinearLayout card() {
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setPadding(dp(14), dp(13), dp(14), dp(13));
        c.setBackground(box(SURFACE, BORDER, 12));
        c.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        return c;
    }

    private TextView badge(String label, int color) {
        TextView b = text(label, 11, color, true);
        b.setBackground(box(Color.argb(35, Color.red(color), Color.green(color), Color.blue(color)), color, 20));
        b.setPadding(dp(9), dp(4), dp(9), dp(4));
        return b;
    }

    private int ragColor(String rag) {
        if ("RED".equals(rag)) return RED;
        if ("GREEN".equals(rag)) return GREEN;
        return YELLOW;
    }

    // ---------- עכשיו ----------

    private void showHome() {
        ScrollView s = screen("CONTROL TOWER", "תמונת מצב");
        contentHost.addView(s);
        LinearLayout c = column(s);
        View load = loading();
        c.addView(load, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(80), 10, 0));
        fetchArray("portfolio", new JSONObject(), "projects", arr -> {
            c.removeView(load);
            renderHome(c, arr);
        }, msg -> replaceWithError(c, load, msg));
    }

    private void renderHome(LinearLayout c, JSONArray arr) {
        int red = 0, yellow = 0, green = 0, urgent = 0;
        for (int i = 0; i < arr.length(); i++) {
            JSONObject p = arr.optJSONObject(i);
            if (p == null) continue;
            String rag = p.optString("rag", "YELLOW");
            if ("RED".equals(rag)) red++;
            else if ("GREEN".equals(rag)) green++;
            else yellow++;
            if (isUrgent(p)) urgent++;
        }

        // Portfolio state comes first: Ariel should understand the situation before reading details.
        LinearLayout summary = card();
        summary.setBackground(box(SURFACE, Color.rgb(196, 207, 221), 14));
        summary.addView(text(arr.length() + " פרויקטים פעילים", 20, TEXT, true));
        summary.addView(text(urgent > 0 ? urgent + " דורשים תשומת לב" : "אין כרגע פרויקט שדורש פעולה מיידית", 14,
                urgent > 0 ? RED : GREEN, true), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 6, 10));
        LinearLayout strip = new LinearLayout(this);
        strip.setOrientation(LinearLayout.HORIZONTAL);
        strip.setBackground(box(Color.rgb(248, 250, 252), BORDER, 12));
        addCount(strip, "אדום", red, RED);
        addCount(strip, "צהוב", yellow, YELLOW);
        addCount(strip, "ירוק", green, GREEN);
        summary.addView(strip, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(72), 0, 0));
        c.addView(summary, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 4, 16));

        c.addView(section("דורש תשומת לב"));
        boolean anyUrgent = false;
        for (int i = 0; i < arr.length(); i++) {
            JSONObject p = arr.optJSONObject(i);
            if (p != null && isUrgent(p)) {
                anyUrgent = true;
                addProjectCard(c, p, false);
            }
        }
        if (!anyUrgent) {
            LinearLayout ok = card();
            ok.addView(text("✓ אין כרגע חסם או החלטה שמחכים לך", 14, GREEN, true));
            c.addView(ok, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 10));
        }

        c.addView(section("שאר הפרויקטים"));
        boolean anyNormal = false;
        for (int i = 0; i < arr.length(); i++) {
            JSONObject p = arr.optJSONObject(i);
            if (p != null && !isUrgent(p)) {
                anyNormal = true;
                addProjectCard(c, p, false);
            }
        }
        if (!anyNormal) {
            c.addView(text("כל הפרויקטים כרגע נמצאים באזור תשומת הלב.", 13, MUTED, false));
        }
    }

    private boolean isUrgent(JSONObject p) {
        return "RED".equals(p.optString("rag"))
                || p.optBoolean("needs_ariel", false)
                || p.optBoolean("user_test_required", false);
    }

    private String ragHe(String rag) {
        if ("RED".equals(rag)) return "אדום";
        if ("GREEN".equals(rag)) return "ירוק";
        return "צהוב";
    }

    private String shortText(String value, int max) {
        String v = value == null ? "" : value.trim();
        if (v.length() <= max) return v;
        return v.substring(0, Math.max(0, max - 1)).trim() + "…";
    }

    private void addCount(LinearLayout strip, String label, int count, int color) {
        LinearLayout b = new LinearLayout(this);
        b.setOrientation(LinearLayout.VERTICAL);
        b.setGravity(Gravity.CENTER);
        b.addView(text(String.valueOf(count), 21, TEXT, true));
        TextView l = text(label, 11, color, true);
        l.setGravity(Gravity.CENTER);
        b.addView(l);
        strip.addView(b, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f));
    }

    private void addProjectCard(LinearLayout parent, JSONObject p, boolean compact) {
        LinearLayout projectCard = card();
        String rag = p.optString("rag", "YELLOW");
        int color = ragColor(rag);
        if ("RED".equals(rag)) {
            projectCard.setBackground(box(Color.rgb(255, 247, 247), Color.rgb(231, 181, 181), 13));
        }

        LinearLayout top = new LinearLayout(this);
        top.setOrientation(LinearLayout.HORIZONTAL);
        top.setGravity(Gravity.CENTER_VERTICAL | Gravity.RIGHT);
        TextView name = text(p.optString("name", "פרויקט"), 18, TEXT, true);
        top.addView(name, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        top.addView(badge(ragHe(rag), color));
        projectCard.addView(top);

        String milestone = p.optString("milestone", "");
        if (milestone.isEmpty()) milestone = p.optString("lifecycle", "");
        if (!milestone.isEmpty()) {
            projectCard.addView(text(shortText(milestone, compact ? 110 : 150), 13, TEXT, false),
                    lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 9, 0));
        }

        String next = p.optString("next_action", "");
        if (!next.isEmpty()) {
            projectCard.addView(text("הבא: " + shortText(next, compact ? 110 : 170), 13, MUTED, false),
                    lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 7, 0));
        }

        if (p.optBoolean("user_test_required", false)) {
            projectCard.addView(text("🧪 מחכה לבדיקה שלך", 13, BLUE, true),
                    lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 7, 0));
        } else if (p.optBoolean("needs_ariel", false)) {
            String ask = p.optString("ariel_input", "");
            projectCard.addView(text("צריך ממך: " + shortText(ask.isEmpty() ? "החלטה או פעולה" : ask, 150), 13, RED, true),
                    lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 7, 0));
        }

        TextView open = text("פתח פרטים  ›", 12, BLUE, true);
        projectCard.addView(open, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 10, 0));
        projectCard.setOnClickListener(v -> showProjectDialog(p));
        parent.addView(projectCard, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 9));
    }

    // ---------- פרויקטים ----------

    private void showProjects() {
        ScrollView s = screen("PORTFOLIO", "פרויקטים");
        contentHost.addView(s);
        LinearLayout c = column(s);
        TextView hint = text("כל הפרויקטים במקום אחד. הקש על פרויקט כדי לראות יעד, חסמים והפעולה הבאה.", 13, MUTED, false);
        c.addView(hint, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 10));
        View load = loading();
        c.addView(load, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(80), 0, 0));
        fetchArray("portfolio", new JSONObject(), "projects", arr -> {
            c.removeView(load);
            if (arr.length() == 0) {
                c.addView(text("לא נמצאו פרויקטים בגיליון Projects.", 13, MUTED, false));
                return;
            }
            for (int i = 0; i < arr.length(); i++) {
                JSONObject p = arr.optJSONObject(i);
                if (p != null) addProjectCard(c, p, false);
            }
        }, msg -> replaceWithError(c, load, msg));
    }

    private void showProjectDialog(JSONObject p) {
        ScrollView s = new ScrollView(this);
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setPadding(dp(18), dp(8), dp(18), dp(12));
        c.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        String badgeText = p.optString("rag", "YELLOW") + (p.optString("confidence", "").isEmpty() ? "" : " • " + p.optString("confidence"));
        c.addView(badge(badgeText, ragColor(p.optString("rag", "YELLOW"))));
        addField(c, "שלב", p.optString("lifecycle", ""));
        addField(c, "יעד", p.optString("objective", ""));
        addField(c, "אבן דרך נוכחית", p.optString("milestone", ""));
        addField(c, "הפעולה הבאה", p.optString("next_action", ""));
        addField(c, "חסם / תלות", p.optString("blocker", ""));
        addField(c, "צריך את אריאל", p.optBoolean("needs_ariel", false) ? (p.optString("ariel_input", "").isEmpty() ? "כן" : p.optString("ariel_input")) : "לא נדרשת פעולה כרגע");
        addField(c, "סיכון / סחיפה", p.optString("risk", ""));
        addField(c, "בדיקת שליטה אחרונה", p.optString("last_check", ""));
        s.addView(c);
        AlertDialog.Builder builder = new AlertDialog.Builder(this)
                .setTitle(p.optString("name", "פרויקט"))
                .setView(s)
                .setPositiveButton("סגור", null);
        String link = p.optString("link", "");
        if (link.startsWith("http")) {
            builder.setNeutralButton("פתח קישור", (d, w) -> {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(link)));
                } catch (Exception e) {
                    Toast.makeText(this, "לא ניתן לפתוח את הקישור", Toast.LENGTH_SHORT).show();
                }
            });
        }
        AlertDialog dialog = builder.create();
        dialog.setOnShowListener(d -> {
            dialog.getWindow().setBackgroundDrawable(box(SURFACE, BORDER, 10));
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setTextColor(BLUE);
            Button neutral = dialog.getButton(AlertDialog.BUTTON_NEUTRAL);
            if (neutral != null) neutral.setTextColor(MUTED);
        });
        dialog.show();
    }

    private void addField(LinearLayout c, String label, String value) {
        if (value == null || value.trim().isEmpty() || "null".equals(value)) return;
        c.addView(text(label, 12, BLUE, true), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 16, 0));
        c.addView(text(value, 14, TEXT, false), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 4, 0));
    }

    // ---------- סגן ----------

    private void showDeputy() {
        ScrollView s = screen("COMMAND INBOX", "סגן");
        contentHost.addView(s);
        LinearLayout c = column(s);
        c.addView(text("כתוב מה לנהל, לבדוק או לקדם. הפקודה נכנסת ל-MobileInbox בגיליון כ-REPORTED; היא לא תסומן כמאומתת בלי ראיה.", 13, MUTED, false));

        EditText command = input("מה אתה רוצה שאנהל/אבדוק/אקדם?", true);
        command.setTextSize(16);
        command.setGravity(Gravity.TOP | Gravity.RIGHT);
        command.setTextDirection(View.TEXT_DIRECTION_RTL);
        command.setMinHeight(dp(120));
        command.setBackground(box(SURFACE, Color.rgb(53, 104, 159), 12));
        c.addView(command, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 16, 10));

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
        c.addView(send, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(52), 0, 16));
        TextView result = text("", 12, MUTED, false);
        c.addView(result);
        send.setOnClickListener(v -> {
            String q = command.getText().toString().trim();
            if (q.isEmpty()) return;
            send.setEnabled(false);
            result.setText("שולח ל-MobileInbox…");
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
                        result.setText("הפקודה נרשמה ב-MobileInbox (שורה " + done.body.optInt("row") + ").");
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
                LinearLayout card = card();
                LinearLayout top = new LinearLayout(this);
                top.setOrientation(LinearLayout.HORIZONTAL);
                top.setGravity(Gravity.RIGHT);
                top.addView(badge(statusHe(o.optString("status")), statusColor(o.optString("status"))));
                TextView src = badge(sourceHe(o.optString("source")), MUTED);
                LinearLayout.LayoutParams sl = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                sl.setMarginStart(dp(6));
                top.addView(src, sl);
                card.addView(top);
                card.addView(text(o.optString("report_text", ""), 14, TEXT, true), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 9, 0));
                String notes = o.optString("notes", "");
                if (!notes.isEmpty()) card.addView(text(notes, 13, MUTED, false), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 0));
                card.addView(text(o.optString("received_at", ""), 10, MUTED, false), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 0));
                holder.addView(card, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 8));
            }
        }, msg -> {
            holder.removeAllViews();
            holder.addView(text("לא ניתן לטעון את MobileInbox: " + msg, 13, RED, false));
        });
    }

    private String statusHe(String s) {
        switch (s) {
            case "REPORTED": return "דווח — ממתין לאימות";
            case "VERIFIED": return "אומת";
            case "IN_PROGRESS": return "בביצוע";
            case "DONE": case "COMPLETED": return "הושלם";
            case "NEEDS_DECISION": return "דורש החלטה";
            case "REJECTED": case "FAILED": return "נדחה";
            default: return s.isEmpty() ? "התקבל" : s;
        }
    }

    private String sourceHe(String s) {
        switch (s) {
            case "share": return "שיתוף";
            case "deputy_command": return "פקודה";
            default: return "ידני";
        }
    }

    private int statusColor(String s) {
        if ("VERIFIED".equals(s) || "DONE".equals(s) || "COMPLETED".equals(s)) return GREEN;
        if ("REJECTED".equals(s) || "FAILED".equals(s)) return RED;
        if ("NEEDS_DECISION".equals(s)) return YELLOW;
        return BLUE;
    }

    // ---------- פעילות ----------

    private void showActivity() {
        ScrollView s = screen("CONTROL EVENTS", "פעילות");
        contentHost.addView(s);
        LinearLayout c = column(s);
        LinearLayout security = card();
        security.addView(text("מצב מערכת", 13, BLUE, true));
        TextView gatewayLine = text("שער: בודק…", 13, TEXT, true);
        security.addView(gatewayLine, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 7, 0));
        TextView pushStatus = text(PushNotifications.statusLine(this), 12, MUTED, false);
        security.addView(pushStatus, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 0));
        security.addView(text("גרסה " + BuildConfig.VERSION_NAME + " (" + BuildConfig.VERSION_CODE + ") • " + BuildConfig.GIT_SHA
                        + (Gateway.isBuildConfigured() ? " • שער מהבנייה" : " • שער מהמכשיר"), 11, MUTED, false),
                lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 4, 0));

        Button testPush = actionButton("שלח התראת בדיקה", false);
        security.addView(testPush, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(46), 12, 0));
        testPush.setOnClickListener(v -> {
            testPush.setEnabled(false);
            pushStatus.setText("שולח התראת בדיקה…");
            PushNotifications.requestTestPush(this, msg -> runOnUiThread(() -> {
                testPush.setEnabled(true);
                pushStatus.setText(msg);
            }));
        });
        Button disconnect = actionButton("נתק מכשיר והגדר מחדש", false);
        security.addView(disconnect, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(46), 8, 0));
        disconnect.setOnClickListener(v -> PushNotifications.unregister(this, () -> {
            Gateway.saveOverride(this, "", "");
            if (Gateway.isBuildConfigured()) {
                Toast.makeText(this, "המכשיר נותק מ-MobileDevices. השער מהבנייה נשאר פעיל.", Toast.LENGTH_LONG).show();
                selectTab(3);
            } else {
                showSetup(null);
            }
        }));
        c.addView(security, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 16));

        io.execute(() -> {
            Gateway.Result r = Gateway.call(this, "health", new JSONObject());
            runOnUiThread(() -> {
                if (r.ok()) {
                    JSONArray missing = r.body.optJSONArray("unresolved_columns");
                    String miss = missing != null && missing.length() > 0 ? " • עמודות לא זוהו: " + missing.length() : "";
                    gatewayLine.setText("שער מחובר • " + r.body.optString("spreadsheet_title", "PROJECT_CONTROL_BOARD")
                            + " • " + r.body.optInt("projects_rows", 0) + " פרויקטים"
                            + " • מכשירים רשומים: " + r.body.optInt("active_devices", 0)
                            + (r.body.optBoolean("fcm_configured", false) ? " • FCM מוגדר" : " • FCM לא מוגדר בסקריפט")
                            + (r.body.optBoolean("scanner_trigger_installed", false) ? " • סורק פעיל" : " • סורק לא מותקן")
                            + miss);
                    gatewayLine.setTextColor(TEXT);
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
                LinearLayout card = card();
                card.addView(badge(eventHe(o.optString("event")), BLUE));
                card.addView(text(o.optString("project_key", ""), 16, TEXT, true), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 0));
                card.addView(text(o.optString("rag", "") + " • " + o.optString("lifecycle", ""), 13, MUTED, false), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 5, 0));
                card.addView(text(o.optString("occurred_at", ""), 10, MUTED, false), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 0));
                c.addView(card, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 8));
            }
        }, msg -> replaceWithError(c, load, msg));
    }

    private String eventHe(String ev) {
        String out = ev.replace("project_red", "הפך לאדום").replace("needs_ariel", "צריך את אריאל").replace("user_test_required", "מחכה לאריאל").replace("+", " + ");
        return out.isEmpty() ? "אירוע" : out;
    }

    // ---------- plumbing ----------

    private void replaceWithError(LinearLayout parent, View loading, String message) {
        if (loading.getParent() == parent) parent.removeView(loading);
        LinearLayout err = card();
        err.addView(text("לא ניתן לטעון נתונים כרגע.", 15, RED, true));
        err.addView(text(message == null || message.isEmpty() ? "בדוק חיבור לרשת או את הגדרת השער." : message, 13, MUTED, false), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 5, 0));
        parent.addView(err, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 0));
    }

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
