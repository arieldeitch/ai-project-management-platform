package com.ariel.controltower.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * "What is installed on this device" vs "what is the newest build in the repository".
 * Installed identity comes from BuildConfig (set by CI). The newest build comes from the public
 * repository's last successful APK workflow run (GitHub API, anonymous) — parsed here, fetched elsewhere.
 * Nothing is invented: any field without a trustworthy source stays empty.
 */
public final class BuildIdentity {
    public final String versionName;
    public final int versionCode;
    public final String sha;        // short
    public final String ref;        // branch / ref
    public final long builtAtMillis; // -1 when unknown

    public BuildIdentity(String versionName, int versionCode, String sha, String ref, long builtAtMillis) {
        this.versionName = versionName == null ? "" : versionName;
        this.versionCode = versionCode;
        this.sha = sha == null ? "" : (sha.length() > 12 ? sha.substring(0, 12) : sha);
        this.ref = ref == null ? "" : ref;
        this.builtAtMillis = builtAtMillis;
    }

    /** Parse the JSON of GET /repos/{o}/{r}/actions/runs?status=success&per_page=1 (+ optional versionName). */
    public static BuildIdentity fromWorkflowRuns(String runsJson, String buildGradle) {
        try {
            JSONObject root = new JSONObject(runsJson);
            JSONArray runs = root.optJSONArray("workflow_runs");
            if (runs == null || runs.length() == 0) return null;
            JSONObject run = runs.getJSONObject(0);
            String sha = run.optString("head_sha", "");
            String ref = run.optString("head_branch", "");
            long at = TimeText.parse(run.optString("updated_at", run.optString("created_at", "")));
            String name = versionNameFromGradle(buildGradle);
            int code = versionCodeFromGradle(buildGradle);
            return new BuildIdentity(name, code, sha, ref, at);
        } catch (Exception e) {
            return null;
        }
    }

    private static final Pattern NAME = Pattern.compile("versionName\\s+'([^']+)'");
    private static final Pattern CODE = Pattern.compile("versionCode\\s+(\\d+)");

    public static String versionNameFromGradle(String gradle) {
        if (gradle == null) return "";
        Matcher m = NAME.matcher(gradle);
        return m.find() ? m.group(1) : "";
    }

    public static int versionCodeFromGradle(String gradle) {
        if (gradle == null) return -1;
        Matcher m = CODE.matcher(gradle);
        return m.find() ? Integer.parseInt(m.group(1)) : -1;
    }

    /** True when the newest build is a later versionCode than the installed one. */
    public boolean isNewerThan(BuildIdentity installed) {
        if (installed == null) return false;
        if (versionCode > 0 && installed.versionCode > 0) return versionCode > installed.versionCode;
        return !sha.isEmpty() && !installed.sha.isEmpty() && !sha.equals(installed.sha) && builtAtMillis > installed.builtAtMillis;
    }

    /** Compact Hebrew line: "0.10.0 (11) · commit 56a0be30 · 19/09/2026 08:40". */
    public String line(long now) {
        StringBuilder sb = new StringBuilder();
        if (!versionName.isEmpty()) sb.append(versionName);
        if (versionCode > 0) sb.append(" (").append(versionCode).append(")");
        if (!sha.isEmpty()) sb.append(sb.length() > 0 ? " · " : "").append("commit ").append(sha.length() > 8 ? sha.substring(0, 8) : sha);
        if (builtAtMillis > 0) sb.append(" · ").append(TimeText.wall(builtAtMillis, now));
        return sb.toString();
    }
}
