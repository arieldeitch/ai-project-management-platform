package com.ariel.controltower.model;

/**
 * Every Ariel-facing label that must fit a control lives here, so tests can assert it is Hebrew, short and
 * management-level. Screen code never invents primary-layer strings that are not in this file or in the enums.
 */
public final class Labels {
    private Labels() {}

    // Bottom navigation — one line each at 360 dp and font scale 1.3 (≤ 8 characters).
    public static final String[] NAV = {"עכשיו", "פרויקטים", "רעיונות", "סגן", "מערכת"};
    public static final String[] NAV_GLYPH = {"◉", "▤", "✦", "◆", "⚙"};
    public static final int NAV_MAX_CHARS = 8;

    // Screen titles
    public static final String TITLE_NOW = "מה דורש אותי עכשיו";
    public static final String TITLE_PROJECTS = "כל הפרויקטים";
    public static final String TITLE_IDEAS = "רעיונות";
    public static final String TITLE_DEPUTY = "סגן";
    public static final String TITLE_SYSTEM = "מערכת";

    // Top actions (≤ 10 characters so they never wrap next to a title)
    public static final String ACTION_REFRESH = "רענון";
    public static final String ACTION_BACK = "חזרה";
    public static final String ACTION_ALL_PROJECTS = "כל הפרויקטים";
    public static final String ACTION_NEW_IDEA = "רעיון חדש";
    public static final String ACTION_NEW_COMMAND = "פקודה";
    public static final String ACTION_CLOSE = "סגור";
    public static final String ACTION_CLEAR_FILTER = "נקה סינון";
    public static final String ACTION_LEGEND = "מה זה אומר";
    public static final String ACTION_LEGEND_CLOSE = "הסתר הסבר";
    public static final int ACTION_MAX_CHARS = 12;

    // Card signals (one per card at most)
    public static final String SIGNAL_WAITING_FOR_YOU = "מחכה לך";
    public static final String SIGNAL_BLOCKED = "חסום";
    public static final String SIGNAL_NEEDS_ATTENTION = "דורש התייחסות";
    public static final String SIGNAL_WATCH = "במעקב";
    public static final String SIGNAL_OK = "תקין";
    public static final String SIGNAL_NOT_UPDATED = "לא עודכן לאחרונה";
    public static final String SIGNAL_NOT_SYNCED = "לא מסונכרן";
    public static final String ACTION_OPEN = "פתח";
    public static final String SECTION_MACHINE = "מידע למערכת";
    public static final String MACHINE_NOTE = "לא נדרש לשימוש רגיל — מיועד ל-GPT, ל-Claude ולצ'יף";

    // Filters that are not statuses
    public static final String FILTER_STALE = "לא עודכן לאחרונה";
    public static final String FILTER_OS = "לא מסונכרן";

    // Sections
    public static final String SECTION_NEEDS_ME = "צריך אותי";
    public static final String SECTION_PORTFOLIO = "תמונת מצב";
    public static final String SECTION_MORE = "עוד פרטים";
    public static final String SECTION_OS = "סנכרון למערכת ההפעלה";
    public static final String SECTION_TECH = "פרטים טכניים";
    public static final String SECTION_EVIDENCE = "ראיות";
    public static final String SECTION_ALERTS = "התראות שנשלחו";
    public static final String SECTION_VERSION = "גרסה";
    public static final String SECTION_CONNECTION = "חיבור והתראות";

    // Calm / empty states
    public static final String CALM_NOTHING_NEEDS_ME = "אין כרגע משהו שמחכה לך";
    public static final String EMPTY_FILTER = "אין פרויקטים במסנן הזה";
    public static final String EMPTY_PROJECTS = "לא נמצאו פרויקטים בלוח";
    public static final String EMPTY_IDEAS = "עדיין אין רעיונות";
    public static final String EMPTY_DEPUTY = "אין כרגע משהו שמחכה לטיפול";
    public static final String EMPTY_ALERTS = "עדיין לא נשלחו התראות";
    public static final String LOADING = "טוען…";
    public static final String REFRESHING = "מתעדכן…";

    // Row vocabulary
    public static final String NEXT = "הבא";
    public static final String WHY = "למה";
    public static final String UPDATED = "עודכן";
    public static final String NO_UPDATE = "לא התקבל עדכון";
    public static final String NEEDS_YOU_HEADER = "מה צריך ממך";

    /** Human summary line for the Now screen: "6 פרויקטים · 4 תקינים · 2 צריכים אותך". */
    public static String portfolioSummary(int total, int ok, int needsMe, int blocked, int atRisk) {
        StringBuilder sb = new StringBuilder(total + " פרויקטים");
        if (ok > 0) sb.append(" · ").append(ok).append(" תקינים");
        if (needsMe > 0) sb.append(" · ").append(needsMe == 1 ? "אחד צריך אותך" : needsMe + " צריכים אותך");
        if (blocked > 0) sb.append(" · ").append(blocked == 1 ? "אחד חסום" : blocked + " חסומים");
        if (atRisk > 0) sb.append(" · ").append(atRisk == 1 ? "אחד דורש טיפול" : atRisk + " דורשים טיפול");
        return sb.toString();
    }

    /** "2 פרויקטים לא מסונכרנים למערכת ההפעלה" / "כל הפרויקטים מסונכרנים" */
    public static String osSummary(int total, int aligned) {
        if (total == 0) return "";
        int n = total - aligned;
        if (n == 0) return "כל הפרויקטים מסונכרנים למערכת ההפעלה";
        return (n == 1 ? "פרויקט אחד לא מסונכרן" : n + " פרויקטים לא מסונכרנים") + " למערכת ההפעלה";
    }

    /** "3 פריטים פתוחים אצל הסגן" */
    public static String deputySummary(int open) {
        if (open <= 0) return "אין פריטים פתוחים אצל הסגן";
        return (open == 1 ? "פריט אחד פתוח" : open + " פריטים פתוחים") + " אצל הסגן";
    }
}
