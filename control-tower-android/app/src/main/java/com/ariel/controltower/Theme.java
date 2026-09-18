package com.ariel.controltower;

import android.graphics.Color;

/**
 * "Control room at dusk": charcoal/slate, never black. Soft contrast, status colours visible
 * without neon. Shared by every screen so the app reads as one system.
 */
public final class Theme {
    private Theme() {}

    public static final int BG = Color.parseColor("#171C24");
    public static final int NAV = Color.parseColor("#202733");
    public static final int SURFACE = Color.parseColor("#252D39");
    public static final int SURFACE_2 = Color.parseColor("#2B3543");
    public static final int BORDER = Color.parseColor("#3A4656");
    public static final int TEXT = Color.parseColor("#F3F6FA");
    public static final int MUTED = Color.parseColor("#B5BFCC");
    public static final int BLUE = Color.parseColor("#7BA8E8");
    public static final int GREEN = Color.parseColor("#55B986");
    public static final int AMBER = Color.parseColor("#D7A64A");
    public static final int RED = Color.parseColor("#E06E6E");

    /** Translucent tint of a status colour for chips/backgrounds. */
    public static int tint(int color, int alpha) {
        return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color));
    }

    public static int rag(String rag) {
        if ("RED".equalsIgnoreCase(rag)) return RED;
        if ("GREEN".equalsIgnoreCase(rag)) return GREEN;
        if ("YELLOW".equalsIgnoreCase(rag) || "AMBER".equalsIgnoreCase(rag)) return AMBER;
        return MUTED;
    }
}
