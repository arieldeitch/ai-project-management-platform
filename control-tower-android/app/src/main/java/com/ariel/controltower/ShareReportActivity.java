package com.ariel.controltower;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Android share target: text shared from Claude / Gemini / Copilot lands in the
 * MobileInbox tab of PROJECT_CONTROL_BOARD as REPORTED (never VERIFIED by intake alone).
 */
public class ShareReportActivity extends Activity {
    private static final int BG = Color.rgb(9, 13, 22);
    private static final int SURFACE = Color.rgb(20, 27, 40);
    private static final int BORDER = Color.rgb(49, 61, 81);
    private static final int TEXT = Color.rgb(237, 242, 250);
    private static final int MUTED = Color.rgb(158, 170, 191);
    private static final int BLUE = Color.rgb(100, 168, 255);
    private static final int GREEN = Color.rgb(77, 200, 139);
    private static final int RED = Color.rgb(240, 91, 91);

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private EditText reportText;
    private Button send;
    private TextView status;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);

        String shared = "";
        Intent intent = getIntent();
        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            CharSequence value = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
            if (value != null) shared = value.toString().trim();
        }
        showReportScreen(shared);
    }

    @Override
    protected void onDestroy() {
        io.shutdownNow();
        super.onDestroy();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private GradientDrawable box(int color, int stroke, int radiusDp) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(radiusDp));
        d.setStroke(dp(1), stroke);
        return d;
    }

    private TextView label(String value, float sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setGravity(Gravity.RIGHT);
        t.setTextDirection(View.TEXT_DIRECTION_RTL);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return t;
    }

    private void showReportScreen(String shared) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);

        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        col.setPadding(dp(20), dp(28), dp(20), dp(28));

        col.addView(label("CONTROL TOWER", 11, BLUE, true));
        TextView title = label("דיווח פרויקט חיצוני", 28, TEXT, true);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleLp.topMargin = dp(4);
        col.addView(title, titleLp);

        TextView explainer = label("שתף לכאן את דוח Claude / Gemini / Copilot. הוא ייכנס ל-MobileInbox כ-REPORTED, ומגדל הפיקוח יאמת ראיות לפני שיעלה אותו ל-VERIFIED.", 14, MUTED, false);
        LinearLayout.LayoutParams exLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        exLp.topMargin = dp(8);
        exLp.bottomMargin = dp(16);
        col.addView(explainer, exLp);

        reportText = new EditText(this);
        reportText.setText(shared);
        reportText.setHint("הדבק או ערוך את דוח הפרויקט כאן");
        reportText.setTextSize(15);
        reportText.setTextColor(TEXT);
        reportText.setHintTextColor(MUTED);
        reportText.setGravity(Gravity.TOP | Gravity.RIGHT);
        reportText.setTextDirection(View.TEXT_DIRECTION_RTL);
        reportText.setMinHeight(dp(260));
        reportText.setPadding(dp(14), dp(14), dp(14), dp(14));
        reportText.setBackground(box(SURFACE, BORDER, 12));
        col.addView(reportText, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        send = new Button(this);
        send.setText("דווח למגדל הפיקוח");
        send.setAllCaps(false);
        send.setTextSize(16);
        send.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        send.setTextColor(BG);
        send.setBackground(box(BLUE, BLUE, 14));
        LinearLayout.LayoutParams sendLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(54));
        sendLp.topMargin = dp(14);
        col.addView(send, sendLp);

        Button open = new Button(this);
        open.setText("פתח את Control Tower");
        open.setAllCaps(false);
        open.setTextColor(TEXT);
        open.setBackground(box(SURFACE, BORDER, 14));
        LinearLayout.LayoutParams openLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(50));
        openLp.topMargin = dp(8);
        col.addView(open, openLp);

        status = label("", 13, MUTED, false);
        LinearLayout.LayoutParams statusLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        statusLp.topMargin = dp(10);
        col.addView(status, statusLp);

        send.setOnClickListener(v -> submitReport());
        open.setOnClickListener(v -> {
            startActivity(new Intent(this, MainActivity.class));
            finish();
        });

        if (!Gateway.isConfigured(this)) {
            status.setText("צריך להגדיר את השער פעם אחת באפליקציית Control Tower לפני שאפשר לדווח משיתוף.");
            status.setTextColor(RED);
            send.setEnabled(false);
        } else if (shared.isEmpty()) {
            status.setText("לא התקבל טקסט מהאפליקציה המשתפת. אפשר להדביק כאן ידנית.");
        }

        scroll.addView(col);
        setContentView(scroll);
    }

    private void submitReport() {
        String body = reportText.getText().toString().trim();
        if (body.isEmpty()) {
            status.setText("אין עדיין תוכן לדיווח.");
            status.setTextColor(RED);
            return;
        }
        send.setEnabled(false);
        status.setText("שולח ל-MobileInbox…");
        status.setTextColor(MUTED);

        io.execute(() -> {
            Gateway.Result r;
            try {
                JSONObject params = new JSONObject()
                        .put("report_text", "EXTERNAL_PROJECT_REPORT_V1\n" + body)
                        .put("source", "share")
                        .put("device_id", Gateway.deviceId(this));
                r = Gateway.call(this, "submit_report", params);
            } catch (Exception e) {
                r = new Gateway.Result(0, null, "השליחה נכשלה.");
            }
            Gateway.Result done = r;
            runOnUiThread(() -> {
                if (done.ok()) {
                    status.setText("הדיווח נרשם ב-MobileInbox כ-REPORTED (שורה " + done.body.optInt("row") + "). מגדל הפיקוח יאמת את הראיות.");
                    status.setTextColor(GREEN);
                    Toast.makeText(this, "הדיווח נשלח ל-Control Tower", Toast.LENGTH_SHORT).show();
                    send.postDelayed(this::finish, 1400);
                } else {
                    send.setEnabled(true);
                    status.setText("השליחה נכשלה: " + done.describe());
                    status.setTextColor(RED);
                }
            });
        });
    }
}
