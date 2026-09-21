package com.ariel.controltower.model;

/**
 * The management projection of a project — everything a card or the top of the detail screen may show, and
 * nothing else. It is built only from status, freshness, OS state and the Hebrew display name; board prose
 * (objective, next action, blocker, risk, evidence, status reason) is deliberately not an input, so English or
 * diagnostic text cannot reach the card. That prose stays in {@link Project#raw} for agents and "מידע למערכת".
 */
public final class ProjectCard {
    /** Hebrew display name. */
    public final String title;
    /** Status chip label (Hebrew). */
    public final String status;
    /** At most one short management signal, or "" when the status chip already says everything. */
    public final String signal;
    /** "עודכן לפני יומיים" / "לא התקבל עדכון". */
    public final String updated;
    /** Affordance label ("פתח"). */
    public final String action;
    public final Status statusValue;
    public final boolean emphasise;

    private ProjectCard(String title, String status, String signal, String updated, String action, Status statusValue, boolean emphasise) {
        this.title = title; this.status = status; this.signal = signal; this.updated = updated; this.action = action;
        this.statusValue = statusValue; this.emphasise = emphasise;
    }

    public static ProjectCard of(Project p, long now) {
        String signal = signalFor(p);
        return new ProjectCard(p.displayName, p.status.label, signal, p.updatedLine(now), Labels.ACTION_OPEN, p.status, p.needsAttention());
    }

    /**
     * One short Hebrew signal that adds something the status chip does not already say:
     * not updated lately › not synced. The status itself (צריך אותך / חסום / דורש טיפול / במעקב / תקין) is the chip,
     * so it is never repeated as a sentence (review finding, 0.12.0).
     */
    static String signalFor(Project p) {
        if (p.freshness.state == Freshness.State.STALE) return Labels.SIGNAL_NOT_UPDATED;
        if (p.osNeedsChip()) return Labels.SIGNAL_NOT_SYNCED;
        return "";
    }

    /** The management sentence for the top of the detail screen (chip + one line). */
    public static String detailLine(Project p) {
        switch (p.status) {
            case NEEDS_ARIEL: return Labels.SIGNAL_WAITING_FOR_YOU;
            case BLOCKED: return Labels.SIGNAL_BLOCKED;
            case AT_RISK: return Labels.SIGNAL_NEEDS_ATTENTION;
            case WATCH: return Labels.SIGNAL_WATCH;
            default: return Labels.SIGNAL_OK;
        }
    }

    /** Secondary signals shown as small chips when they are not already the main signal. */
    public static String[] extraChips(Project p) {
        String main = signalFor(p);
        boolean stale = p.freshness.state == Freshness.State.STALE && !main.equals(Labels.SIGNAL_NOT_UPDATED);
        boolean os = p.osNeedsChip() && !main.equals(Labels.SIGNAL_NOT_SYNCED);
        if (stale && os) return new String[]{Labels.SIGNAL_NOT_UPDATED, Labels.SIGNAL_NOT_SYNCED};
        if (stale) return new String[]{Labels.SIGNAL_NOT_UPDATED};
        if (os) return new String[]{Labels.SIGNAL_NOT_SYNCED};
        return new String[0];
    }
}
