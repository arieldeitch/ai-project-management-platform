package com.ariel.controltower.model;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Israel-format absolute timestamps and Hebrew relative ages. Pure Java, no Android imports. */
public final class TimeText {
    public static final ZoneId ISRAEL = ZoneId.of("Asia/Jerusalem");
    private static final DateTimeFormatter ABSOLUTE = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", Locale.ROOT);
    private static final Pattern DMY = Pattern.compile("^(\\d{1,2})[/.\\-](\\d{1,2})[/.\\-](\\d{4})(?:[ T,]+(\\d{1,2}):(\\d{2}))?(?!\\d)");
    private static final Pattern YMD = Pattern.compile("^(\\d{4})-(\\d{2})-(\\d{2})(?:[ T](\\d{1,2}):(\\d{2})(?::\\d{2})?)?(?!\\d)");
    private static final Pattern ISO_ZONED = Pattern.compile("^(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d+)?)?(?:Z|[+\\-]\\d{2}:?\\d{2}))");
    /** One leading status word is tolerated ("VERIFIED 2026-09-17 08:07: …"); prose is never a timestamp. */
    private static final Pattern STATUS_PREFIX = Pattern.compile("^(?:(?:VERIFIED|REPORTED|DONE|CHECKED|UPDATED|OK|מאומת|דווח)(?=[\\s:\\-–—])[\\s:\\-–—]*)?", Pattern.CASE_INSENSITIVE);

    private TimeText() {}

    /**
     * Accepted, anchored at the start (after at most one status word): ISO-8601 with zone,
     * YYYY-MM-DD[ HH:mm] and DD/MM/YYYY[ HH:mm] as Israel wall clock. Anything else → -1.
     */
    public static long parse(String value) {
        if (value == null) return -1;
        String s = STATUS_PREFIX.matcher(value.trim()).replaceFirst("");
        if (s.isEmpty()) return -1;
        Matcher m = ISO_ZONED.matcher(s);
        if (m.find()) {
            try {
                return ZonedDateTime.parse(m.group(1).replaceAll("([+\\-]\\d{2})(\\d{2})$", "$1:$2")).toInstant().toEpochMilli();
            } catch (Exception ignored) {}
            try {
                return Instant.parse(m.group(1)).toEpochMilli();
            } catch (Exception ignored) {}
        }
        m = YMD.matcher(s);
        if (m.find()) return wallClock(m.group(1), m.group(2), m.group(3), m.group(4), m.group(5));
        m = DMY.matcher(s);
        if (m.find()) return wallClock(m.group(3), m.group(2), m.group(1), m.group(4), m.group(5));
        return -1;
    }

    private static long wallClock(String y, String mo, String d, String h, String mi) {
        try {
            return ZonedDateTime.of(Integer.parseInt(y), Integer.parseInt(mo), Integer.parseInt(d),
                    h == null ? 0 : Integer.parseInt(h), mi == null ? 0 : Integer.parseInt(mi), 0, 0, ISRAEL).toInstant().toEpochMilli();
        } catch (Exception e) {
            return -1;
        }
    }

    /** Unicode isolates so a date/time keeps its LTR order inside Hebrew sentences. */
    public static final String LRI = String.valueOf((char) 0x2066); // LEFT-TO-RIGHT ISOLATE
    public static final String PDI = String.valueOf((char) 0x2069); // POP DIRECTIONAL ISOLATE

    /** "18/09/2026 14:23" in Israel time, bidi-isolated so it never flips inside RTL text. */
    public static String absolute(long millis) {
        if (millis <= 0) return "";
        return LRI + ABSOLUTE.format(Instant.ofEpochMilli(millis).atZone(ISRAEL)) + PDI;
    }

    /** Same as {@link #absolute} without isolate marks (for tests / LTR-only views). */
    public static String absolutePlain(long millis) {
        if (millis <= 0) return "";
        return ABSOLUTE.format(Instant.ofEpochMilli(millis).atZone(ISRAEL));
    }

    /** Hebrew relative age such as "לפני 42 דקות". Future timestamps read "עכשיו". */
    public static String relative(long millis, long now) {
        if (millis <= 0) return "";
        long diff = now - millis;
        if (diff < 60_000L) return "עכשיו";
        long minutes = diff / 60_000L;
        if (minutes < 60) return minutes == 1 ? "לפני דקה" : "לפני " + minutes + " דקות";
        long hours = diff / 3_600_000L;
        if (hours < 24) {
            if (hours == 1) return "לפני שעה";
            if (hours == 2) return "לפני שעתיים";
            return "לפני " + hours + " שעות";
        }
        long days = diff / 86_400_000L;
        if (days == 1) return "אתמול";
        if (days == 2) return "לפני יומיים";
        if (days < 7) return "לפני " + days + " ימים";
        long weeks = days / 7;
        if (days < 30) {
            if (weeks == 1) return "לפני שבוע";
            if (weeks == 2) return "לפני שבועיים";
            return "לפני " + weeks + " שבועות";
        }
        long months = days / 30;
        if (months == 1) return "לפני חודש";
        if (months == 2) return "לפני חודשיים";
        if (months < 12) return "לפני " + months + " חודשים";
        long years = days / 365;
        return years <= 1 ? "לפני שנה" : "לפני " + years + " שנים";
    }

    /** "18/09/2026 14:23 · לפני 52 דקות" */
    public static String wall(long millis, long now) {
        if (millis <= 0) return "";
        return absolute(millis) + " · " + relative(millis, now);
    }
}
