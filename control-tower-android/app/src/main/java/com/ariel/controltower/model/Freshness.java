package com.ariel.controltower.model;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * One deterministic freshness model for "last meaningful progress" against "expected cadence".
 *
 *   fresh    age <= cadence
 *   aging    cadence < age <= 2 x cadence
 *   stale    age > 2 x cadence
 *   unknown  no usable activity timestamp (NO_TIMESTAMP) or the cadence cannot be read (NO_CADENCE)
 *
 * An unreadable cadence never produces "stale": the app says so instead of guessing.
 * The cadence parser is deliberately small and bounded.
 */
public final class Freshness {
    public enum State { FRESH, AGING, STALE, UNKNOWN }
    public enum Reason { OK, NO_TIMESTAMP, NO_CADENCE }

    public static final long HOUR = 3_600_000L;
    public static final long DAY = 24 * HOUR;

    public final State state;
    public final Reason reason;
    public final long ageMillis;          // -1 when there is no timestamp
    public final long cadenceMillis;      // -1 when unreadable
    public final String cadenceLabel;     // Hebrew label, or "" when unreadable

    private Freshness(State state, Reason reason, long ageMillis, long cadenceMillis, String cadenceLabel) {
        this.state = state;
        this.reason = reason;
        this.ageMillis = ageMillis;
        this.cadenceMillis = cadenceMillis;
        this.cadenceLabel = cadenceLabel;
    }

    public static Freshness of(long lastProgressMillis, String expectedCadence, long now) {
        long cadence = parseCadenceMillis(expectedCadence);
        String label = cadence > 0 ? cadenceLabel(cadence) : "";
        if (lastProgressMillis <= 0) return new Freshness(State.UNKNOWN, Reason.NO_TIMESTAMP, -1, cadence, label);
        long age = Math.max(0, now - lastProgressMillis);
        if (cadence <= 0) return new Freshness(State.UNKNOWN, Reason.NO_CADENCE, age, -1, "");
        State s = age <= cadence ? State.FRESH : age <= 2 * cadence ? State.AGING : State.STALE;
        return new Freshness(s, Reason.OK, age, cadence, label);
    }

    /** True when the cadence text was absent or not understood. */
    public boolean cadenceUnknown() { return cadenceMillis <= 0; }

    private static final Pattern EVERY_N = Pattern.compile("(?:every|each|כל)\\s*(\\d+)\\s*(hour|hours|hr|hrs|day|days|week|weeks|month|months|שעות|שעה|ימים|יום|שבועות|שבוע|חודשים|חודש)");
    private static final Pattern N_PER = Pattern.compile("(\\d+)\\s*(?:x|times)?\\s*(?:/|per|a|בשבוע|ביום|בחודש)\\s*(week|day|month)?");

    /**
     * Bounded parser. Understands: hourly / every hour, twice daily, daily (incl. "daily while active",
     * weekdays), every N hours/days/weeks, Nx/week, weekly, biweekly, monthly, quarterly and the Hebrew
     * equivalents. Returns -1 for anything else ("as needed", "ad hoc", blanks, prose).
     */
    public static long parseCadenceMillis(String cadence) {
        if (cadence == null) return -1;
        String c = cadence.trim().toLowerCase(Locale.ROOT).replace('-', ' ').replaceAll("\\s+", " ");
        if (c.isEmpty()) return -1;
        if (c.contains("as needed") || c.contains("ad hoc") || c.contains("on demand") || c.contains("לפי צורך") || c.contains("לפי דרישה")) return -1;
        if (c.contains("hourly") || c.contains("every hour") || c.contains("each hour") || c.equals("שעתי") || c.contains("כל שעה")) return HOUR;
        if (c.contains("twice daily") || c.contains("twice a day") || c.contains("2x/day") || c.contains("2x day") || c.contains("2/day") || c.contains("פעמיים ביום")) return 12 * HOUR;
        if (c.contains("daily") || c.contains("every day") || c.contains("each day") || c.contains("weekday") || c.contains("יומי") || c.contains("כל יום")) return DAY;
        if (c.contains("biweekly") || c.contains("bi weekly") || c.contains("fortnight") || c.contains("every two weeks") || c.contains("דו שבועי") || c.contains("כל שבועיים")) return 14 * DAY;
        if (c.contains("weekly") || c.contains("every week") || c.contains("each week") || c.contains("שבועי") || c.contains("כל שבוע")) return 7 * DAY;
        if (c.contains("monthly") || c.contains("every month") || c.contains("each month") || c.contains("חודשי") || c.contains("כל חודש")) return 30 * DAY;
        if (c.contains("quarterly") || c.contains("רבעוני")) return 90 * DAY;
        Matcher m = EVERY_N.matcher(c);
        if (m.find()) {
            long n = Math.max(1, Long.parseLong(m.group(1)));
            String unit = m.group(2);
            if (unit.startsWith("hour") || unit.startsWith("hr") || unit.startsWith("שע")) return n * HOUR;
            if (unit.startsWith("day") || unit.startsWith("י")) return n * DAY;
            if (unit.startsWith("week") || unit.startsWith("שב")) return n * 7 * DAY;
            return n * 30 * DAY;
        }
        m = N_PER.matcher(c);
        if (m.find()) {
            long n = Math.max(1, Long.parseLong(m.group(1)));
            String unit = m.group(2) == null ? (c.contains("ביום") ? "day" : c.contains("בחודש") ? "month" : "week") : m.group(2);
            long base = unit.startsWith("day") ? DAY : unit.startsWith("month") ? 30 * DAY : 7 * DAY;
            return base / n;
        }
        return -1;
    }

    private static String cadenceLabel(long millis) {
        if (millis <= HOUR) return "שעתי";
        if (millis < DAY) return "כמה פעמים ביום";
        if (millis == DAY) return "יומי";
        if (millis < 7 * DAY) return "כל " + (millis / DAY) + " ימים";
        if (millis == 7 * DAY) return "שבועי";
        if (millis == 14 * DAY) return "דו-שבועי";
        if (millis < 30 * DAY) return "כל " + (millis / (7 * DAY)) + " שבועות";
        if (millis == 30 * DAY) return "חודשי";
        if (millis == 90 * DAY) return "רבעוני";
        return "כל " + (millis / DAY) + " ימים";
    }

    /** Hebrew sentence explaining the state; empty for fresh. Truthful about what is unknown. */
    public String note() {
        switch (state) {
            case UNKNOWN:
                return reason == Reason.NO_CADENCE
                        ? "קצב צפוי לא הוגדר בלוח — לא ניתן לקבוע אם המידע ישן"
                        : "אין חותמת פעילות עדכנית";
            case STALE: return "המידע ישן ביחס לקצב הצפוי (" + cadenceLabel + ")";
            case AGING: return "מתקרב לגבול הקצב הצפוי (" + cadenceLabel + ")";
            default: return "";
        }
    }

    public boolean isStale() { return state == State.STALE; }
}
