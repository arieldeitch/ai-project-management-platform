package com.ariel.controltower.model;

/**
 * Evidence-backed alignment of a project with the canonical Ariel AI Operating System, as recorded by the
 * gateway (OS Access Receipts). Never derived from commits or activity on the client either.
 */
public enum OsAlignment {
    CURRENT("מיושר ל-OS", "הפרויקט קרא את מערכת ההפעלה הנוכחית והחיל את הכללים"),
    VERSION_DRIFT("OS לא עדכני", "הפרויקט ראה גרסה ישנה של מערכת ההפעלה — נדרשת ריצת סנכרון"),
    NEVER_SEEN("טרם בדק OS", "אין עדיין ראיה שהפרויקט קרא את מערכת ההפעלה"),
    ACCESS_FAILED("אין גישה ל-OS", "הפרויקט ניסה ולא הצליח לגשת למערכת ההפעלה"),
    UNKNOWN("OS לא ידוע", "אין מספיק ראיות כדי לקבוע יישור");

    public final String label;
    public final String meaning;

    OsAlignment(String label, String meaning) {
        this.label = label;
        this.meaning = meaning;
    }

    public static OsAlignment parse(String value) {
        if (value == null || value.trim().isEmpty()) return UNKNOWN;
        try {
            return OsAlignment.valueOf(value.trim().toUpperCase().replace('-', '_').replace(' ', '_'));
        } catch (Exception e) {
            return UNKNOWN;
        }
    }

    public boolean needsAction() { return this != CURRENT; }
}
