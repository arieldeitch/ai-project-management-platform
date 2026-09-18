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

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Push readiness for Control Tower: notification channel, Android 13+ permission,
 * FCM token lifecycle and owner-scoped token registration in Supabase.
 *
 * Nothing here weakens auth: the token row is written with the owner's own JWT and
 * the table is RLS-scoped to auth.uid() (see supabase/migrations/*_control_push_tokens.sql).
 */
public final class PushNotifications {
    public static final String CHANNEL_ID = "control_tower_alerts";
    public static final int PERMISSION_REQUEST = 4101;

    /** Intent extras preserved from the push payload for (future) deep-link routing. */
    public static final String EXTRA_TARGET = "ct_target";       // now | projects | deputy | activity
    public static final String EXTRA_PROJECT_ID = "ct_project_id";
    public static final String EXTRA_EVENT = "ct_event";         // test | project_red | needs_ariel | ...

    static final String PREF_TOKEN = "fcm_token";
    static final String PREF_TOKEN_REGISTERED = "fcm_token_registered";
    static final String PREF_PERMISSION_ASKED = "notif_permission_asked";

    private static final ExecutorService io = Executors.newSingleThreadExecutor();

    private PushNotifications() {}

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
     * Called once the owner is authenticated and the main screen exists:
     * create the channel, ask for permission on Android 13+ (once), and register the FCM token.
     */
    public static void onSessionReady(Activity activity, SharedPreferences prefs) {
        ensureChannel(activity);
        if (Build.VERSION.SDK_INT >= 33 && !hasPermission(activity) && !prefs.getBoolean(PREF_PERMISSION_ASKED, false)) {
            prefs.edit().putBoolean(PREF_PERMISSION_ASKED, true).apply();
            activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, PERMISSION_REQUEST);
        }
        refreshAndRegisterToken(activity, prefs);
    }

    public static void refreshAndRegisterToken(Context context, SharedPreferences prefs) {
        if (!isFirebaseAvailable(context)) return;
        if (prefs.getString("access_token", null) == null) return;
        try {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                if (!task.isSuccessful() || task.getResult() == null) return;
                registerToken(context, prefs, task.getResult());
            });
        } catch (Exception ignored) {
            // Firebase not initialised (no google-services.json) — push stays "not configured".
        }
    }

    /** Upsert the token for the authenticated owner. Safe to call repeatedly; keyed on the token itself. */
    public static void registerToken(Context context, SharedPreferences prefs, String token) {
        if (token == null || token.isEmpty()) return;
        String previous = prefs.getString(PREF_TOKEN, null);
        prefs.edit().putString(PREF_TOKEN, token).apply();
        if (prefs.getString("access_token", null) == null) return; // only registered for a logged-in owner
        io.execute(() -> {
            try {
                JSONObject row = new JSONObject()
                        .put("token", token)
                        .put("platform", "android")
                        .put("app_version", BuildConfig.VERSION_NAME + "+" + BuildConfig.VERSION_CODE)
                        .put("build_sha", BuildConfig.GIT_SHA)
                        .put("device_label", (Build.MANUFACTURER + " " + Build.MODEL).trim());
                // last_seen_at / updated_at are maintained by the table trigger, not the client.
                Response r = authedRequest(prefs, "POST", "/rest/v1/control_push_tokens?on_conflict=token", row.toString(),
                        "resolution=merge-duplicates,return=minimal");
                boolean ok = r.ok();
                prefs.edit().putBoolean(PREF_TOKEN_REGISTERED, ok).apply();
                if (ok && previous != null && !previous.equals(token)) {
                    authedRequest(prefs, "DELETE", "/rest/v1/control_push_tokens?token=eq." + java.net.URLEncoder.encode(previous, "UTF-8"), null, "return=minimal");
                }
            } catch (Exception e) {
                prefs.edit().putBoolean(PREF_TOKEN_REGISTERED, false).apply();
            }
        });
    }

    /** Best-effort removal on logout: delete the row (while we still hold the JWT) and drop the FCM token. */
    public static void unregisterOnLogout(Context context, SharedPreferences prefs, Runnable then) {
        String token = prefs.getString(PREF_TOKEN, null);
        String access = prefs.getString("access_token", null);
        if (token == null || access == null) {
            then.run();
            return;
        }
        io.execute(() -> {
            try {
                authedRequest(prefs, "DELETE", "/rest/v1/control_push_tokens?token=eq." + java.net.URLEncoder.encode(token, "UTF-8"), null, "return=minimal");
            } catch (Exception ignored) {}
            try {
                if (isFirebaseAvailable(context)) FirebaseMessaging.getInstance().deleteToken();
            } catch (Exception ignored) {}
            if (context instanceof Activity) ((Activity) context).runOnUiThread(then);
            else then.run();
        });
    }

    /** Ask the owner-only Edge Function to send a bounded test push to this owner's devices. */
    public static void requestTestPush(SharedPreferences prefs, java.util.function.Consumer<String> onResult) {
        io.execute(() -> {
            String message;
            try {
                JSONObject body = new JSONObject().put("mode", "test");
                Response r = authedRequest(prefs, "POST", "/functions/v1/control-tower-push", body.toString(), null);
                if (r.ok()) {
                    JSONObject o = new JSONObject(r.body.isEmpty() ? "{}" : r.body);
                    message = "נשלח ל-" + o.optInt("sent", 0) + " מכשירים" + (o.optInt("failed", 0) > 0 ? " (" + o.optInt("failed") + " נכשלו)" : "");
                } else if (r.code == 404) {
                    message = "פונקציית השרת control-tower-push עדיין לא פרוסה.";
                } else if (r.code == 401 || r.code == 403) {
                    message = "השרת דחה את הבקשה (" + r.code + "). בדוק הרשאת בעלים.";
                } else {
                    message = "השליחה נכשלה (" + r.code + ").";
                }
            } catch (Exception e) {
                message = "לא ניתן להגיע לשרת ההתראות.";
            }
            onResult.accept(message);
        });
    }

    /** Human-readable push state for the Activity tab. */
    public static String statusLine(Context context, SharedPreferences prefs) {
        if (!BuildConfig.FIREBASE_CONFIGURED) return "התראות: לא מוגדר (חסר google-services.json בבנייה)";
        if (!isFirebaseAvailable(context)) return "התראות: Firebase לא אותחל";
        if (!hasPermission(context)) return "התראות: הרשאה נדחתה במכשיר";
        if (prefs.getString(PREF_TOKEN, null) == null) return "התראות: ממתין לטוקן מ-FCM";
        return prefs.getBoolean(PREF_TOKEN_REGISTERED, false) ? "התראות: המכשיר רשום" : "התראות: הטוקן טרם נרשם בשרת";
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

    // ---- minimal authenticated HTTP (mirrors MainActivity.raw; refreshes once on 401) ----

    private static Response authedRequest(SharedPreferences prefs, String method, String path, String body, String prefer) throws Exception {
        Response r = raw(prefs, method, path, body, prefer, true);
        if (r.code == 401 && refreshSession(prefs)) r = raw(prefs, method, path, body, prefer, true);
        return r;
    }

    private static boolean refreshSession(SharedPreferences prefs) {
        try {
            String refresh = prefs.getString("refresh_token", null);
            if (refresh == null) return false;
            JSONObject p = new JSONObject().put("refresh_token", refresh);
            Response r = raw(prefs, "POST", "/auth/v1/token?grant_type=refresh_token", p.toString(), null, false);
            if (!r.ok()) return false;
            JSONObject o = new JSONObject(r.body);
            String access = o.optString("access_token", "");
            if (access.isEmpty()) return false;
            prefs.edit().putString("access_token", access).putString("refresh_token", o.optString("refresh_token", refresh)).apply();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private static Response raw(SharedPreferences prefs, String method, String path, String body, String prefer, boolean authenticated) throws Exception {
        URL url = new URL(BuildConfig.SUPABASE_URL + path);
        HttpURLConnection c = (HttpURLConnection) url.openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(20000);
        c.setRequestMethod(method);
        c.setRequestProperty("apikey", BuildConfig.SUPABASE_KEY);
        c.setRequestProperty("Accept", "application/json");
        if (prefer != null) c.setRequestProperty("Prefer", prefer);
        if (authenticated) {
            String access = prefs.getString("access_token", null);
            if (access != null) c.setRequestProperty("Authorization", "Bearer " + access);
        }
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

    private static final class Response {
        final int code;
        final String body;
        Response(int code, String body) { this.code = code; this.body = body == null ? "" : body; }
        boolean ok() { return code >= 200 && code < 300; }
    }
}
