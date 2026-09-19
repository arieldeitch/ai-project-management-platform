package com.ariel.controltower;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;

import com.ariel.controltower.model.BuildIdentity;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * The only network path of the app: POST JSON to the Apps Script gateway in front of
 * PROJECT_CONTROL_BOARD. Configuration comes from the build (CT_GATEWAY_URL / CT_GATEWAY_TOKEN)
 * and may be overridden on-device from the setup screen (stored in private SharedPreferences).
 *
 * The shared token is a private-sideload compromise: it can be extracted from the APK and
 * is not a multi-user auth design. Rotate it in the gateway + rebuild if the phone/APK leaks.
 */
public final class Gateway {
    public static final String PREFS = "control_tower_gateway";
    private static final String PREF_URL = "gateway_url";
    private static final String PREF_TOKEN = "gateway_token";

    private Gateway() {}

    public static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static String url(Context context) {
        String override = prefs(context).getString(PREF_URL, "");
        return override.isEmpty() ? BuildConfig.GATEWAY_URL : override;
    }

    public static String token(Context context) {
        String override = prefs(context).getString(PREF_TOKEN, "");
        return override.isEmpty() ? BuildConfig.GATEWAY_TOKEN : override;
    }

    /** https only — except a review build, which may talk to a fixture gateway on the host machine. */
    private static boolean acceptableUrl(String u) {
        if (u.startsWith("https://")) return true;
        return BuildConfig.REVIEW_BUILD && u.startsWith("http://10.0.2.2");
    }

    public static boolean isConfigured(Context context) {
        return acceptableUrl(url(context)) && token(context).length() >= 32;
    }

    public static boolean isBuildConfigured() {
        return acceptableUrl(BuildConfig.GATEWAY_URL) && BuildConfig.GATEWAY_TOKEN.length() >= 32;
    }

    /** Store an on-device override (empty values clear it and fall back to the build values). */
    public static void saveOverride(Context context, String url, String token) {
        prefs(context).edit().putString(PREF_URL, url == null ? "" : url.trim()).putString(PREF_TOKEN, token == null ? "" : token.trim()).apply();
    }

    public static String deviceId(Context context) {
        String id = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ANDROID_ID);
        return id == null ? "unknown" : id;
    }

    public static String deviceLabel() {
        return (Build.MANUFACTURER + " " + Build.MODEL).trim();
    }

    public static String appVersion() {
        return BuildConfig.VERSION_NAME + "+" + BuildConfig.VERSION_CODE + " (" + BuildConfig.GIT_SHA + ")";
    }

    /** Result of one gateway call. {@code ok} is true only for HTTP 2xx AND body.ok == true. */
    public static final class Result {
        public final int httpCode;
        public final JSONObject body;
        public final String error;

        public Result(int httpCode, JSONObject body, String error) {
            this.httpCode = httpCode;
            this.body = body == null ? new JSONObject() : body;
            this.error = error;
        }

        public boolean ok() { return error == null && body.optBoolean("ok", false); }

        /** Hebrew, user-facing explanation for the Activity/Share screens. */
        public String describe() {
            if (ok()) return "תקין";
            if (error != null) return error;
            String code = body.optString("error", "");
            switch (code) {
                case "unauthorized": return "השער דחה את הטוקן. בדוק GATEWAY_TOKEN.";
                case "unknown_action": return "השער אינו מכיר את הפעולה (גרסת סקריפט ישנה?).";
                case "post_only": return "כתובת השער אינה פריסת Web App תקינה.";
                case "action_failed": return "הפעולה נכשלה בשער: " + body.optString("message", "");
                default: return code.isEmpty() ? "תגובה לא צפויה מהשער (" + httpCode + ")." : code;
            }
        }
    }

    /** Blocking. Call from a background thread. */
    public static Result call(Context context, String action, JSONObject params) {
        if (!isConfigured(context)) return new Result(0, null, "השער אינו מוגדר.");
        try {
            JSONObject payload = params == null ? new JSONObject() : params;
            payload.put("token", token(context));
            payload.put("action", action);
            payload.put("app_version", appVersion());
            String raw = postFollowingRedirect(url(context), payload.toString());
            String text = raw.trim();
            if (!text.startsWith("{")) {
                // Apps Script returns an HTML page when the deployment is wrong or not authorised.
                return new Result(200, null, "השער החזיר דף במקום JSON. בדוק שהפריסה היא Web App עם גישה 'Anyone'.");
            }
            return new Result(200, new JSONObject(text), null);
        } catch (java.net.SocketTimeoutException e) {
            return new Result(0, null, "השער לא ענה בזמן.");
        } catch (Exception e) {
            return new Result(0, null, "לא ניתן להגיע לשער. בדוק חיבור לרשת.");
        }
    }


    /**
     * Newest successful APK build of the public repository, read anonymously from the GitHub API
     * (no token, no auth). Returns null on any failure — the UI then says "not available" rather than guessing.
     */
    public static BuildIdentity latestBuild(String repo, String branch) {
        try {
            String runs = getText("https://api.github.com/repos/" + repo + "/actions/workflows/control-tower-apk.yml/runs?branch=" + branch + "&status=success&per_page=1");
            BuildIdentity partial = BuildIdentity.fromWorkflowRuns(runs, null);
            if (partial == null) return null;
            String gradle = "";
            try {
                gradle = getText("https://raw.githubusercontent.com/" + repo + "/" + partial.sha + "/control-tower-android/app/build.gradle");
            } catch (Exception ignored) {}
            return BuildIdentity.fromWorkflowRuns(runs, gradle);
        } catch (Exception e) {
            return null;
        }
    }

    private static String getText(String url) throws Exception {
        HttpURLConnection c = open(url, "GET");
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("Accept", "application/vnd.github+json, text/plain, */*");
        c.setRequestProperty("User-Agent", "ControlTower/" + appVersion());
        int code = c.getResponseCode();
        InputStream in = code >= 200 && code < 400 ? c.getInputStream() : c.getErrorStream();
        StringBuilder sb = new StringBuilder();
        if (in != null) {
            try (BufferedReader br = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
                String line;
                while ((line = br.readLine()) != null) sb.append(line).append('\n');
            }
        }
        c.disconnect();
        if (code < 200 || code >= 300) throw new IllegalStateException("http " + code);
        return sb.toString();
    }

    /**
     * Apps Script answers a POST with a 302 to a one-time googleusercontent URL that must be fetched
     * with GET. HttpURLConnection will not do that cross-host for us reliably, so we do it by hand.
     */
    private static String postFollowingRedirect(String url, String body) throws Exception {
        HttpURLConnection c = open(url, "POST");
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        try (OutputStream os = c.getOutputStream()) {
            os.write(body.getBytes(StandardCharsets.UTF_8));
        }
        int code = c.getResponseCode();
        int hops = 0;
        while ((code == 301 || code == 302 || code == 303 || code == 307) && hops < 3) {
            String location = c.getHeaderField("Location");
            c.disconnect();
            if (location == null || !acceptableUrl(location)) throw new IllegalStateException("bad redirect");
            c = open(location, "GET");
            code = c.getResponseCode();
            hops++;
        }
        InputStream in = code >= 200 && code < 400 ? c.getInputStream() : c.getErrorStream();
        StringBuilder sb = new StringBuilder();
        if (in != null) {
            try (BufferedReader br = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
                String line;
                while ((line = br.readLine()) != null) sb.append(line).append('\n');
            }
        }
        c.disconnect();
        if (code < 200 || code >= 300) throw new IllegalStateException("http " + code);
        return sb.toString();
    }

    private static HttpURLConnection open(String url, String method) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setInstanceFollowRedirects(false);
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setRequestMethod(method);
        c.setRequestProperty("Accept", "application/json");
        return c;
    }
}
