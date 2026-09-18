package com.ariel.controltower.model;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * One deterministic freshness model for "last meaningful progress" against "expected cadence".
 *
 *   fresh   age <= cadence
 *   aging   cadence < age <= 2 x cadence
 *   stale   age > 2 x cadence
 *   unknown no usable activity timestamp
 *
 * The cadence parser is deliberately small. When it cannot read the cadence it falls back to
 * weekly and says so ({@link #cadenceAssumed}), instead of pretending certainty.
 */
public final class Freshness {
    public enum State { FRESH, AGING, STALE, UNKNOWN }

    public static final long HOUR = 3_600_000L;
    public static final long DAY = 24 * HOUR;
    public static final long FALLBACK_CADENCE = 7 * DAY;

    public final State state;
    public final long ageMillis;          // -1 when unknown
    public final long cadenceMillis;      // effective cadence used
    public final boolean cadenceAssumed;  // true when the fallback was used
    public final String cadenceLabel;     // Hebrew label of the effective cadence

    private Freshness(State state, long ageMillis, long cadenceMillis, boolean cadenceAssumed, String cadenceLabel) {
        this.state = state;
        this.ageMillis = ageMillis;
        this.cadenceMillis = cadenceMillis;
        this.cadenceAssumed = cadenceAssumed;
        this.cadenceLabel = cadenceLabel;
    }

    public static Freshness of(long lastProgressMillis, String expectedCadence, long now) {
        long cadence = parseCadenceMillis(expectedCadence);
        boolean assumed = cadence <= 0;
        long effective = assumed ? FALLBACK_CADENCE : cadence;
        String label = assumed ? "שבועי (הנחה)" : cadenceLabel(expectedCadence, effective);
        if (lastProgressMillis <= 0) return new Freshness(State.UNKNOWN, -1, effective, assumed, label);
        long age = Math.max(0, now - lastProgressMillis);
        State s = age <= effective ? State.FRESH : age <= 2 * effective ? State.AGING : State.STALE;
        return new Freshness(s, age, effective, assumed, label);
    }

    private static final Pattern EVERY_N = Pattern.compile("(?:every|כל)\\s*(\\d+)\\s*(hour|hours|day|days|week|weeks|month|months|שעות|שעה|ימים|יום|שבועות|שבוע|חודשים|חודש)");
    private static final Pattern N_PER = Pattern.compile("(\\d+)\\s*x?\\s*(?:/|per|a|בשבוע|ביום|בחודש)\\s*(week|day|month)?");

    /** Bounded parser: daily/weekly/biweekly/monthly, "every 3 days", "2x/week", Hebrew equivalents. -1 if unreadable. */
    public static long parseCadenceMillis(String cadence) {
        if (cadence == null) return -1;
        String c = cadence.trim().toLowerCase(Locale.ROOT);
        if (c.isEmpty()) return -1;
        if (c.contains("hourly") || c.equals("שעתי")) return HOUR;
        if (c.contains("twice a day") || c.contains("2x/day") || c.contains("פעמיים ביום")) return 12 * HOUR;
        if (c.contains("daily") || c.contains("every day") || c.contains("weekday") || c.contains("יומי") || c.contains("כל יום")) return DAY;
        if (c.contains("biweekly") || c.contains("bi-weekly") || c.contains("fortnight") || c.contains("דו שבועי") || c.contains("דו-שבועי") || c.contains("כל שבועיים")) return 14 * DAY;
        if (c.contains("weekly") || c.contains("every week") || c.contains("שבועי") || c.contains("כל שבוע")) return 7 * DAY;
        if (c.contains("monthly") || c.contains("every month") || c.contains("חודשי") || c.contains("כל חודש")) return 30 * DAY;
        if (c.contains("quarterly") || c.contains("רבעוני")) return 90 * DAY;
        Matcher m = EVERY_N.matcher(c);
        if (m.find()) {
            long n = Long.parseLong(m.group(1));
            String unit = m.group(2);
            if (unit.startsWith("hour") || unit.startsWith("שע")) return n * HOUR;
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

    private static String cadenceLabel(String raw, long millis) {
        if (millis <= HOUR) return "שעתי";
        if (millis < DAY) return "כמה פעמים ביום";
        if (millis == DAY) return "יומי";
        if (millis < 7 * DAY) return "כל " + (millis / DAY) + " ימים";
        if (millis == 7 * DAY) return "שבועי";
        if (millis == 14 * DAY) return "דו-שבועי";
        if (millis < 30 * DAY) return "כל " + (millis / (7 * DAY)) + " שבועות";
        if (millis == 30 * DAY) return "חודשי";
        if (millis == 90 * DAY) return "רבעוני";
        return raw == null ? "" : raw.trim();
    }

    /** Hebrew sentence for the stale/unknown states; empty for fresh. */
    public String note() {
        switch (state) {
            case UNKNOWN: return "אין חותמת פעילות עדכנית";
            case STALE: return "המידע ישן ביחס לקצב הצפוי (" + cadenceLabel + ")";
            case AGING: return "מתקרב לגבול הקצב הצפוי (" + cadenceLabel + ")";
            default: return "";
        }
    }

    public boolean isStale() { return state == State.STALE; }
}
