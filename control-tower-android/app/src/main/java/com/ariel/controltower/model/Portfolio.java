package com.ariel.controltower.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/** A received portfolio snapshot: canonical projects (ordered by urgency), infrastructure rows, counts, freshness. */
public final class Portfolio {
    public final List<Project> projects;        // role == project, urgency order
    public final List<Project> infrastructure;  // e.g. Control Tower itself, shown apart
    public final long syncedAt;                 // when this client received the snapshot (device clock)
    public final long serverSnapshotAt;         // gateway snapshot_at, -1 if absent (v1 gateway)
    public final int contractVersion;           // 1 for gateways without the v2 fields
    public final boolean fromCache;

    public final int red, watch, green, needsAttention, stale, unknownActivity;

    private Portfolio(List<Project> projects, List<Project> infrastructure, long syncedAt, long serverSnapshotAt, int contractVersion, boolean fromCache) {
        this.projects = Collections.unmodifiableList(projects);
        this.infrastructure = Collections.unmodifiableList(infrastructure);
        this.syncedAt = syncedAt;
        this.serverSnapshotAt = serverSnapshotAt;
        this.contractVersion = contractVersion;
        this.fromCache = fromCache;
        int r = 0, w = 0, g = 0, n = 0, s = 0, u = 0;
        for (Project p : projects) {
            if (p.isRed()) r++; else if (p.isGreen()) g++; else w++;
            if (p.needsAttention()) n++;
            if (p.isStale()) s++;
            if (p.freshness.state == Freshness.State.UNKNOWN) u++;
        }
        red = r; watch = w; green = g; needsAttention = n; stale = s; unknownActivity = u;
    }

    /** Build from a gateway `portfolio` response body. */
    public static Portfolio from(JSONObject body, long now, boolean fromCache) {
        JSONArray arr = body.optJSONArray("projects");
        List<Project> projects = new ArrayList<>();
        List<Project> infra = new ArrayList<>();
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null) continue;
                Project p = Project.from(o, now);
                if (p.isInfrastructure()) infra.add(p); else projects.add(p);
            }
        }
        projects.sort(URGENCY);
        long server = TimeText.parse(body.optString("snapshot_at", ""));
        int contract = body.optInt("contract_version", server > 0 ? 2 : 1);
        long synced = body.optLong("synced_at", now);
        return new Portfolio(projects, infra, synced, server, contract, fromCache);
    }

    /** Needs-Ariel / user-test / red first; then stale; then by most recent activity; unknown activity last. */
    public static final Comparator<Project> URGENCY = (a, b) -> {
        int byScore = Integer.compare(b.urgencyScore(), a.urgencyScore());
        if (byScore != 0) return byScore;
        long ta = a.lastProgressMillis, tb = b.lastProgressMillis;
        if (ta <= 0 && tb <= 0) return a.name.compareTo(b.name);
        if (ta <= 0) return 1;
        if (tb <= 0) return -1;
        return Long.compare(tb, ta);
    };

    public List<Project> attention() {
        List<Project> out = new ArrayList<>();
        for (Project p : projects) if (p.needsAttention()) out.add(p);
        return out;
    }

    public List<Project> calm() {
        List<Project> out = new ArrayList<>();
        for (Project p : projects) if (!p.needsAttention()) out.add(p);
        return out;
    }

    /** Most recent project activity across the portfolio, -1 if none has a timestamp. */
    public long latestActivity() {
        Project p = latestActiveProject();
        return p == null ? -1 : p.lastProgressMillis;
    }

    /** The project with the most recent activity timestamp, or null when none has one. */
    public Project latestActiveProject() {
        Project best = null;
        for (Project p : projects) if (p.lastProgressMillis > 0 && (best == null || p.lastProgressMillis > best.lastProgressMillis)) best = p;
        return best;
    }
}
