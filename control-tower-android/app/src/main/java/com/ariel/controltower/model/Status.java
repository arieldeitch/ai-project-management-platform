package com.ariel.controltower.model;

/**
 * One deterministic status per project (mirrors the gateway's status_bucket; recomputed locally for
 * gateways that predate contract 5). First rule wins:
 *   NEEDS_ARIEL  needs_ariel or waiting for Ariel's phone test
 *   BLOCKED      a blocker/dependency is recorded, or lifecycle is "blocked"
 *   AT_RISK      RAG red
 *   WATCH        RAG yellow, or no RAG at all
 *   OK           RAG green
 * Freshness (stale) is an orthogonal modifier shown as its own filter, never a status.
 */
public enum Status {
    NEEDS_ARIEL("צריך אותך", "יש החלטה, קלט או בדיקה בטלפון שמחכים לך", "מסומן בלוח 'Needs Ariel' או במצב 'מחכה לבדיקה'"),
    BLOCKED("חסום", "משהו מונע התקדמות ומישהו צריך לשחרר אותו", "יש חסם/תלות רשומים בלוח או שהשלב הוא 'חסום'"),
    AT_RISK("דורש טיפול", "הפרויקט אדום — נדרש טיפול לפני שהמצב מחמיר", "הרמזור בלוח אדום"),
    WATCH("במעקב", "לא תקוע, אבל כדאי לעקוב", "הרמזור בלוח צהוב, או שלא הוגדר רמזור"),
    OK("תקין", "אין חסם ואין החלטה פתוחה", "הרמזור בלוח ירוק, אין חסם ואין 'צריך את אריאל'");

    public final String label;
    public final String meaning;
    public final String rule;

    Status(String label, String meaning, String rule) {
        this.label = label;
        this.meaning = meaning;
        this.rule = rule;
    }

    public static Status parse(String bucket) {
        if (bucket == null) return null;
        try {
            return Status.valueOf(bucket.trim().toUpperCase());
        } catch (Exception e) {
            return null;
        }
    }

    /** The local rule, used when the gateway did not send status_bucket (contract < 5). */
    public static Status derive(Project p) {
        if (p.needsAriel || p.userTestRequired) return NEEDS_ARIEL;
        String lc = p.lifecycle == null ? "" : p.lifecycle.trim().toLowerCase();
        if (!p.blocker.trim().isEmpty() || lc.equals("blocked") || lc.equals("חסום")) return BLOCKED;
        if (p.isRed()) return AT_RISK;
        if (p.isGreen()) return OK;
        return WATCH;
    }

    /** Hebrew "why this status", used when the gateway did not send status_reason. */
    public static String deriveReason(Project p, Status s) {
        switch (s) {
            case NEEDS_ARIEL: return p.userTestRequired ? "מחכה לבדיקה שלך בטלפון" : (p.arielInput.isEmpty() ? "צריך החלטה או פעולה שלך" : "צריך אותך: " + p.arielInput);
            case BLOCKED: return p.blocker.isEmpty() ? "מסומן כחסום בלוח" : "חסום: " + p.blocker;
            case AT_RISK: return p.risk.isEmpty() ? "אדום בלוח — דורש טיפול" : "אדום בלוח: " + p.risk;
            case WATCH: return "UNKNOWN".equalsIgnoreCase(p.rag) ? "לא הוגדר רמזור בלוח" : (p.risk.isEmpty() ? "צהוב בלוח — במעקב" : "צהוב בלוח: " + p.risk);
            default: return "ירוק בלוח — אין חסם ואין החלטה פתוחה";
        }
    }
}
