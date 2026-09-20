package com.ariel.controltower.model;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 0.11.0 — the human layer vs the machine layer, label fit, latency instrumentation.
 * Every Ariel-facing string must be short management Hebrew; every structured fact must survive untouched.
 */
public class HumanLayerTest {
    private static final long NOW = ZonedDateTime.of(2026, 9, 20, 22, 0, 0, 0, TimeText.ISRAEL).toInstant().toEpochMilli();
    private static final String HEB = ".*[\\u0590-\\u05FF].*";

    private static JSONObject row(String id, String name) throws Exception {
        return new JSONObject().put("id", id).put("name", name).put("role", "project").put("lifecycle", "Active").put("rag", "GREEN")
                .put("last_meaningful_progress", "2026-09-18T11:23:00Z").put("expected_cadence", "weekly");
    }

    // ---------- labels: Hebrew, short, never technical ----------

    @Test public void everyLabelConstantIsHebrewAndHumanLayer() throws Exception {
        int checked = 0;
        for (Field f : Labels.class.getDeclaredFields()) {
            if (!Modifier.isStatic(f.getModifiers())) continue;
            Object v = f.get(null);
            if (v instanceof String) {
                String s = (String) v;
                assertTrue(f.getName() + " must be Hebrew: " + s, s.matches(HEB));
                assertTrue(f.getName() + " leaks technical vocabulary: " + s, UserMessage.isHumanLayer(s));
                checked++;
            }
        }
        assertTrue(checked > 30);
    }

    @Test public void navigationLabelsFitOneLineAt360dpLargeFont() {
        assertEquals(5, Labels.NAV.length);
        assertEquals(Labels.NAV.length, Labels.NAV_GLYPH.length);
        for (String n : Labels.NAV) {
            assertTrue(n, n.length() <= Labels.NAV_MAX_CHARS);
            assertFalse(n, n.contains(" "));
        }
        for (String g : Labels.NAV_GLYPH) assertEquals(1, g.codePointCount(0, g.length()));
    }

    @Test public void topActionsAndStatusChipsAreShortEnoughNotToWrap() {
        String[] actions = {Labels.ACTION_REFRESH, Labels.ACTION_BACK, Labels.ACTION_ALL_PROJECTS, Labels.ACTION_NEW_IDEA,
                Labels.ACTION_NEW_COMMAND, Labels.ACTION_CLOSE, Labels.ACTION_CLEAR_FILTER, Labels.ACTION_LEGEND, Labels.ACTION_LEGEND_CLOSE};
        for (String a : actions) assertTrue(a, a.length() <= Labels.ACTION_MAX_CHARS);
        for (Status s : Status.values()) {
            assertTrue(s.label, s.label.length() <= 12);
            assertTrue(s.meaning, s.meaning.matches(HEB) && UserMessage.isHumanLayer(s.meaning));
        }
        for (OsAlignment a : OsAlignment.values()) {
            assertTrue(a.label, a.label.length() <= 14);
            assertTrue(a.label, a.label.matches(HEB) && UserMessage.isHumanLayer(a.label));
            assertTrue(a.meaning, a.meaning.matches(HEB) && UserMessage.isHumanLayer(a.meaning));
            assertFalse(a.label, a.label.contains("OS")); // the raw enum vocabulary stays behind the scenes
        }
        assertTrue(Labels.FILTER_STALE.length() <= 10);
        assertTrue(Labels.FILTER_OS.length() <= 12);
    }

    @Test public void summariesReadAsManagementHebrew() {
        assertEquals("6 פרויקטים · 3 תקינים · 2 צריכים אותך · אחד חסום", Labels.portfolioSummary(6, 3, 2, 1, 0));
        assertEquals("1 פרויקטים · אחד צריך אותך", Labels.portfolioSummary(1, 0, 1, 0, 0));
        assertEquals("2 פרויקטים לא מסונכרנים למערכת ההפעלה", Labels.osSummary(6, 4));
        assertEquals("פרויקט אחד לא מסונכרן למערכת ההפעלה", Labels.osSummary(6, 5));
        assertEquals("כל הפרויקטים מסונכרנים למערכת ההפעלה", Labels.osSummary(3, 3));
        assertEquals("", Labels.osSummary(0, 0));
        assertEquals("3 פריטים פתוחים אצל הסגן", Labels.deputySummary(3));
        assertEquals("אין פריטים פתוחים אצל הסגן", Labels.deputySummary(0));
    }

    // ---------- errors: human sentence on top, technical text kept ----------

    @Test public void gatewayFailuresBecomeOneHebrewManagementSentence() {
        String[][] cases = {
                {"unauthorized", "", "החיבור למגדל הפיקוח נדחה — נדרשת ריצת תיקון ב-GPT/Claude"},
                {"unknown_action", "", "מגדל הפיקוח צריך עדכון — נדרשת ריצת תיקון ב-GPT/Claude"},
                {"post_only", "", "החיבור למגדל הפיקוח שבור — נדרשת ריצת תיקון ב-GPT/Claude"},
                {"action_failed", "", "הפעולה לא נשמרה — נדרשת ריצת תיקון ב-GPT/Claude"},
                {"", "השער לא ענה בזמן.", "מגדל הפיקוח לא ענה בזמן — ננסה שוב ברקע"},
                {"", "לא ניתן להגיע לשער. בדוק חיבור לרשת.", "אין חיבור לרשת — המידע השמור מוצג"},
                {"", "השער החזיר דף במקום JSON. בדוק שהפריסה היא Web App עם גישה 'Anyone'.", "החיבור למגדל הפיקוח שבור — נדרשת ריצת תיקון ב-GPT/Claude"},
                {"something_new", "", "האפליקציה נתקלה בבעיה — נדרשת ריצת תיקון ב-GPT/Claude"},
        };
        for (String[] c : cases) {
            String h = UserMessage.human(c[0], c[1], 200);
            assertEquals(c[0] + "/" + c[1], c[2], h);
            assertTrue(h, UserMessage.isHumanLayer(h));
        }
    }

    @Test public void technicalDetailIsPreservedVerbatim() {
        String t = UserMessage.technical("action_failed", "", 200, "unknown project_id");
        assertEquals("error=action_failed · unknown project_id · http 200", t);
        assertEquals("transport: השער לא ענה בזמן. · http 0", UserMessage.technical("", "השער לא ענה בזמן.", 0, "").replace(" · http 0", "") + " · http 0");
        assertFalse(UserMessage.isHumanLayer("GATEWAY_TOKEN rejected"));
        assertFalse(UserMessage.isHumanLayer("dogfood suite failed"));
        assertTrue(UserMessage.isHumanLayer("האפליקציה תקועה — נדרשת ריצת תיקון"));
    }

    // ---------- project: human line vs technical lines ----------

    @Test public void humanLineIsEmptyForOkAndOneSentenceOtherwise() throws Exception {
        assertEquals("", Project.from(row("P-1", "A"), NOW).humanLine());
        assertEquals("לאשר תקציב", Project.from(row("P-1", "A").put("needs_ariel", true).put("ariel_input", "לאשר תקציב"), NOW).humanLine());
        assertEquals("לבדוק את הגרסה בטלפון ולדווח", Project.from(row("P-1", "A").put("lifecycle", "USER TEST REQUIRED"), NOW).humanLine());
        assertEquals("חסום: אין גישה", Project.from(row("P-1", "A").put("blocker", "אין גישה"), NOW).humanLine());
        assertEquals("דורש טיפול לפני שהמצב מחמיר", Project.from(row("P-1", "A").put("rag", "RED"), NOW).humanLine());
        assertEquals("", Project.from(row("P-1", "A").put("rag", "YELLOW"), NOW).humanLine());
        Project p = Project.from(row("P-1", "A").put("rag", "YELLOW").put("risk", "סחיפה"), NOW);
        assertEquals("סחיפה", p.humanLine());
        assertTrue(UserMessage.isHumanLayer(p.humanLine()));
    }

    @Test public void osChipOnlyWhenActionable_andActionIsHuman() throws Exception {
        assertFalse(Project.from(row("P-1", "A"), NOW).osNeedsChip()); // UNKNOWN stays quiet on rows
        assertFalse(Project.from(row("P-1", "A").put("os_alignment", "CURRENT"), NOW).osNeedsChip());
        Project drift = Project.from(row("P-1", "A").put("os_alignment", "VERSION_DRIFT"), NOW);
        assertTrue(drift.osNeedsChip());
        assertEquals("נדרשת ריצת סנכרון בפרויקט", drift.osHumanAction());
        Project withBoardAction = Project.from(row("P-1", "A").put("os_alignment", "VERSION_DRIFT").put("os_sync_action", "להריץ סנכרון OS בפרויקט ולרשום קבלה חדשה"), NOW);
        assertEquals("להריץ סנכרון OS בפרויקט ולרשום קבלה חדשה", withBoardAction.osHumanAction());
        assertEquals("לא מסונכרן", drift.osAlignment.label);
        assertEquals("הפרויקט לא מסונכרן למערכת ההפעלה", drift.osAlignment.meaning);
    }

    @Test public void machineLayerSurvivesTheHumanSimplification() throws Exception {
        JSONObject raw = row("P-2", "Momentum OS")
                .put("short_description", "אפליקציית ניהול בית").put("status_bucket", "WATCH").put("status_reason", "צהוב בלוח")
                .put("os_alignment", "VERSION_DRIFT").put("last_os_check", "2026-08-30T08:00:00Z").put("os_version_seen", "1.0.0")
                .put("os_change_marker", "OS-2026-08-30").put("os_current_marker", "OS-2026-09-19-01")
                .put("os_evidence", "receipt · https://drive.google.com/x/1").put("os_sync_action", "להריץ סנכרון")
                .put("latest_activity_at", "2026-09-19T06:59:00Z").put("latest_activity_source", "github").put("latest_activity_type", "commit")
                .put("latest_meaningful_activity_at", "2026-09-18T11:23:00Z").put("last_control_check", "2026-09-19T05:00:00Z")
                .put("latest_activity_evidence_url", "https://github.com/x/y/commit/abc");
        Project p = Project.from(raw, NOW);
        // raw is the same object the gateway sent, untouched
        assertTrue(p.raw == raw);
        assertEquals("VERSION_DRIFT", p.raw.getString("os_alignment"));
        String tech = String.join("\n", p.technicalLines());
        for (String must : new String[]{"project_id: P-2", "status_bucket: WATCH", "status_reason: צהוב בלוח", "os_alignment: VERSION_DRIFT",
                "last_os_check: 2026-08-30T08:00:00Z", "os_version_seen: 1.0.0", "os_change_marker: OS-2026-08-30", "os_current_marker: OS-2026-09-19-01",
                "os_evidence: receipt · https://drive.google.com/x/1", "os_sync_action: להריץ סנכרון", "latest_activity_at: 2026-09-19T06:59:00Z",
                "source: github", "latest_meaningful_activity_at: 2026-09-18T11:23:00Z", "last_control_check: 2026-09-19T05:00:00Z",
                "expected_cadence: weekly", "evidence_url: https://github.com/x/y/commit/abc"}) {
            assertTrue("missing: " + must, tech.contains(must));
        }
        // and none of it leaks into the human row
        assertEquals("", p.humanLine().replace("סחיפה", "")); // WATCH without risk → no line
        assertEquals("Momentum OS — אפליקציית ניהול בית", p.compactTitle());
        assertTrue(UserMessage.isHumanLayer(p.updatedLine(NOW)));
    }

    @Test public void statusBucketDerivedLocallyIsMarkedAsSuchInTheMachineLayer() throws Exception {
        Project p = Project.from(row("P-1", "A").put("rag", "RED"), NOW);
        assertTrue(String.join("\n", p.technicalLines()).contains("status_bucket: AT_RISK (client-derived)"));
        Project q = Project.from(row("P-1", "A").put("status_bucket", "AT_RISK"), NOW);
        assertTrue(String.join("\n", q.technicalLines()).contains("status_bucket: AT_RISK\n"));
    }

    @Test public void updatedLineIsRelativeHebrewOrNoUpdate() throws Exception {
        Project p = Project.from(row("P-1", "A").put("latest_activity_at", "2026-09-18T19:00:00Z"), NOW);
        assertEquals("עודכן לפני יומיים", p.updatedLine(NOW));
        Project none = Project.from(row("P-1", "A").put("last_meaningful_progress", ""), NOW);
        assertEquals("לא התקבל עדכון", none.updatedLine(NOW));
    }

    // ---------- deputy: never the raw technical sentence on top ----------

    @Test public void deputyProblemsAreHumanLayerEvenForTechnicalEvidence() throws Exception {
        JSONArray items = new JSONArray()
                .put(new JSONObject().put("report_text", "[Chief of Staff] CI pipeline failed: lint errors in src/adapters/control-tower.ts (contract 5 payload)").put("source", "agent_report").put("status", "NEW").put("received_at", "2026-09-20T18:00:00Z"))
                .put(new JSONObject().put("report_text", "Gateway sync 401 unauthorized token rotated").put("source", "agent_report").put("status", "NEW").put("received_at", "2026-09-20T17:00:00Z"));
        List<DeputyDigest.Item> out = DeputyDigest.from(items, List.of("Chief of Staff"), NOW);
        for (DeputyDigest.Item it : out) {
            assertTrue(it.problem, UserMessage.isHumanLayer(it.problem));
            assertTrue(it.impact, UserMessage.isHumanLayer(it.impact));
            assertTrue(it.nextAction, UserMessage.isHumanLayer(it.nextAction));
            assertFalse(it.evidence.isEmpty()); // technical text is still there, behind "ראיות"
        }
        assertEquals("הבדיקות האוטומטיות נכשלות ב-Chief of Staff", out.get(0).problem);
        assertTrue(out.get(0).evidence.get(0).contains("lint errors"));
    }

    // ---------- perf instrumentation ----------

    @Test public void perfRecordsTapToFrameAndReportsMedianMax() {
        Perf.clear();
        final long[] clock = {1000};
        Perf.setClock(() -> clock[0]);
        for (long ms : new long[]{30, 80, 40}) { Perf.Token t = Perf.begin("tab:עכשיו"); clock[0] += ms; Perf.end(t); }
        Perf.Token slow = Perf.begin("open:project"); clock[0] += 400; assertEquals(400, Perf.end(slow));
        assertEquals(40, Perf.median("tab:עכשיו"));
        assertEquals(400, Perf.median("open:project"));
        assertEquals(-1, Perf.median("nothing"));
        String r = Perf.report();
        assertTrue(r, r.contains("tab:עכשיו: 3× · חציון 40 מ״ש · מקסימום 80 מ״ש"));
        assertTrue(r, r.contains("open:project: 1× · חציון 400 מ״ש · מקסימום 400 מ״ש"));
        List<String> logged = new ArrayList<>();
        Perf.setSink(logged::add);
        Perf.Token t = Perf.begin("x"); clock[0] += 200; Perf.end(t);
        assertEquals("perf x 200ms SLOW", logged.get(0));
        Perf.setSink(null);
        Perf.setClock(null);
        Perf.clear();
    }

    @Test public void perfRingBufferIsBounded() {
        Perf.clear();
        for (int i = 0; i < Perf.CAPACITY + 25; i++) Perf.end(Perf.begin("n"));
        assertEquals(Perf.CAPACITY, Perf.samples().size());
        Perf.clear();
        assertEquals("אין עדיין מדידות", Perf.report());
    }
}
