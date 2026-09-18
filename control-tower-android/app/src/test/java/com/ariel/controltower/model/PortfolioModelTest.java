package com.ariel.controltower.model;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Deterministic coverage for the presentation model. The fixture below mirrors the SHAPE of the
 * live PROJECT_CONTROL_BOARD (six canonical rows P-001..P-006, contract v2 fields); values are
 * test data only and are never shipped in the app.
 */
public class PortfolioModelTest {
    private static final long NOW = ZonedDateTime.of(2026, 9, 18, 15, 15, 0, 0, TimeText.ISRAEL).toInstant().toEpochMilli();
    private static final String T_1423 = "2026-09-18T11:23:00.000Z"; // 18/09/2026 14:23 Israel (IDT)
    private static final String T_CHECK = "2026-09-18T12:00:00.000Z";

    private static JSONObject row(String id, String name, String lifecycle, String rag, boolean needsAriel, String progressIso, String cadence) throws Exception {
        return new JSONObject()
                .put("id", id).put("name", name).put("role", "project").put("lifecycle", lifecycle).put("rag", rag)
                .put("confidence", "HIGH").put("milestone", "M").put("next_action", "N").put("needs_ariel", needsAriel)
                .put("ariel_input", needsAriel ? "Decide X" : "")
                .put("last_meaningful_progress", progressIso).put("last_control_check", T_CHECK).put("last_check", T_CHECK)
                .put("expected_cadence", cadence);
    }

    private static JSONObject liveShapedBody() throws Exception {
        JSONArray arr = new JSONArray()
                .put(row("P-001", "Ariel Life OS", "Active", "GREEN", false, T_1423, "weekly"))
                .put(row("P-002", "Household OS", "Active", "YELLOW", true, "2026-09-17T06:10:00Z", "daily"))
                .put(row("P-003", "Personal News Radar", "Active", "GREEN", false, "", ""))
                .put(row("P-004", "Tom AI Learning", "USER TEST REQUIRED", "GREEN", false, "2026-09-16T05:00:00Z", "weekly"))
                .put(row("P-005", "Nutrition App", "Active", "RED", true, "2026-08-20T05:00:00Z", "2x/week"))
                .put(row("P-006", "Chief of Staff", "Active", "GREEN", false, T_1423, "weekly"))
                .put(row("X-1", "AI Control Tower", "Active", "GREEN", false, T_1423, "").put("role", "infrastructure"));
        return new JSONObject().put("projects", arr).put("snapshot_at", "2026-09-18T12:14:00Z").put("contract_version", 2);
    }

    // ---------- Hebrew status mapping ----------

    @Test public void ragIsHebrewWithMeaning() {
        assertEquals("אדום · דורש טיפול", Hebrew.ragBadge("RED"));
        assertEquals("צהוב · במעקב", Hebrew.ragBadge("AMBER"));
        assertEquals("ירוק · תקין", Hebrew.ragBadge("green"));
        assertEquals("לא ידוע", Hebrew.rag(""));
    }

    @Test public void lifecycleAndConfidenceAreHebrew() {
        assertEquals("פעיל", Hebrew.lifecycle("Active"));
        assertEquals("מחכה לבדיקה שלך", Hebrew.lifecycle("USER TEST REQUIRED"));
        assertEquals("מחכה לבדיקה שלך", Hebrew.lifecycle("user_test_required"));
        assertEquals("חסום", Hebrew.lifecycle("blocked"));
        assertEquals("גבוהה", Hebrew.confidence("HIGH"));
        assertEquals("בינונית", Hebrew.confidence("Medium"));
        assertEquals("נמוכה", Hebrew.confidence("low"));
        assertEquals("דווח · ממתין לאימות", Hebrew.inboxStatus("REPORTED"));
    }

    // ---------- timestamp formatting / relative age ----------

    @Test public void absoluteTimestampIsIsraelFormat() {
        assertEquals("18/09/2026 14:23", TimeText.absolutePlain(TimeText.parse(T_1423)));
        assertEquals("", TimeText.absolutePlain(-1));
    }

    @Test public void parsesIsoAndIsraeliTextDates() {
        long fromText = TimeText.parse("18/09/2026 14:23");
        assertEquals(TimeText.parse(T_1423), fromText);
        assertEquals("18/09/2026 00:00", TimeText.absolutePlain(TimeText.parse("18.9.2026")));
        assertEquals(-1, TimeText.parse("not a date"));
        assertEquals(-1, TimeText.parse(""));
    }

    @Test public void relativeAgeInHebrew() {
        long t = NOW;
        assertEquals("עכשיו", TimeText.relative(t - 20_000L, t));
        assertEquals("לפני דקה", TimeText.relative(t - 60_000L, t));
        assertEquals("לפני 42 דקות", TimeText.relative(t - 42 * 60_000L, t));
        assertEquals("לפני שעה", TimeText.relative(t - 60 * 60_000L, t));
        assertEquals("לפני שעתיים", TimeText.relative(t - 2 * 3_600_000L, t));
        assertEquals("לפני 3 שעות", TimeText.relative(t - 3 * 3_600_000L, t));
        assertEquals("אתמול", TimeText.relative(t - 26 * 3_600_000L, t));
        assertEquals("לפני יומיים", TimeText.relative(t - 2 * Freshness.DAY, t));
        assertEquals("לפני 5 ימים", TimeText.relative(t - 5 * Freshness.DAY, t));
        assertEquals("לפני שבוע", TimeText.relative(t - 8 * Freshness.DAY, t));
        assertEquals("לפני חודש", TimeText.relative(t - 35 * Freshness.DAY, t));
        assertEquals(TimeText.LRI + "18/09/2026 14:23" + TimeText.PDI + " · לפני 52 דקות", TimeText.wall(TimeText.parse(T_1423), t));
    }

    // ---------- freshness / stale / unknown ----------

    @Test public void cadenceParserIsBoundedWithFallback() {
        assertEquals(Freshness.DAY, Freshness.parseCadenceMillis("daily"));
        assertEquals(7 * Freshness.DAY, Freshness.parseCadenceMillis("Weekly"));
        assertEquals(14 * Freshness.DAY, Freshness.parseCadenceMillis("bi-weekly"));
        assertEquals(3 * Freshness.DAY, Freshness.parseCadenceMillis("every 3 days"));
        assertEquals(7 * Freshness.DAY / 2, Freshness.parseCadenceMillis("2x/week"));
        assertEquals(Freshness.DAY, Freshness.parseCadenceMillis("יומי"));
        assertEquals(-1, Freshness.parseCadenceMillis("whenever"));
        Freshness f = Freshness.of(NOW - Freshness.DAY, "whenever", NOW);
        assertTrue(f.cadenceAssumed);
        assertEquals(Freshness.State.FRESH, f.state);
        assertEquals("שבועי (הנחה)", f.cadenceLabel);
    }

    @Test public void freshnessStatesFollowCadence() {
        assertEquals(Freshness.State.FRESH, Freshness.of(NOW - 5 * Freshness.HOUR, "daily", NOW).state);
        assertEquals(Freshness.State.AGING, Freshness.of(NOW - 30 * Freshness.HOUR, "daily", NOW).state);
        assertEquals(Freshness.State.STALE, Freshness.of(NOW - 3 * Freshness.DAY, "daily", NOW).state);
        Freshness unknown = Freshness.of(-1, "daily", NOW);
        assertEquals(Freshness.State.UNKNOWN, unknown.state);
        assertEquals("אין חותמת פעילות עדכנית", unknown.note());
        assertEquals("המידע ישן ביחס לקצב הצפוי (יומי)", Freshness.of(NOW - 3 * Freshness.DAY, "daily", NOW).note());
        assertEquals("ישן", Hebrew.freshness(Freshness.State.STALE));
        assertEquals("לא ידוע", Hebrew.freshness(Freshness.State.UNKNOWN));
    }

    // ---------- urgency ordering ----------

    @Test public void urgencyOrderingPutsNeedsArielRedAndStaleFirst() throws Exception {
        Portfolio p = Portfolio.from(liveShapedBody(), NOW, false);
        List<String> order = new ArrayList<>();
        for (Project x : p.projects) order.add(x.id);
        // P-005: needs Ariel + red + stale; P-002: needs Ariel; P-004: user test; then calm ones by recency; P-003 unknown last.
        assertEquals("P-005", order.get(0));
        assertEquals("P-002", order.get(1));
        assertEquals("P-004", order.get(2));
        assertEquals("P-003", order.get(order.size() - 1));
        assertEquals(3, p.attention().size());
        assertEquals(3, p.calm().size());
    }

    // ---------- canonical project count / mapping ----------

    @Test public void canonicalSixProjectsAreAllPresentAndInfrastructureIsSeparate() throws Exception {
        Portfolio p = Portfolio.from(liveShapedBody(), NOW, false);
        assertEquals(6, p.projects.size());
        List<String> names = new ArrayList<>();
        for (Project x : p.projects) names.add(x.name);
        assertTrue("Ariel Life OS must not be omitted", names.contains("Ariel Life OS"));
        assertTrue(names.contains("Household OS"));
        assertTrue(names.contains("Personal News Radar"));
        assertTrue(names.contains("Tom AI Learning"));
        assertTrue(names.contains("Nutrition App"));
        assertTrue(names.contains("Chief of Staff"));
        assertFalse("Control Tower is infrastructure, not a child project", names.contains("AI Control Tower"));
        assertEquals(1, p.infrastructure.size());
        assertEquals("AI Control Tower", p.infrastructure.get(0).name);
        assertEquals(1, p.red);
        assertEquals(1, p.watch);
        assertEquals(4, p.green);
        assertEquals(1, p.stale);
        assertEquals(1, p.unknownActivity);
        assertEquals(2, p.contractVersion);
        assertTrue(p.serverSnapshotAt > 0);
    }

    @Test public void projectActivityIsDistinctFromControlCheck() throws Exception {
        Portfolio p = Portfolio.from(liveShapedBody(), NOW, false);
        Project life = null;
        for (Project x : p.projects) if (x.id.equals("P-001")) life = x;
        assertEquals("18/09/2026 14:23", TimeText.absolutePlain(life.lastProgressMillis));
        assertEquals("18/09/2026 15:00", TimeText.absolutePlain(life.lastControlCheckMillis));
        assertTrue(life.lastProgressMillis != life.lastControlCheckMillis);
        Project news = null;
        for (Project x : p.projects) if (x.id.equals("P-003")) news = x;
        assertEquals(-1, news.lastProgressMillis);
        assertEquals(Freshness.State.UNKNOWN, news.freshness.state);
        assertTrue("control check must not masquerade as activity", news.lastControlCheckMillis > 0);
    }

    @Test public void v1GatewayPayloadDegradesToUnknownActivityNotToControlCheck() throws Exception {
        JSONObject v1 = new JSONObject().put("id", "P-001").put("name", "Ariel Life OS").put("rag", "GREEN")
                .put("lifecycle", "Active").put("last_check", T_CHECK);
        JSONObject body = new JSONObject().put("projects", new JSONArray().put(v1));
        Portfolio p = Portfolio.from(body, NOW, false);
        assertEquals(1, p.contractVersion);
        Project x = p.projects.get(0);
        assertEquals(-1, x.lastProgressMillis);
        assertEquals(Freshness.State.UNKNOWN, x.freshness.state);
        assertEquals("18/09/2026 15:00", TimeText.absolutePlain(x.lastControlCheckMillis));
    }

    @Test public void arielActionPrefersHisInputThenBlockerThenNext() throws Exception {
        Portfolio p = Portfolio.from(liveShapedBody(), NOW, false);
        for (Project x : p.projects) {
            if (x.id.equals("P-002")) assertEquals("Decide X", x.arielAction());
            if (x.id.equals("P-004")) assertEquals("N", x.arielAction());
            if (x.id.equals("P-001")) assertEquals("N", x.arielAction());
        }
    }
}
