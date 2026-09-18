package com.ariel.controltower.model;

import java.time.Instant;
import java.time.LocalDateTime;
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
    private static final Pattern DMY = Pattern.compile("^(\\d{1,2})[/.\\-](\\d{1,2})[/.\\-](\\d{4})(?:[ T,]+(\\d{1,2}):(\\d{2}))?");

    private TimeText() {}

    /** ISO-8601 (with or without millis/offset) or DD/MM/YYYY[ HH:MM] → epoch millis, or -1. */
    public static long parse(String value) {
        if (value == null) return -1;
        String s = value.trim();
        if (s.isEmpty()) return -1;
        try {
            return Instant.parse(s).toEpochMilli();
        } catch (Exception ignored) {}
        try {
            return ZonedDateTime.parse(s).toInstant().toEpochMilli();
        } catch (Exception ignored) {}
        try {
            if (s.length() >= 16 && s.charAt(10) == 'T') {
                return LocalDateTime.parse(s.length() > 19 ? s.substring(0, 19) : s).atZone(ISRAEL).toInstant().toEpochMilli();
            }
        } catch (Exception ignored) {}
        Matcher m = DMY.matcher(s);
        if (m.find()) {
            try {
                int day = Integer.parseInt(m.group(1));
                int month = Integer.parseInt(m.group(2));
                int year = Integer.parseInt(m.group(3));
                int hour = m.group(4) == null ? 0 : Integer.parseInt(m.group(4));
                int minute = m.group(5) == null ? 0 : Integer.parseInt(m.group(5));
                return ZonedDateTime.of(year, month, day, hour, minute, 0, 0, ISRAEL).toInstant().toEpochMilli();
            } catch (Exception ignored) {}
        }
        return -1;
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
