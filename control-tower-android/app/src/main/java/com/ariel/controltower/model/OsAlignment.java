package com.ariel.controltower.model;

/**
 * Evidence-backed alignment of a project with the canonical Ariel AI Operating System, as recorded by the
 * gateway (OS Access Receipts). Never derived from commits or activity on the client either.
 */
public enum OsAlignment {
    // label = chip (≤ 12 chars, management Hebrew) · meaning = one sentence for the detail · action = what should happen
    CURRENT("מסונכרן", "הפרויקט מסונכרן למערכת ההפעלה", ""),
    VERSION_DRIFT("לא מסונכרן", "הפרויקט לא מסונכרן למערכת ההפעלה", "נדרשת ריצת סנכרון בפרויקט"),
    NEVER_SEEN("טרם סונכרן", "הפרויקט עדיין לא סונכרן למערכת ההפעלה", "נדרשת ריצת סנכרון ראשונה בפרויקט"),
    ACCESS_FAILED("סנכרון נכשל", "הפרויקט לא הצליח לגשת למערכת ההפעלה", "נדרשת ריצת תיקון ב-GPT/Claude"),
    UNKNOWN("סנכרון לא אומת", "לא התקבל עדיין אישור סנכרון מהפרויקט", "נדרשת ריצת סנכרון בפרויקט");

    public final String label;
    public final String meaning;
    /** Human next step (empty when nothing is needed). Control Tower's own os_sync_action wins when present. */
    public final String action;

    OsAlignment(String label, String meaning, String action) {
        this.label = label;
        this.meaning = meaning;
        this.action = action;
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
