package com.ariel.controltower.model;

import java.util.Locale;

/**
 * Hebrew display names for the projects Ariel sees. The canonical (English) name stays the integration key in the
 * board, the gateway contract and every machine consumer; only presentation changes here.
 *
 * Resolution order: the board's optional `display_name` column → this mapping → a Hebrew short description →
 * the canonical name (never invented, never transliterated).
 */
public final class DisplayName {
    private DisplayName() {}

    private static final String[][] KNOWN = {
            {"fitness app recovery", "אפליקציית הכושר"},
            {"fitness app", "אפליקציית הכושר"},
            {"household os", "מערכת הבית"},
            {"momentum os", "מערכת הבית"},
            {"irish citizenship & passport", "אזרחות ודרכון אירי"},
            {"irish citizenship and passport", "אזרחות ודרכון אירי"},
            {"irish citizenship", "אזרחות ודרכון אירי"},
            {"chief of staff", "הצ'יף"},
            {"personal news radar", "רדאר החדשות"},
            {"news radar", "רדאר החדשות"},
            {"nutrition app", "אפליקציית התזונה"},
            {"tom ai learning", "הלמידה של תום"},
            {"ariel life os", "מערכת החיים"},
            {"life os", "מערכת החיים"},
            {"ai control tower", "מגדל הפיקוח"},
            {"control tower", "מגדל הפיקוח"},
    };

    public static boolean hasHebrew(String s) {
        if (s == null) return false;
        for (int i = 0; i < s.length(); i++) { char c = s.charAt(i); if (c >= 0x0590 && c <= 0x05FF) return true; }
        return false;
    }

    public static boolean hasLatin(String s) {
        if (s == null) return false;
        for (int i = 0; i < s.length(); i++) { char c = s.charAt(i); if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) return true; }
        return false;
    }

    /** Mapping hit for a canonical name, or null. */
    public static String known(String canonical) {
        if (canonical == null) return null;
        String k = canonical.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
        for (String[] pair : KNOWN) if (k.equals(pair[0])) return pair[1];
        for (String[] pair : KNOWN) if (k.startsWith(pair[0] + " ") || k.startsWith(pair[0] + " —") || k.startsWith(pair[0] + " -")) return pair[1];
        return null;
    }

    /** The name Ariel sees. */
    public static String resolve(String boardDisplayName, String canonical, String shortDescription) {
        if (boardDisplayName != null && !boardDisplayName.trim().isEmpty()) return boardDisplayName.trim();
        String mapped = known(canonical);
        if (mapped != null) return mapped;
        if (hasHebrew(shortDescription) && !hasLatin(shortDescription)) return shortDescription.trim();
        return canonical == null ? "" : canonical.trim();
    }
}
