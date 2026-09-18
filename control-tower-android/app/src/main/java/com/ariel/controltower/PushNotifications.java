package com.ariel.controltower;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

import org.json.JSONObject;

import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

/**
 * Push readiness: notification channel, Android 13+ permission, FCM token lifecycle and
 * device registration through the Apps Script gateway (MobileDevices tab).
 * Firebase is transport only; no portfolio data ever goes through it.
 */
public final class PushNotifications {
    public static final String CHANNEL_ID = "control_tower_alerts";
    public static final int PERMISSION_REQUEST = 4101;

    /** Intent extras preserved from the push payload for (future) deep-link routing. */
    public static final String EXTRA_TARGET = "ct_target";       // now | projects | deputy | activity
    public static final String EXTRA_PROJECT_ID = "ct_project_id";
    public static final String EXTRA_EVENT = "ct_event";         // test | project_red | needs_ariel | user_test_required

    private static final String PREFS = "control_tower_push";
    static final String PREF_TOKEN = "fcm_token";
    static final String PREF_TOKEN_REGISTERED = "fcm_token_registered";
    static final String PREF_PERMISSION_ASKED = "notif_permission_asked";

    private static final ExecutorService io = Executors.newSingleThreadExecutor();

    private PushNotifications() {}

    public static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** True only when a google-services.json was compiled in and Firebase initialised at startup. */
    public static boolean isFirebaseAvailable(Context context) {
        try {
            return BuildConfig.FIREBASE_CONFIGURED && !FirebaseApp.getApps(context).isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    public static boolean hasPermission(Context context) {
        if (Build.VERSION.SDK_INT < 33) return true;
        return context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    public static void ensureChannel(Context context) {
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription(context.getString(R.string.notification_channel_description));
        channel.enableVibration(true);
        nm.createNotificationChannel(channel);
    }

    /**
     * Called once the gateway is configured and the main screen exists:
     * create the channel, ask for permission on Android 13+ (once), and register the FCM token.
     */
    public static void onAppReady(Activity activity) {
        ensureChannel(activity);
        SharedPreferences p = prefs(activity);
        if (Build.VERSION.SDK_INT >= 33 && !hasPermission(activity) && !p.getBoolean(PREF_PERMISSION_ASKED, false)) {
            p.edit().putBoolean(PREF_PERMISSION_ASKED, true).apply();
            activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, PERMISSION_REQUEST);
        }
        refreshAndRegisterToken(activity);
    }

    public static void refreshAndRegisterToken(Context context) {
        if (!isFirebaseAvailable(context) || !Gateway.isConfigured(context)) return;
        try {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                if (!task.isSuccessful() || task.getResult() == null) return;
                registerToken(context, task.getResult());
            });
        } catch (Exception ignored) {
            // Firebase not initialised (no google-services.json) — push stays "not configured".
        }
    }

    /** Upsert the token in MobileDevices. Safe to call repeatedly; the gateway keys on the token. */
    public static void registerToken(Context context, String token) {
        if (token == null || token.isEmpty()) return;
        SharedPreferences p = prefs(context);
        String previous = p.getString(PREF_TOKEN, null);
        p.edit().putString(PREF_TOKEN, token).apply();
        if (!Gateway.isConfigured(context)) return;
        io.execute(() -> {
            try {
                JSONObject params = new JSONObject()
                        .put("token", token)
                        .put("device_id", Gateway.deviceId(context))
                        .put("device_label", Gateway.deviceLabel());
                Gateway.Result r = Gateway.call(context, "register_device", params);
                p.edit().putBoolean(PREF_TOKEN_REGISTERED, r.ok()).apply();
                if (r.ok() && previous != null && !previous.equals(token)) {
                    Gateway.call(context, "unregister_device", new JSONObject().put("token", previous));
                }
            } catch (Exception e) {
                p.edit().putBoolean(PREF_TOKEN_REGISTERED, false).apply();
            }
        });
    }

    /** Best-effort disconnect: remove the row in MobileDevices and drop the FCM token. */
    public static void unregister(Context context, Runnable then) {
        SharedPreferences p = prefs(context);
        String token = p.getString(PREF_TOKEN, null);
        io.execute(() -> {
            try {
                if (token != null && Gateway.isConfigured(context)) {
                    Gateway.call(context, "unregister_device", new JSONObject().put("token", token));
                }
            } catch (Exception ignored) {}
            try {
                if (isFirebaseAvailable(context)) FirebaseMessaging.getInstance().deleteToken();
            } catch (Exception ignored) {}
            p.edit().remove(PREF_TOKEN).putBoolean(PREF_TOKEN_REGISTERED, false).apply();
            if (context instanceof Activity) ((Activity) context).runOnUiThread(then);
            else then.run();
        });
    }

    /** Ask the gateway to send a bounded test push to registered Control Tower devices. */
    public static void requestTestPush(Context context, Consumer<String> onResult) {
        io.execute(() -> {
            Gateway.Result r = Gateway.call(context, "test_push", new JSONObject());
            String message;
            if (r.ok()) {
                if (!r.body.optBoolean("fcm_configured", true)) {
                    message = "השער עובד, אבל FCM_SERVICE_ACCOUNT_JSON עדיין לא הוגדר בסקריפט.";
                } else {
                    int sent = r.body.optInt("sent", 0);
                    int failed = r.body.optInt("failed", 0);
                    message = sent == 0 && failed == 0
                            ? "אין מכשירים רשומים בשער (MobileDevices ריק)."
                            : "נשלח ל-" + sent + " מכשירים" + (failed > 0 ? " (" + failed + " נכשלו)" : "");
                }
            } else {
                message = r.describe();
            }
            onResult.accept(message);
        });
    }

    /** Human-readable push state for the Activity tab. */
    public static String statusLine(Context context) {
        SharedPreferences p = prefs(context);
        if (!BuildConfig.FIREBASE_CONFIGURED) return "התראות: לא מוגדר (חסר google-services.json בבנייה)";
        if (!isFirebaseAvailable(context)) return "התראות: Firebase לא אותחל";
        if (!hasPermission(context)) return "התראות: הרשאה נדחתה במכשיר";
        if (p.getString(PREF_TOKEN, null) == null) return "התראות: ממתין לטוקן מ-FCM";
        return p.getBoolean(PREF_TOKEN_REGISTERED, false) ? "התראות: המכשיר רשום ב-MobileDevices" : "התראות: הטוקן טרם נרשם בשער";
    }

    /** Build and post a system notification; tapping it opens MainActivity with routing extras preserved. */
    public static void show(Context context, String title, String body, Map<String, String> data) {
        ensureChannel(context);
        if (!hasPermission(context)) return;
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (data != null) {
            if (data.get("target") != null) open.putExtra(EXTRA_TARGET, data.get("target"));
            if (data.get("project_id") != null) open.putExtra(EXTRA_PROJECT_ID, data.get("project_id"));
            if (data.get("event") != null) open.putExtra(EXTRA_EVENT, data.get("event"));
        }
        int requestCode = (int) (System.currentTimeMillis() & 0x7fffffff);
        PendingIntent pi = PendingIntent.getActivity(context, requestCode, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String safeTitle = title == null || title.isEmpty() ? context.getString(R.string.notification_default_title) : title;
        String safeBody = body == null || body.isEmpty() ? context.getString(R.string.notification_default_body) : body;
        Notification n = new Notification.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setColor(context.getColor(R.color.ct_accent))
                .setContentTitle(safeTitle)
                .setContentText(safeBody)
                .setStyle(new Notification.BigTextStyle().bigText(safeBody))
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_STATUS)
                .build();
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm != null) nm.notify(requestCode, n);
    }
}
