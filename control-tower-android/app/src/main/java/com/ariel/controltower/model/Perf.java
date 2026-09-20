package com.ariel.controltower.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

/**
 * Tap-to-render instrumentation. {@code begin(name)} at the tap, {@code end(token)} when the first local frame is
 * built (never when the network answers). Samples are kept in memory for the diagnostics section and emitted to a
 * pluggable sink (logcat in the app, nothing in tests). Pure Java.
 */
public final class Perf {
    private Perf() {}

    public interface Sink { void log(String line); }

    public static final class Sample {
        public final String name;
        public final long startedAt;
        public final long millis;
        Sample(String name, long startedAt, long millis) { this.name = name; this.startedAt = startedAt; this.millis = millis; }
    }

    public static final int CAPACITY = 60;
    /** Product target for local-only interactions (task: aim < 100–150 ms on the emulator). */
    public static final long TARGET_LOCAL_MS = 150;

    private static final List<Sample> SAMPLES = new ArrayList<>();
    private static volatile Sink sink;
    private static volatile Clock clock = System::currentTimeMillis;

    public interface Clock { long now(); }

    public static void setSink(Sink s) { sink = s; }
    public static void setClock(Clock c) { clock = c == null ? System::currentTimeMillis : c; }

    public static final class Token {
        final String name; final long start;
        Token(String name, long start) { this.name = name; this.start = start; }
    }

    public static Token begin(String name) { return new Token(name, clock.now()); }

    public static long end(Token t) {
        if (t == null) return -1;
        long ms = clock.now() - t.start;
        synchronized (SAMPLES) {
            SAMPLES.add(new Sample(t.name, t.start, ms));
            while (SAMPLES.size() > CAPACITY) SAMPLES.remove(0);
        }
        Sink s = sink;
        if (s != null) s.log(String.format(Locale.ROOT, "perf %s %dms%s", t.name, ms, ms > TARGET_LOCAL_MS ? " SLOW" : ""));
        return ms;
    }

    public static List<Sample> samples() {
        synchronized (SAMPLES) { return Collections.unmodifiableList(new ArrayList<>(SAMPLES)); }
    }

    public static void clear() { synchronized (SAMPLES) { SAMPLES.clear(); } }

    /** Compact Hebrew report for the diagnostics section: per interaction name — count, median, max. */
    public static String report() {
        List<Sample> all = samples();
        if (all.isEmpty()) return "אין עדיין מדידות";
        List<String> names = new ArrayList<>();
        for (Sample s : all) if (!names.contains(s.name)) names.add(s.name);
        StringBuilder sb = new StringBuilder();
        for (String n : names) {
            List<Long> v = new ArrayList<>();
            for (Sample s : all) if (s.name.equals(n)) v.add(s.millis);
            Collections.sort(v);
            long median = v.get(v.size() / 2), max = v.get(v.size() - 1);
            if (sb.length() > 0) sb.append('\n');
            sb.append(n).append(": ").append(v.size()).append("× · חציון ").append(median).append(" מ״ש · מקסימום ").append(max).append(" מ״ש");
        }
        return sb.toString();
    }

    /** Median for one interaction name, or -1. Used by tests and the report. */
    public static long median(String name) {
        List<Long> v = new ArrayList<>();
        for (Sample s : samples()) if (s.name.equals(name)) v.add(s.millis);
        if (v.isEmpty()) return -1;
        Collections.sort(v);
        return v.get(v.size() / 2);
    }
}
