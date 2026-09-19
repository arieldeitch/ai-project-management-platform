package com.ariel.controltower;

import android.graphics.Color;

/**
 * "Control room at dusk": charcoal/slate, never black. Soft contrast, status colours visible
 * without neon. Shared by every screen so the app reads as one system.
 */
public final class Theme {
    private Theme() {}

    // Warm slate instead of the previous black/blue: lighter surfaces, desaturated accent, restrained status colours.
    public static final int BG = Color.parseColor("#1D222A");
    public static final int NAV = Color.parseColor("#252B34");
    public static final int SURFACE = Color.parseColor("#293039");
    public static final int SURFACE_2 = Color.parseColor("#323A45");
    public static final int BORDER = Color.parseColor("#3F4955");
    public static final int TEXT = Color.parseColor("#EEF2F6");
    public static final int MUTED = Color.parseColor("#AAB4C0");
    public static final int BLUE = Color.parseColor("#93B4D6");   // soft steel blue accent
    public static final int TEAL = Color.parseColor("#7FC4B9");   // ideas / calm highlights
    public static final int GREEN = Color.parseColor("#6DBF95");
    public static final int AMBER = Color.parseColor("#D8B06A");
    public static final int RED = Color.parseColor("#E08585");

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
