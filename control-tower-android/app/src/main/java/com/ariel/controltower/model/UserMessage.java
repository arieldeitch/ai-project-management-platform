package com.ariel.controltower.model;

import java.util.Locale;

/**
 * The human layer for failures. Ariel sees one short Hebrew management sentence ("האפליקציה תקועה — נדרשת ריצת תיקון");
 * the technical text (gateway error codes, HTTP status, exception names) is kept verbatim for the diagnostics
 * section and for agents. Never show {@link #technical} on a primary screen.
 */
public final class UserMessage {
    private UserMessage() {}

    public static final String FIX_RUN = "נדרשת ריצת תיקון ב-GPT/Claude";

    /** Gateway error code (body.error) or transport error text → short Hebrew for Ariel. */
    public static String human(String errorCode, String transportError, int httpCode) {
        String code = errorCode == null ? "" : errorCode.trim().toLowerCase(Locale.ROOT);
        String t = transportError == null ? "" : transportError;
        if (!t.isEmpty()) {
            if (t.contains("בזמן") || t.toLowerCase(Locale.ROOT).contains("timeout")) return "מגדל הפיקוח לא ענה בזמן — ננסה שוב ברקע";
            if (t.contains("רשת") || t.contains("להגיע")) return "אין חיבור לרשת — המידע השמור מוצג";
            if (t.contains("מוגדר")) return "האפליקציה עדיין לא חוברה למגדל הפיקוח";
            if (t.contains("דף") || t.contains("JSON")) return "החיבור למגדל הפיקוח שבור — " + FIX_RUN;
            return "האפליקציה נתקלה בבעיה — " + FIX_RUN;
        }
        switch (code) {
            case "": return httpCode == 0 ? "אין חיבור לרשת — המידע השמור מוצג" : "האפליקציה נתקלה בבעיה — " + FIX_RUN;
            case "unauthorized": return "החיבור למגדל הפיקוח נדחה — " + FIX_RUN;
            case "unknown_action": return "מגדל הפיקוח צריך עדכון — " + FIX_RUN;
            case "post_only": return "החיבור למגדל הפיקוח שבור — " + FIX_RUN;
            case "action_failed": return "הפעולה לא נשמרה — " + FIX_RUN;
            case "unknown_project_id": case "unknown project_id": return "הפרויקט לא נמצא בלוח";
            default: return "האפליקציה נתקלה בבעיה — " + FIX_RUN;
        }
    }

    /** Machine/diagnostic text: kept exactly, for the technical section and reports. */
    public static String technical(String errorCode, String transportError, int httpCode, String message) {
        StringBuilder sb = new StringBuilder();
        if (transportError != null && !transportError.isEmpty()) sb.append("transport: ").append(transportError);
        if (errorCode != null && !errorCode.isEmpty()) sb.append(sb.length() > 0 ? " · " : "").append("error=").append(errorCode);
        if (message != null && !message.isEmpty()) sb.append(sb.length() > 0 ? " · " : "").append(message);
        if (httpCode > 0) sb.append(sb.length() > 0 ? " · " : "").append("http ").append(httpCode);
        return sb.toString();
    }

    /** Human line for "the phone shows a saved copy" situations. */
    public static String staleCopy(String humanError) {
        return humanError == null || humanError.isEmpty() ? "מוצג עותק שמור" : humanError;
    }

    /** Guard used by tests and by the UI: primary-layer text must not carry technical vocabulary. */
    public static boolean isHumanLayer(String s) {
        if (s == null) return true;
        String l = s.toLowerCase(Locale.ROOT);
        String[] banned = {"token", "gateway_", "http", "json", "contract", "branch", "commit", "sha", "ci ", "lint", "test", "dogfood",
                "suite", "payload", "exception", "null", "error=", "unauthorized", "unknown_action", "post_only", "web app", "script",
                "fcm", "firebase", "mobiledevices", "os_", "status_bucket", "receipt", "version_drift", "never_seen", "access_failed"};
        for (String b : banned) if (l.contains(b)) return false;
        return true;
    }
}
