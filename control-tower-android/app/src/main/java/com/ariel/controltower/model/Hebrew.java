package com.ariel.controltower.model;

import java.util.Locale;

/**
 * Presentation-layer Hebrew for operational status. Raw board enums never reach primary screens.
 * Proper names (project names) are left untouched.
 */
public final class Hebrew {
    private Hebrew() {}

    private static String norm(String s) {
        return s == null ? "" : s.trim().toUpperCase(Locale.ROOT).replace('_', ' ').replaceAll("\\s+", " ");
    }

    /** RED → "אדום", YELLOW/AMBER → "צהוב", GREEN → "ירוק", other → "לא ידוע". */
    public static String rag(String rag) {
        switch (norm(rag)) {
            case "RED": return "אדום";
            case "GREEN": return "ירוק";
            case "YELLOW": case "AMBER": return "צהוב";
            default: return "לא ידוע";
        }
    }

    /** What the colour means for Ariel: "דורש טיפול" / "במעקב" / "תקין". */
    public static String ragMeaning(String rag) {
        switch (norm(rag)) {
            case "RED": return "דורש טיפול";
            case "GREEN": return "תקין";
            case "YELLOW": case "AMBER": return "במעקב";
            default: return "סטטוס לא ידוע";
        }
    }

    /** Combined badge text: "אדום · דורש טיפול". */
    public static String ragBadge(String rag) {
        return rag(rag) + " · " + ragMeaning(rag);
    }

    public static String confidence(String confidence) {
        switch (norm(confidence)) {
            case "HIGH": case "H": return "גבוהה";
            case "MEDIUM": case "MED": case "M": return "בינונית";
            case "LOW": case "L": return "נמוכה";
            case "": return "";
            default: return confidence.trim();
        }
    }

    /** Lifecycle / stage. Unknown values are shown as-is (they may be Hebrew already). */
    public static String lifecycle(String lifecycle) {
        String n = norm(lifecycle);
        if (n.isEmpty()) return "";
        if (n.contains("USER TEST")) return "מחכה לבדיקה שלך";
        switch (n) {
            case "ACTIVE": case "IN PROGRESS": case "RUNNING": return "פעיל";
            case "BLOCKED": return "חסום";
            case "WAITING": case "PENDING": case "ON HOLD": case "PAUSED": return "ממתין";
            case "FAILED": case "ERROR": return "נכשל";
            case "DONE": case "COMPLETED": case "COMPLETE": return "הושלם";
            case "DRAFT": case "IDEA": return "טיוטה";
            case "SCOPED": case "PLANNED": return "מתוכנן";
            case "TESTING": return "בבדיקות";
            case "DEPLOYED": case "LIVE": return "באוויר";
            case "ARCHIVED": case "DEFERRED": return "בהמתנה";
            default: return lifecycle.trim();
        }
    }

    /** Inbox / command status. */
    public static String inboxStatus(String status) {
        switch (norm(status)) {
            case "REPORTED": return "דווח · ממתין לאימות";
            case "VERIFIED": return "אומת";
            case "IN PROGRESS": case "RUNNING": return "בביצוע";
            case "DONE": case "COMPLETED": return "הושלם";
            case "NEEDS DECISION": return "דורש החלטה";
            case "REJECTED": case "FAILED": return "נדחה";
            case "BLOCKED": return "חסום";
            case "WAITING": return "ממתין";
            case "": return "התקבל";
            default: return status.trim();
        }
    }

    public static String inboxSource(String source) {
        switch (source == null ? "" : source.trim()) {
            case "share": return "שיתוף";
            case "deputy_command": return "פקודה";
            default: return "ידני";
        }
    }

    public static String pushEvent(String event) {
        if (event == null || event.isEmpty()) return "אירוע";
        return event.replace("project_red", "הפך לאדום")
                .replace("needs_ariel", "צריך אותך")
                .replace("user_test_required", "מחכה לבדיקה שלך")
                .replace("test", "בדיקת התראות")
                .replace("+", " + ");
    }

    public static String freshness(Freshness.State state) {
        switch (state) {
            case FRESH: return "עדכני";
            case AGING: return "מתיישן";
            case STALE: return "ישן";
            default: return "לא ידוע";
        }
    }
}
