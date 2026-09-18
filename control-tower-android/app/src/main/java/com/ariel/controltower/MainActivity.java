package com.ariel.controltower;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
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

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int BG = Color.rgb(9, 13, 22);
    private static final int SURFACE = Color.rgb(20, 27, 40);
    private static final int SURFACE_2 = Color.rgb(28, 37, 53);
    private static final int BORDER = Color.rgb(49, 61, 81);
    private static final int TEXT = Color.rgb(237, 242, 250);
    private static final int MUTED = Color.rgb(158, 170, 191);
    private static final int BLUE = Color.rgb(100, 168, 255);
    private static final int YELLOW = Color.rgb(245, 190, 45);
    private static final int RED = Color.rgb(240, 91, 91);
    private static final int GREEN = Color.rgb(77, 200, 139);

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private android.content.SharedPreferences prefs;
    private FrameLayout contentHost;
    private LinearLayout nav;
    private int activeTab = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        prefs = getSharedPreferences("control_tower_session", MODE_PRIVATE);
        applyRoutingIntent(getIntent());
        if (prefs.getString("refresh_token", null) != null || prefs.getString("access_token", null) != null) {
            showApp();
        } else {
            showLogin();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (applyRoutingIntent(intent) && contentHost != null) selectTab(activeTab);
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
            PushNotifications.refreshAndRegisterToken(this, prefs);
        }
    }

    @Override
    protected void onDestroy() {
        io.shutdownNow();
        super.onDestroy();
    }

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

    private void showLogin() {
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

        TextView eyebrow = text("CONTROL TOWER", 12, BLUE, true);
        wrap.addView(eyebrow);
        TextView title = text("הסגן שלך", 32, TEXT, true);
        wrap.addView(title, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 6, 0));
        TextView subtitle = text("כניסה מאובטחת למגדל הפיקוח. רק החשבון המורשה יכול לגשת לנתונים.", 15, MUTED, false);
        wrap.addView(subtitle, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 26));

        EditText email = new EditText(this);
        email.setText(BuildConfig.AUTHORIZED_EMAIL);
        email.setHint("אימייל");
        email.setSingleLine(true);
        email.setTextColor(TEXT);
        email.setHintTextColor(MUTED);
        email.setBackground(box(SURFACE, BORDER, 12));
        email.setPadding(dp(14), 0, dp(14), 0);
        email.setTextDirection(View.TEXT_DIRECTION_LTR);
        wrap.addView(email, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(54), 0, 12));

        EditText password = new EditText(this);
        password.setHint("סיסמה");
        password.setSingleLine(true);
        password.setTextColor(TEXT);
        password.setHintTextColor(MUTED);
        password.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        password.setBackground(box(SURFACE, BORDER, 12));
        password.setPadding(dp(14), 0, dp(14), 0);
        password.setTextDirection(View.TEXT_DIRECTION_LTR);
        wrap.addView(password, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(54), 0, 16));

        TextView status = text("", 13, MUTED, false);
        status.setVisibility(View.GONE);

        Button login = actionButton("התחברות", true);
        wrap.addView(login, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(52), 0, 10));
        Button signup = actionButton("יצירת חשבון ראשונית", false);
        wrap.addView(signup, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(52), 0, 8));
        wrap.addView(status, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 0));

        login.setOnClickListener(v -> authenticate(email.getText().toString().trim(), password.getText().toString(), false, status, login, signup));
        signup.setOnClickListener(v -> authenticate(email.getText().toString().trim(), password.getText().toString(), true, status, login, signup));

        scroll.addView(wrap);
        setContentView(scroll);
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

    private void authenticate(String email, String password, boolean signup, TextView status, Button login, Button signupButton) {
        if (!BuildConfig.AUTHORIZED_EMAIL.equalsIgnoreCase(email)) {
            status.setText("החשבון הזה אינו מורשה ל-Control Tower.");
            status.setTextColor(RED);
            status.setVisibility(View.VISIBLE);
            return;
        }
        if (password.length() < 6) {
            status.setText("נדרשת סיסמה של לפחות 6 תווים.");
            status.setTextColor(YELLOW);
            status.setVisibility(View.VISIBLE);
            return;
        }
        login.setEnabled(false);
        signupButton.setEnabled(false);
        status.setText(signup ? "יוצר חשבון מאובטח…" : "מתחבר…");
        status.setTextColor(MUTED);
        status.setVisibility(View.VISIBLE);
        io.execute(() -> {
            try {
                JSONObject payload = new JSONObject().put("email", email).put("password", password);
                String endpoint = signup ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
                Response r = raw("POST", endpoint, payload.toString(), false, false);
                if (r.ok()) {
                    JSONObject data = new JSONObject(r.body);
                    String access = data.optString("access_token", "");
                    String refresh = data.optString("refresh_token", "");
                    if (!access.isEmpty() && !refresh.isEmpty()) {
                        saveSession(access, refresh);
                        runOnUiThread(this::showApp);
                    } else {
                        runOnUiThread(() -> {
                            login.setEnabled(true);
                            signupButton.setEnabled(true);
                            status.setText("החשבון נוצר. אם נשלח אליך מייל אימות — אשר אותו ואז לחץ התחברות.");
                            status.setTextColor(GREEN);
                        });
                    }
                } else {
                    String msg = parseApiError(r.body);
                    runOnUiThread(() -> {
                        login.setEnabled(true);
                        signupButton.setEnabled(true);
                        status.setText(msg);
                        status.setTextColor(RED);
                    });
                }
            } catch (Exception e) {
                runOnUiThread(() -> {
                    login.setEnabled(true);
                    signupButton.setEnabled(true);
                    status.setText("לא ניתן להתחבר כרגע. בדוק חיבור לרשת ונסה שוב.");
                    status.setTextColor(RED);
                });
            }
        });
    }

    private String parseApiError(String body) {
        try {
            JSONObject o = new JSONObject(body);
            String s = o.optString("msg", o.optString("message", o.optString("error_description", "")));
            if (s.toLowerCase().contains("invalid login")) return "האימייל או הסיסמה אינם נכונים.";
            if (s.toLowerCase().contains("already registered")) return "החשבון כבר קיים. השתמש בהתחברות.";
            if (s.toLowerCase().contains("password")) return "הסיסמה אינה עומדת בדרישות האבטחה.";
        } catch (Exception ignored) {}
        return "הפעולה נכשלה. נסה שוב בעוד רגע.";
    }

    private void saveSession(String access, String refresh) {
        prefs.edit().putString("access_token", access).putString("refresh_token", refresh).apply();
    }

    private void logout() {
        PushNotifications.unregisterOnLogout(this, prefs, () -> {
            prefs.edit().clear().apply();
            showLogin();
        });
    }

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
        nav.setPadding(dp(6), dp(4), dp(6), dp(8));
        nav.setGravity(Gravity.CENTER);
        nav.setBackgroundColor(Color.rgb(12, 18, 29));
        root.addView(nav, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(70)));
        setContentView(root);
        selectTab(activeTab);
        // Context now exists (owner authenticated, main screen visible): channel, permission, token.
        PushNotifications.onSessionReady(this, prefs);
    }

    private void buildNav() {
        nav.removeAllViews();
        String[] labels = {"עכשיו", "פרויקטים", "סגן", "פעילות"};
        for (int i = 0; i < labels.length; i++) {
            final int index = i;
            Button b = new Button(this);
            b.setText(labels[i]);
            b.setAllCaps(false);
            b.setTextSize(12);
            b.setTypeface(Typeface.DEFAULT, activeTab == i ? Typeface.BOLD : Typeface.NORMAL);
            b.setTextColor(activeTab == i ? BLUE : MUTED);
            b.setBackgroundColor(Color.TRANSPARENT);
            b.setOnClickListener(v -> selectTab(index));
            nav.addView(b, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f));
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
        LinearLayout col = new LinearLayout(this);
        col.setTag("screen-column");
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(dp(18), dp(20), dp(18), dp(30));
        col.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        col.addView(text(eyebrow, 11, BLUE, true));
        col.addView(text(title, 28, TEXT, true), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 4, 0));
        TextView sync = text("ענן מאובטח • MIRRORED", 11, MUTED, false);
        col.addView(sync, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 4, 18));
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

    private void showHome() {
        ScrollView s = screen("CONTROL TOWER", "בוקר טוב, אריאל");
        contentHost.addView(s);
        LinearLayout c = column(s);
        View load = loading();
        c.addView(load, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(80), 10, 0));
        fetchArray("/rest/v1/control_portfolio?select=*&order=last_control_check.desc.nullslast", arr -> {
            c.removeView(load);
            renderHome(c, arr);
        }, () -> replaceWithError(c, load));
    }

    private void renderHome(LinearLayout c, JSONArray arr) {
        JSONObject need = null;
        int red = 0, yellow = 0, green = 0;
        for (int i = 0; i < arr.length(); i++) {
            JSONObject p = arr.optJSONObject(i);
            if (p == null) continue;
            String rag = p.optString("rag", "YELLOW");
            if ("RED".equals(rag)) red++; else if ("GREEN".equals(rag)) green++; else yellow++;
            if (need == null && p.optBoolean("needs_ariel", false)) need = p;
        }

        LinearLayout needCard = card();
        needCard.setBackground(box(Color.rgb(15, 29, 48), Color.rgb(53, 104, 159), 12));
        needCard.addView(text("מה צריך ממך עכשיו", 14, BLUE, true));
        if (need == null) {
            needCard.addView(text("אין כרגע החלטה שעוצרת עבודה", 16, TEXT, true), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 10, 0));
        } else {
            needCard.addView(text(need.optString("project_name"), 18, TEXT, true), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 10, 0));
            needCard.addView(text(need.optString("ariel_decision_input", "נדרשת פעולה שלך"), 14, MUTED, false), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 7, 0));
            JSONObject finalNeed = need;
            needCard.setOnClickListener(v -> showProjectDialog(finalNeed));
        }
        c.addView(needCard, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 12));

        c.addView(section("המיקוד עכשיו"));
        for (int i = 0; i < Math.min(3, arr.length()); i++) {
            JSONObject p = arr.optJSONObject(i);
            if (p != null) addProjectCard(c, p, true);
        }

        c.addView(section("מצב הפורטפוליו"));
        LinearLayout strip = new LinearLayout(this);
        strip.setOrientation(LinearLayout.HORIZONTAL);
        strip.setBackground(box(SURFACE, BORDER, 12));
        addCount(strip, "אדום", red, RED);
        addCount(strip, "צהוב", yellow, YELLOW);
        addCount(strip, "ירוק", green, GREEN);
        c.addView(strip, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(76), 0, 8));
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
        LinearLayout card = card();
        LinearLayout top = new LinearLayout(this);
        top.setOrientation(LinearLayout.HORIZONTAL);
        top.setGravity(Gravity.CENTER_VERTICAL | Gravity.RIGHT);
        TextView name = text(p.optString("project_name", "פרויקט"), 17, TEXT, true);
        top.addView(name, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        top.addView(badge(p.optString("rag", "YELLOW"), ragColor(p.optString("rag", "YELLOW"))));
        card.addView(top);
        String body = compact ? p.optString("next_action", "") : p.optString("current_milestone", "");
        if (!body.isEmpty()) card.addView(text(body, 13, MUTED, false), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 9, 0));
        card.setOnClickListener(v -> showProjectDialog(p));
        parent.addView(card, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 8));
    }

    private void showProjects() {
        ScrollView s = screen("PORTFOLIO", "פרויקטים");
        contentHost.addView(s);
        LinearLayout c = column(s);
        TextView hint = text("מקור האמת נשאר ב-PROJECT_CONTROL_BOARD. כאן מוצגת מראה מאובטחת.", 13, MUTED, false);
        c.addView(hint, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 10));
        View load = loading();
        c.addView(load, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(80), 0, 0));
        fetchArray("/rest/v1/control_portfolio?select=*&order=project_name.asc", arr -> {
            c.removeView(load);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject p = arr.optJSONObject(i);
                if (p != null) addProjectCard(c, p, false);
            }
        }, () -> replaceWithError(c, load));
    }

    private void showProjectDialog(JSONObject p) {
        ScrollView s = new ScrollView(this);
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setPadding(dp(18), dp(8), dp(18), dp(12));
        c.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        c.addView(badge(p.optString("rag", "YELLOW") + " • " + p.optString("confidence", ""), ragColor(p.optString("rag", "YELLOW"))));
        addField(c, "יעד", p.optString("objective", ""));
        addField(c, "אבן דרך נוכחית", p.optString("current_milestone", ""));
        addField(c, "ראיות", p.optString("progress_evidence", ""));
        addField(c, "הפעולה הבאה", p.optString("next_action", ""));
        addField(c, "חסם / תלות", p.optString("blocker_dependency", ""));
        addField(c, "צריך את אריאל", p.optBoolean("needs_ariel", false) ? p.optString("ariel_decision_input", "כן") : "לא נדרשת פעולה כרגע");
        addField(c, "סיכון / סחיפה", p.optString("risk_drift", ""));
        addField(c, "בדיקת שליטה אחרונה", p.optString("last_control_check", ""));
        addField(c, "מקור אמת", p.optString("source_of_truth", ""));
        s.addView(c);
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle(p.optString("project_name", "פרויקט"))
                .setView(s)
                .setPositiveButton("סגור", null)
                .create();
        dialog.setOnShowListener(d -> {
            dialog.getWindow().setBackgroundDrawable(box(SURFACE, BORDER, 10));
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setTextColor(BLUE);
        });
        dialog.show();
    }

    private void addField(LinearLayout c, String label, String value) {
        if (value == null || value.trim().isEmpty() || "null".equals(value)) return;
        c.addView(text(label, 12, BLUE, true), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 16, 0));
        c.addView(text(value, 14, TEXT, false), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 4, 0));
    }

    private void showDeputy() {
        ScrollView s = screen("COMMAND INBOX", "סגן");
        contentHost.addView(s);
        LinearLayout c = column(s);
        c.addView(text("כתוב מה לנהל, לבדוק או לקדם. הפקודה נכנסת לתור ענן אמיתי; היא לא תסומן כהושלמה בלי ראיה.", 13, MUTED, false));

        EditText command = new EditText(this);
        command.setHint("מה אתה רוצה שאנהל/אבדוק/אקדם?");
        command.setTextColor(TEXT);
        command.setHintTextColor(MUTED);
        command.setTextSize(16);
        command.setGravity(Gravity.TOP | Gravity.RIGHT);
        command.setTextDirection(View.TEXT_DIRECTION_RTL);
        command.setMinHeight(dp(120));
        command.setPadding(dp(14), dp(14), dp(14), dp(14));
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
            result.setText("שולח לתור…");
            postCommand(q, () -> {
                send.setEnabled(true);
                command.setText("");
                result.setText("הפקודה התקבלה בתור הענן.");
                result.setTextColor(GREEN);
                loadCommands(c);
            }, () -> {
                send.setEnabled(true);
                result.setText("השליחה נכשלה. נסה שוב.");
                result.setTextColor(RED);
            });
        });

        c.addView(section("היסטוריית פקודות"));
        loadCommands(c);
    }

    private void loadCommands(LinearLayout c) {
        View old = c.findViewWithTag("commands-list");
        if (old != null) c.removeView(old);
        LinearLayout holder = new LinearLayout(this);
        holder.setTag("commands-list");
        holder.setOrientation(LinearLayout.VERTICAL);
        c.addView(holder);
        ProgressBar p = new ProgressBar(this);
        holder.addView(p, new LinearLayout.LayoutParams(dp(38), dp(38)));
        fetchArray("/rest/v1/control_commands?select=*&order=created_at.desc&limit=50", arr -> {
            holder.removeAllViews();
            if (arr.length() == 0) {
                holder.addView(text("עדיין אין פקודות.", 13, MUTED, false));
                return;
            }
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null) continue;
                LinearLayout card = card();
                card.addView(badge(statusHe(o.optString("status")), statusColor(o.optString("status"))));
                card.addView(text(o.optString("command_text", ""), 14, TEXT, true), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 9, 0));
                String summary = o.optString("result_summary", "");
                if (!summary.isEmpty() && !"null".equals(summary)) card.addView(text(summary, 13, MUTED, false), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 0));
                card.addView(text(o.optString("updated_at", o.optString("created_at", "")), 10, MUTED, false), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 0));
                holder.addView(card, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 8));
            }
        }, () -> {
            holder.removeAllViews();
            holder.addView(text("לא ניתן לטעון את תור הפקודות כרגע.", 13, RED, false));
        });
    }

    private String statusHe(String s) {
        switch (s) {
            case "QUEUED": return "ממתינה לסוכן";
            case "RUNNING": return "בביצוע";
            case "COMPLETED": return "הושלמה";
            case "NEEDS_DECISION": return "דורשת החלטה";
            case "FAILED": return "נכשלה";
            default: return "התקבלה";
        }
    }

    private int statusColor(String s) {
        if ("COMPLETED".equals(s)) return GREEN;
        if ("FAILED".equals(s)) return RED;
        if ("NEEDS_DECISION".equals(s)) return YELLOW;
        return BLUE;
    }

    private void postCommand(String command, Runnable ok, Runnable fail) {
        io.execute(() -> {
            try {
                JSONObject payload = new JSONObject().put("command_text", command).put("status", "RECEIVED");
                Response r = rest("POST", "/rest/v1/control_commands", payload.toString(), true);
                runOnUiThread(r.ok() ? ok : fail);
            } catch (Exception e) {
                runOnUiThread(fail);
            }
        });
    }

    private void showActivity() {
        ScrollView s = screen("CONTROL EVENTS", "פעילות");
        contentHost.addView(s);
        LinearLayout c = column(s);
        LinearLayout security = card();
        security.addView(text("מצב מערכת", 13, BLUE, true));
        security.addView(text("DB מאובטח מחובר • RLS פעיל • Google Drive נשאר מקור האמת", 13, TEXT, true), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 7, 0));
        TextView pushStatus = text(PushNotifications.statusLine(this, prefs), 12, MUTED, false);
        security.addView(pushStatus, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 0));
        security.addView(text("גרסה " + BuildConfig.VERSION_NAME + " (" + BuildConfig.VERSION_CODE + ") • " + BuildConfig.GIT_SHA, 11, MUTED, false),
                lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 4, 0));
        Button testPush = actionButton("שלח התראת בדיקה", false);
        security.addView(testPush, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(46), 12, 0));
        testPush.setOnClickListener(v -> {
            testPush.setEnabled(false);
            pushStatus.setText("שולח התראת בדיקה…");
            PushNotifications.requestTestPush(prefs, msg -> runOnUiThread(() -> {
                testPush.setEnabled(true);
                pushStatus.setText(msg);
            }));
        });
        Button logout = actionButton("התנתקות", false);
        security.addView(logout, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(46), 8, 0));
        logout.setOnClickListener(v -> logout());
        c.addView(security, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 16));
        c.addView(section("שינויים משמעותיים"));
        View load = loading();
        c.addView(load, lp(ViewGroup.LayoutParams.MATCH_PARENT, dp(80), 0, 0));
        fetchArray("/rest/v1/control_activity?select=*&order=occurred_at.desc&limit=50", arr -> {
            c.removeView(load);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null) continue;
                LinearLayout card = card();
                card.addView(badge(o.optString("evidence_level", "VERIFIED"), BLUE));
                card.addView(text(o.optString("title", ""), 16, TEXT, true), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 0));
                card.addView(text(o.optString("detail", ""), 13, MUTED, false), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 5, 0));
                card.addView(text(o.optString("occurred_at", ""), 10, MUTED, false), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 0));
                c.addView(card, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 0, 8));
            }
        }, () -> replaceWithError(c, load));
    }

    private void replaceWithError(LinearLayout parent, View loading) {
        if (loading.getParent() == parent) parent.removeView(loading);
        LinearLayout err = card();
        err.addView(text("לא ניתן לטעון נתונים כרגע.", 15, RED, true));
        err.addView(text("בדוק חיבור לרשת או התחבר מחדש.", 13, MUTED, false), lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 5, 0));
        parent.addView(err, lp(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, 8, 0));
    }

    private interface ArraySuccess { void run(JSONArray data); }

    private void fetchArray(String path, ArraySuccess ok, Runnable fail) {
        io.execute(() -> {
            try {
                Response r = rest("GET", path, null, false);
                if (!r.ok()) {
                    runOnUiThread(fail);
                    return;
                }
                JSONArray a = new JSONArray(r.body);
                runOnUiThread(() -> ok.run(a));
            } catch (Exception e) {
                runOnUiThread(fail);
            }
        });
    }

    private Response rest(String method, String path, String body, boolean preferRepresentation) throws Exception {
        Response r = raw(method, path, body, true, preferRepresentation);
        if (r.code == 401 && refreshSession()) {
            r = raw(method, path, body, true, preferRepresentation);
        }
        if (r.code == 401) {
            runOnUiThread(() -> {
                prefs.edit().clear().apply();
                Toast.makeText(this, "פג תוקף החיבור. התחבר מחדש.", Toast.LENGTH_LONG).show();
                showLogin();
            });
        }
        return r;
    }

    private boolean refreshSession() {
        try {
            String refresh = prefs.getString("refresh_token", null);
            if (refresh == null) return false;
            JSONObject p = new JSONObject().put("refresh_token", refresh);
            Response r = raw("POST", "/auth/v1/token?grant_type=refresh_token", p.toString(), false, false);
            if (!r.ok()) return false;
            JSONObject o = new JSONObject(r.body);
            String access = o.optString("access_token", "");
            String nextRefresh = o.optString("refresh_token", refresh);
            if (access.isEmpty()) return false;
            saveSession(access, nextRefresh);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Response raw(String method, String path, String body, boolean authenticated, boolean preferRepresentation) throws Exception {
        URL url = new URL(BuildConfig.SUPABASE_URL + path);
        HttpURLConnection c = (HttpURLConnection) url.openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(20000);
        c.setRequestMethod(method);
        c.setRequestProperty("apikey", BuildConfig.SUPABASE_KEY);
        c.setRequestProperty("Accept", "application/json");
        if (authenticated) {
            String access = prefs.getString("access_token", null);
            if (access != null) c.setRequestProperty("Authorization", "Bearer " + access);
        }
        if (preferRepresentation) c.setRequestProperty("Prefer", "return=representation");
        if (body != null) {
            c.setDoOutput(true);
            c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            try (OutputStream os = c.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }
        }
        int code = c.getResponseCode();
        InputStream in = code >= 200 && code < 400 ? c.getInputStream() : c.getErrorStream();
        StringBuilder sb = new StringBuilder();
        if (in != null) {
            try (BufferedReader br = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
                String line;
                while ((line = br.readLine()) != null) sb.append(line);
            }
        }
        c.disconnect();
        return new Response(code, sb.toString());
    }

    private static class Response {
        final int code;
        final String body;
        Response(int code, String body) { this.code = code; this.body = body == null ? "" : body; }
        boolean ok() { return code >= 200 && code < 300; }
    }
}
