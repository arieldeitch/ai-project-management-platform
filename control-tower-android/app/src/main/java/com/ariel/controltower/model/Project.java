package com.ariel.controltower.model;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/** One portfolio row as the gateway (contract v1 or v2) returns it, plus derived presentation state. */
public final class Project {
    public final String id;
    public final String name;
    public final String role;            // project | infrastructure
    public final String lifecycle;
    public final String rag;             // RED | YELLOW | GREEN | UNKNOWN
    public final String confidence;
    public final String objective;
    public final String milestone;
    public final String progressEvidence;
    public final String nextAction;
    public final String blocker;
    public final boolean needsAriel;
    public final String arielInput;
    public final String risk;
    public final String link;
    public final String expectedCadence;
    public final boolean userTestRequired;
    public final long lastProgressMillis;     // -1 when absent/unparseable
    public final String lastProgressRaw;      // original text when the sheet cell was not a date
    public final long lastControlCheckMillis; // -1 when absent
    public final String lastControlCheckRaw;

    // Contract v3 observability. Latest observed activity may be automation; meaningful activity never is.
    public final long latestActivityMillis;
    public final String latestActivityType;
    public final String latestActivitySource;
    public final String latestActivitySummary;
    public final String latestActivityEvidenceUrl;
    public final long latestMeaningfulActivityMillis;
    public final String latestMeaningfulActivityType;
    public final String latestMeaningfulActivitySource;
    public final String latestMeaningfulActivitySummary;
    public final String latestMeaningfulActivityEvidenceUrl;

    /** Freshness is based on meaningful progress, never on repetitive automation. */
    public final Freshness freshness;

    // Contract v5: compact purpose line, deterministic status, OS alignment (separate clock).
    public final String shortDescription;
    public final Status status;
    public final String statusReason;
    public final OsAlignment osAlignment;
    public final long lastOsCheckMillis;   // -1 when never checked
    public final String osVersionSeen;
    public final String osChangeMarker;
    public final String osEvidence;
    public final String osSyncAction;
    public final String osCurrentMarker;
    /** The row exactly as the gateway sent it — the machine layer. Never trimmed for display reasons. */
    public final JSONObject raw;
    /** Hebrew name Ariel sees (board display_name → known mapping → Hebrew description → canonical). */
    public final String displayName;

    private Project(JSONObject o, long now) {
        raw = o;
        id = o.optString("id", "");
        name = o.optString("name", "פרויקט");
        role = o.optString("role", "project");
        lifecycle = o.optString("lifecycle", "");
        rag = o.optString("rag", "UNKNOWN");
        confidence = o.optString("confidence", "");
        objective = o.optString("objective", "");
        milestone = o.optString("milestone", "");
        progressEvidence = o.optString("progress_evidence", "");
        nextAction = o.optString("next_action", "");
        blocker = o.optString("blocker", "");
        needsAriel = o.optBoolean("needs_ariel", false);
        arielInput = o.optString("ariel_input", "");
        risk = o.optString("risk", "");
        link = o.optString("link", "");
        expectedCadence = o.optString("expected_cadence", "");
        userTestRequired = o.optBoolean("user_test_required", false) || Hebrew.lifecycle(lifecycle).equals("מחכה לבדיקה שלך");

        // v2: explicit progress timestamp (ISO) with raw fallback. v1 gateways have neither -> unknown.
        String progressIso = o.optString("last_meaningful_progress", "");
        lastProgressRaw = o.optString("last_meaningful_progress_raw", "");
        long progress = TimeText.parse(progressIso);
        if (progress <= 0 && !lastProgressRaw.isEmpty()) progress = TimeText.parse(lastProgressRaw);
        lastProgressMillis = progress;

        // Control check: v2 field, else v1 last_check (which always meant Last Control Check).
        String checkIso = o.optString("last_control_check", "");
        if (checkIso.isEmpty()) checkIso = o.optString("last_check", "");
        lastControlCheckRaw = o.optString("last_control_check_raw", "");
        long check = TimeText.parse(checkIso);
        if (check <= 0 && !lastControlCheckRaw.isEmpty()) check = TimeText.parse(lastControlCheckRaw);
        lastControlCheckMillis = check;

        // v3: live activity observer. v1/v2 fall back honestly to curated board progress.
        long observed = TimeText.parse(o.optString("latest_activity_at", ""));
        latestActivityMillis = observed > 0 ? observed : lastProgressMillis;
        latestActivityType = o.optString("latest_activity_type", lastProgressMillis > 0 ? "progress" : "");
        latestActivitySource = o.optString("latest_activity_source", lastProgressMillis > 0 ? "project_board" : "");
        latestActivitySummary = o.optString("latest_activity_summary", lastProgressMillis > 0 ? progressEvidence : "");
        latestActivityEvidenceUrl = o.optString("latest_activity_evidence_url", lastProgressMillis > 0 ? link : "");

        long meaningful = TimeText.parse(o.optString("latest_meaningful_activity_at", ""));
        latestMeaningfulActivityMillis = meaningful > 0 ? meaningful : lastProgressMillis;
        latestMeaningfulActivityType = o.optString("latest_meaningful_activity_type", lastProgressMillis > 0 ? "progress" : "");
        latestMeaningfulActivitySource = o.optString("latest_meaningful_activity_source", lastProgressMillis > 0 ? "project_board" : "");
        latestMeaningfulActivitySummary = o.optString("latest_meaningful_activity_summary", lastProgressMillis > 0 ? progressEvidence : "");
        latestMeaningfulActivityEvidenceUrl = o.optString("latest_meaningful_activity_evidence_url", lastProgressMillis > 0 ? link : "");

        freshness = Freshness.of(latestMeaningfulActivityMillis, expectedCadence, now);

        shortDescription = o.optString("short_description", "").trim();
        Status fromGateway = Status.parse(o.optString("status_bucket", ""));
        status = fromGateway != null ? fromGateway : Status.derive(this);
        String reason = o.optString("status_reason", "").trim();
        statusReason = reason.isEmpty() ? Status.deriveReason(this, status) : reason;
        osAlignment = OsAlignment.parse(o.optString("os_alignment", ""));
        lastOsCheckMillis = TimeText.parse(o.optString("last_os_check", ""));
        osVersionSeen = o.optString("os_version_seen", "").trim();
        osChangeMarker = o.optString("os_change_marker", "").trim();
        osEvidence = o.optString("os_evidence", "").trim();
        osSyncAction = o.optString("os_sync_action", "").trim();
        osCurrentMarker = o.optString("os_current_marker", "").trim();
        displayName = DisplayName.resolve(o.optString("display_name", ""), name, shortDescription);
    }

    /** Name plus the optional one-line purpose: "Momentum OS — אפליקציית ניהול בית" (machine-layer / reports only). */
    public String compactTitle() {
        return shortDescription.isEmpty() ? name : name + " — " + shortDescription;
    }

    /** Board prose for the machine section, labelled; never rendered on cards. */
    public List<String[]> boardProse() {
        List<String[]> t = new ArrayList<>();
        if (!shortDescription.isEmpty()) t.add(new String[]{"short_description", shortDescription});
        if (!objective.isEmpty()) t.add(new String[]{"objective", objective});
        if (!milestone.isEmpty()) t.add(new String[]{"milestone", milestone});
        if (!nextAction.isEmpty()) t.add(new String[]{"next_action", nextAction});
        if (!arielInput.isEmpty()) t.add(new String[]{"ariel_input", arielInput});
        if (!blocker.isEmpty()) t.add(new String[]{"blocker", blocker});
        if (!risk.isEmpty()) t.add(new String[]{"risk", risk});
        if (!progressEvidence.isEmpty()) t.add(new String[]{"progress_evidence", progressEvidence});
        if (!latestActivitySummary.isEmpty() && !latestActivitySummary.equals(progressEvidence)) t.add(new String[]{"latest_activity_summary", latestActivitySummary});
        return t;
    }

    /** Evidence URL for the OS record, when the evidence text carries one. */
    public String osEvidenceUrl() {
        int i = osEvidence.indexOf("http");
        if (i < 0) return "";
        String rest = osEvidence.substring(i);
        int end = rest.indexOf(' ');
        return end > 0 ? rest.substring(0, end) : rest;
    }

    public static Project from(JSONObject o, long now) {
        return new Project(o, now);
    }

    public boolean isInfrastructure() { return "infrastructure".equalsIgnoreCase(role); }
    public boolean isRed() { return "RED".equalsIgnoreCase(rag); }
    public boolean isGreen() { return "GREEN".equalsIgnoreCase(rag); }
    public boolean isStale() { return freshness.isStale(); }
    public boolean latestActivityIsAutomation() { return "automation".equalsIgnoreCase(latestActivityType); }

    /** Actionable for Ariel right now: needs him, waiting for his test, or red. */
    public boolean needsAttention() { return needsAriel || userTestRequired || isRed(); }

    /**
     * Ordering weight: needs-Ariel first, then user test, then red, then stale, then aging, then yellow.
     * Ties break by most recent activity (unknown activity sinks).
     */
    public int urgencyScore() {
        int s = 0;
        if (needsAriel) s += 100;
        if (userTestRequired) s += 90;
        if (isRed()) s += 80;
        if (freshness.state == Freshness.State.STALE) s += 40;
        if (freshness.state == Freshness.State.AGING) s += 10;
        // UNKNOWN activity is a data gap, not evidence of trouble: it sinks via the comparator tie-break.
        if (!isRed() && !isGreen()) s += 5;
        return s;
    }

    /** Hebrew reasons explaining why this project is in the attention list. */
    public List<String> attentionReasons() {
        List<String> r = new ArrayList<>();
        if (needsAriel) r.add("צריך אותך");
        if (userTestRequired) r.add("מחכה לבדיקה שלך");
        if (isRed()) r.add("אדום · דורש טיפול");
        if (freshness.state == Freshness.State.STALE) r.add("המידע ישן");
        return r;
    }

    /** The one thing Ariel should do, in priority order: his input, blocker, next action. */
    public String arielAction() {
        if (needsAriel && !arielInput.isEmpty()) return arielInput;
        if (userTestRequired) return nextAction.isEmpty() ? "לבדוק את הגרסה בטלפון ולדווח" : nextAction;
        if (needsAriel) return nextAction.isEmpty() ? "נדרשת החלטה או פעולה שלך" : nextAction;
        if (isRed() && !blocker.isEmpty()) return "לשחרר חסם: " + blocker;
        return nextAction;
    }

    // ---------- human layer (what Ariel sees by default) ----------

    /** True when the row should carry a "why" line: anything that is not simply OK. */
    public boolean hasReason() { return status != Status.OK; }

    /**
     * One management sentence for the row, in priority order: what Ariel must do, else why the status is
     * not OK, else nothing (an OK project needs no explanation).
     */
    public String humanLine() {
        if (status == Status.NEEDS_ARIEL) {
            String a = arielAction();
            return a.isEmpty() ? "צריך החלטה או פעולה שלך" : a;
        }
        if (status == Status.BLOCKED) return blocker.isEmpty() ? "משהו חוסם את ההתקדמות" : "חסום: " + blocker;
        if (status == Status.AT_RISK) return risk.isEmpty() ? "דורש טיפול לפני שהמצב מחמיר" : risk;
        if (status == Status.WATCH) return risk.isEmpty() ? "" : risk;
        return "";
    }

    /** True when the OS state deserves a chip on the compact row (drift / never / failed). UNKNOWN stays quiet. */
    public boolean osNeedsChip() {
        return osAlignment == OsAlignment.VERSION_DRIFT || osAlignment == OsAlignment.NEVER_SEEN || osAlignment == OsAlignment.ACCESS_FAILED;
    }

    /** Human OS next step: the board's sync action when present, else the state's default. */
    public String osHumanAction() {
        return osSyncAction.isEmpty() ? osAlignment.action : osSyncAction;
    }

    /** Short freshness phrase for rows: "עודכן לפני יומיים" / "לא התקבל עדכון". */
    public String updatedLine(long now) {
        if (latestActivityMillis > 0) return Labels.UPDATED + " " + TimeText.relative(latestActivityMillis, now);
        return Labels.NO_UPDATE;
    }

    // ---------- machine layer (kept intact for agents, Chief of Staff and diagnostics) ----------

    /** Raw structured facts as "key: value" lines — the technical section shows these verbatim. */
    public List<String> technicalLines() {
        List<String> t = new ArrayList<>();
        t.add("project_id: " + id + " · canonical name: " + name);
        t.add("status_bucket: " + status.name() + (raw.has("status_bucket") ? "" : " (client-derived)"));
        t.add("status_reason: " + statusReason);
        t.add("rag: " + rag + " · lifecycle: " + lifecycle + " · needs_ariel: " + needsAriel + " · user_test_required: " + userTestRequired);
        t.add("os_alignment: " + osAlignment.name());
        t.add("last_os_check: " + raw.optString("last_os_check", ""));
        t.add("os_version_seen: " + osVersionSeen + " · os_change_marker: " + osChangeMarker + " · os_current_marker: " + osCurrentMarker);
        t.add("os_evidence: " + osEvidence);
        t.add("os_sync_action: " + osSyncAction);
        t.add("latest_activity_at: " + raw.optString("latest_activity_at", "") + " · type: " + latestActivityType + " · source: " + latestActivitySource);
        t.add("latest_meaningful_activity_at: " + raw.optString("latest_meaningful_activity_at", "") + " · last_meaningful_progress: " + raw.optString("last_meaningful_progress", ""));
        t.add("last_control_check: " + raw.optString("last_control_check", raw.optString("last_check", "")));
        t.add("expected_cadence: " + expectedCadence + " · freshness: " + freshness.state.name() + "/" + freshness.reason.name());
        t.add("evidence_url: " + latestActivityEvidenceUrl);
        return t;
    }

    /** One-sentence "where it stands" for cards: milestone, else lifecycle in Hebrew. */
    public String statusSentence() {
        if (!milestone.isEmpty()) return milestone;
        String l = Hebrew.lifecycle(lifecycle);
        return l.isEmpty() ? "" : l;
    }
}
