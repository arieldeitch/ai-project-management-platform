package com.ariel.controltower.model;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.List;

/**
 * 0.10.0 model coverage: deterministic status taxonomy + filters, OS alignment (evidence only, never from
 * activity), ideas manual order (optimistic board), deputy dedupe/humanisation, build identity, Hebrew
 * surface strings and v4→v5 backward compatibility.
 */
public class ControlTower010Test {
    private static final long NOW = ZonedDateTime.of(2026, 9, 19, 10, 0, 0, 0, TimeText.ISRAEL).toInstant().toEpochMilli();

    private static JSONObject row(String id, String name) throws Exception {
        return new JSONObject().put("id", id).put("name", name).put("role", "project").put("lifecycle", "Active").put("rag", "GREEN")
                .put("last_meaningful_progress", "2026-09-18T11:23:00Z").put("expected_cadence", "weekly");
    }

    private static Portfolio portfolio(JSONObject... rows) throws Exception {
        JSONArray arr = new JSONArray();
        for (JSONObject r : rows) arr.put(r);
        return Portfolio.from(new JSONObject().put("projects", arr).put("snapshot_at", "2026-09-19T06:00:00Z").put("contract_version", 5), NOW, false);
    }

    // ---------- status taxonomy: one deterministic bucket, Hebrew meaning + rule ----------

    @Test public void statusRulesAreDeterministicAndOrdered() throws Exception {
        assertEquals(Status.NEEDS_ARIEL, Project.from(row("P-1", "A").put("needs_ariel", true).put("rag", "RED").put("blocker", "x"), NOW).status);
        assertEquals(Status.NEEDS_ARIEL, Project.from(row("P-1", "A").put("lifecycle", "USER TEST REQUIRED"), NOW).status);
        assertEquals(Status.BLOCKED, Project.from(row("P-1", "A").put("blocker", "waiting for API key").put("rag", "RED"), NOW).status);
        assertEquals(Status.BLOCKED, Project.from(row("P-1", "A").put("lifecycle", "blocked"), NOW).status);
        assertEquals(Status.AT_RISK, Project.from(row("P-1", "A").put("rag", "RED"), NOW).status);
        assertEquals(Status.WATCH, Project.from(row("P-1", "A").put("rag", "YELLOW"), NOW).status);
        assertEquals(Status.WATCH, Project.from(row("P-1", "A").put("rag", ""), NOW).status);
        assertEquals(Status.OK, Project.from(row("P-1", "A"), NOW).status);
    }

    @Test public void everyStatusHasHebrewLabelMeaningAndRule() {
        for (Status s : Status.values()) {
            assertTrue(s.name(), s.label.matches(".*[\\u0590-\\u05FF].*"));
            assertTrue(s.name(), s.meaning.matches(".*[\\u0590-\\u05FF].*"));
            assertTrue(s.name(), s.rule.matches(".*[\\u0590-\\u05FF].*"));
        }
        assertEquals("צריך אותך", Status.NEEDS_ARIEL.label);
        assertEquals("תקין", Status.OK.label);
    }

    @Test public void statusReasonExplainsWhyInHebrew() throws Exception {
        Project p = Project.from(row("P-1", "A").put("blocker", "אין גישה ל-Drive"), NOW);
        assertEquals("חסום: אין גישה ל-Drive", p.statusReason);
        Project q = Project.from(row("P-2", "B").put("needs_ariel", true).put("ariel_input", "לאשר תקציב"), NOW);
        assertEquals("צריך אותך: לאשר תקציב", q.statusReason);
        Project r = Project.from(row("P-3", "C"), NOW);
        assertEquals("ירוק בלוח — אין חסם ואין החלטה פתוחה", r.statusReason);
    }

    @Test public void gatewayStatusBucketWinsOverLocalRule() throws Exception {
        Project p = Project.from(row("P-1", "A").put("status_bucket", "WATCH").put("status_reason", "צהוב בלוח: סחיפה"), NOW);
        assertEquals(Status.WATCH, p.status);
        assertEquals("צהוב בלוח: סחיפה", p.statusReason);
        Project unknownBucket = Project.from(row("P-1", "A").put("status_bucket", "WEIRD"), NOW);
        assertEquals(Status.OK, unknownBucket.status);
    }

    @Test public void homeFiltersCountAndSelectByStatusAndStale() throws Exception {
        Portfolio p = portfolio(
                row("P-1", "A").put("needs_ariel", true),
                row("P-2", "B").put("blocker", "x"),
                row("P-3", "C").put("rag", "RED").put("last_meaningful_progress", "2026-08-01T00:00:00Z"),
                row("P-4", "D"),
                row("P-5", "E"));
        assertEquals(1, p.count(Status.NEEDS_ARIEL));
        assertEquals(1, p.count(Status.BLOCKED));
        assertEquals(1, p.count(Status.AT_RISK));
        assertEquals(0, p.count(Status.WATCH));
        assertEquals(2, p.count(Status.OK));
        assertEquals(2, p.filter(Status.OK, false).size());
        assertEquals(5, p.filter(null, false).size());
        assertEquals(1, p.stale);
        assertEquals("C", p.filter(null, true).get(0).name);
        assertEquals(0, p.filter(Status.OK, true).size());
    }

    // ---------- compact vs detail ----------

    @Test public void compactTitleUsesShortDescriptionOnlyWhenPresent() throws Exception {
        assertEquals("Momentum OS — אפליקציית ניהול בית", Project.from(row("P-2", "Momentum OS").put("short_description", " אפליקציית ניהול בית "), NOW).compactTitle());
        assertEquals("Momentum OS", Project.from(row("P-2", "Momentum OS"), NOW).compactTitle());
    }

    // ---------- OS alignment ----------

    @Test public void osAlignmentParsesAllStatesAndDefaultsToUnknown() {
        assertEquals(OsAlignment.CURRENT, OsAlignment.parse("CURRENT"));
        assertEquals(OsAlignment.VERSION_DRIFT, OsAlignment.parse("version drift"));
        assertEquals(OsAlignment.NEVER_SEEN, OsAlignment.parse("never-seen"));
        assertEquals(OsAlignment.ACCESS_FAILED, OsAlignment.parse("ACCESS_FAILED"));
        assertEquals(OsAlignment.UNKNOWN, OsAlignment.parse(""));
        assertEquals(OsAlignment.UNKNOWN, OsAlignment.parse("weird"));
        assertTrue(OsAlignment.VERSION_DRIFT.needsAction());
        assertFalse(OsAlignment.CURRENT.needsAction());
        for (OsAlignment a : OsAlignment.values()) assertTrue(a.label.matches(".*[\\u0590-\\u05FF].*"));
    }

    @Test public void freshGitActivityNeverMakesAProjectOsCurrent() throws Exception {
        // Live activity from github, one minute ago, meaningful — and still no OS receipt.
        Project p = Project.from(row("P-1", "A")
                .put("latest_activity_at", "2026-09-19T06:59:00Z").put("latest_activity_type", "commit").put("latest_activity_source", "github")
                .put("latest_meaningful_activity_at", "2026-09-19T06:59:00Z"), NOW);
        assertEquals(Freshness.State.FRESH, p.freshness.state);
        assertEquals(OsAlignment.UNKNOWN, p.osAlignment);
        assertEquals(-1, p.lastOsCheckMillis);
        Portfolio pf = portfolio(row("P-1", "A").put("latest_activity_at", "2026-09-19T06:59:00Z"));
        assertEquals(0, pf.osAligned);
        assertEquals(1, pf.osNeedsAction);
    }

    @Test public void osClockIsSeparateFromActivityAndControlClocks() throws Exception {
        Project p = Project.from(row("P-1", "A")
                .put("last_control_check", "2026-09-19T05:00:00Z")
                .put("os_alignment", "CURRENT").put("last_os_check", "2026-09-10T08:00:00Z")
                .put("os_change_marker", "OS-2026-09-10").put("os_current_marker", "OS-2026-09-10")
                .put("os_evidence", "receipt: https://drive.google.com/x/receipt-1 (Drive)"), NOW);
        assertEquals(OsAlignment.CURRENT, p.osAlignment);
        assertEquals(TimeText.parse("2026-09-10T08:00:00Z"), p.lastOsCheckMillis);
        assertEquals(TimeText.parse("2026-09-19T05:00:00Z"), p.lastControlCheckMillis);
        assertEquals(TimeText.parse("2026-09-18T11:23:00Z"), p.latestMeaningfulActivityMillis);
        assertEquals("https://drive.google.com/x/receipt-1", p.osEvidenceUrl());
    }

    @Test public void osAlignmentSummaryCountsOnlyCurrentAsAligned() throws Exception {
        Portfolio p = portfolio(
                row("P-1", "A").put("os_alignment", "CURRENT"),
                row("P-2", "B").put("os_alignment", "VERSION_DRIFT"),
                row("P-3", "C").put("os_alignment", "NEVER_SEEN"),
                row("P-4", "D"));
        assertEquals(1, p.osAligned);
        assertEquals(3, p.osNeedsAction);
    }

    // ---------- backward compatibility ----------

    @Test public void v4PayloadWithoutNewFieldsStillRenders() throws Exception {
        JSONObject v4 = new JSONObject().put("projects", new JSONArray().put(row("P-1", "A").put("rag", "YELLOW")))
                .put("snapshot_at", "2026-09-19T06:00:00Z").put("contract_version", 4);
        Portfolio p = Portfolio.from(v4, NOW, false);
        Project x = p.projects.get(0);
        assertEquals(4, p.contractVersion);
        assertEquals("", x.shortDescription);
        assertEquals("A", x.compactTitle());
        assertEquals(Status.WATCH, x.status);
        assertEquals("צהוב בלוח — במעקב", x.statusReason);
        assertEquals(OsAlignment.UNKNOWN, x.osAlignment);
        assertEquals("", x.osSyncAction);
    }

    // ---------- ideas: manual order ----------

    private static JSONArray ideas() throws Exception {
        return new JSONArray()
                .put(new JSONObject().put("idea_id", "I-1").put("title", "א").put("planning_bucket", "NOW").put("manual_order", 10).put("updated_at", "2026-09-01"))
                .put(new JSONObject().put("idea_id", "I-2").put("title", "ב").put("planning_bucket", "NOW").put("manual_order", 20).put("updated_at", "2026-09-02"))
                .put(new JSONObject().put("idea_id", "I-3").put("title", "ג").put("planning_bucket", "LATER").put("updated_at", "2026-09-03"))
                .put(new JSONObject().put("idea_id", "I-4").put("title", "ד").put("updated_at", "2026-09-04"));
    }

    @Test public void ideasSortByBucketThenManualOrderThenRecency() throws Exception {
        IdeaBoard b = IdeaBoard.from(ideas());
        List<String> ids = new java.util.ArrayList<>();
        for (IdeaBoard.Idea i : b.all()) ids.add(i.id);
        assertEquals(Arrays.asList("I-1", "I-2", "I-4", "I-3"), ids); // unordered LATER ideas: newest first
        assertEquals("LATER", b.find("I-4").bucket); // missing bucket → LATER, never invented as NOW
    }

    @Test public void moveAcrossBucketsRenumbersAndProducesReorderPayload() throws Exception {
        IdeaBoard b = IdeaBoard.from(ideas());
        assertTrue(b.move("I-3", "NOW", 0));
        List<IdeaBoard.Idea> now = b.inBucket("NOW");
        assertEquals(Arrays.asList("I-3", "I-1", "I-2"), Arrays.asList(now.get(0).id, now.get(1).id, now.get(2).id));
        assertEquals(10, now.get(0).order);
        assertEquals(20, now.get(1).order);
        assertEquals(30, now.get(2).order);
        JSONArray payload = b.reorderPayload();
        assertEquals(4, payload.length());
        boolean sawMoved = false;
        for (int i = 0; i < payload.length(); i++) {
            JSONObject o = payload.getJSONObject(i);
            assertTrue(o.has("idea_id") && o.has("planning_bucket") && o.has("manual_order"));
            if (o.getString("idea_id").equals("I-3")) { sawMoved = true; assertEquals("NOW", o.getString("planning_bucket")); assertEquals(10, o.getInt("manual_order")); }
        }
        assertTrue(sawMoved);
        assertFalse(b.move("I-9", "NOW", 0));
        assertFalse(b.move("I-1", "SOMEDAY", 0));
    }

    @Test public void nudgeMovesOneStepAndClampsAtEdges() throws Exception {
        IdeaBoard b = IdeaBoard.from(ideas());
        assertTrue(b.nudge("I-2", -1));
        assertEquals("I-2", b.inBucket("NOW").get(0).id);
        assertTrue(b.nudge("I-2", -1)); // already first: stays first, still a valid no-op
        assertEquals("I-2", b.inBucket("NOW").get(0).id);
        assertTrue(b.nudge("I-1", +5));
        assertEquals("I-1", b.inBucket("NOW").get(1).id);
    }

    @Test public void ideaBucketLabelsAndStagesAreHebrew() {
        assertEquals(Arrays.asList("עכשיו", "הבא", "בהמשך"), Arrays.asList(IdeaBoard.BUCKET_LABELS));
        assertEquals("בהמשך", IdeaBoard.bucketLabel("nope"));
        assertTrue(Hebrew.ideaStage("INBOX").matches(".*[\\u0590-\\u05FF].*"));
        assertTrue(Hebrew.ideaStage("READY").matches(".*[\\u0590-\\u05FF].*"));
    }

    // ---------- deputy digest ----------

    private static JSONObject inbox(String text, String source, String status, String at) throws Exception {
        return new JSONObject().put("report_text", text).put("source", source).put("status", status).put("received_at", at);
    }

    @Test public void deputyMergesRepeatedTechnicalEventsIntoOneHumanItem() throws Exception {
        JSONArray items = new JSONArray()
                .put(inbox("EXTERNAL_PROJECT_REPORT_V1 [Nutrition App] dogfood suite failed: 3 tests failing at 2026-09-19T05:00:00Z run 8871", "agent_report", "NEW", "2026-09-19T05:00:00Z"))
                .put(inbox("EXTERNAL_PROJECT_REPORT_V1 [Nutrition App] dogfood suite failed: 4 tests failing at 2026-09-19T06:00:00Z run 8872", "agent_report", "NEW", "2026-09-19T06:00:00Z"))
                .put(inbox("EXTERNAL_PROJECT_REPORT_V1 [Nutrition App] dogfood suite failed: 4 tests failing at 2026-09-19T06:30:00Z run 8873", "agent_report", "NEW", "2026-09-19T06:30:00Z"));
        List<DeputyDigest.Item> out = DeputyDigest.from(items, Arrays.asList("Nutrition App", "Chief of Staff"), NOW);
        assertEquals(1, out.size());
        DeputyDigest.Item it = out.get(0);
        assertEquals(3, it.count);
        assertEquals(DeputyDigest.Kind.TECH_FAILURE, it.kind);
        assertEquals("Nutrition App", it.project);
        assertEquals("הבדיקות האוטומטיות נכשלות באפליקציית התזונה", it.problem);
        assertFalse(it.problem.toLowerCase().contains("dogfood"));
        assertFalse(it.problem.toLowerCase().contains("suite"));
        assertFalse(it.problem.toLowerCase().contains("ci"));
        assertTrue(it.impact.matches(".*[\\u0590-\\u05FF].*"));
        assertEquals("להעביר לקלוד לריצת תיקון", it.nextAction);
        assertEquals("Claude", it.owner);
        assertEquals(3, it.evidence.size());
        assertTrue(it.evidence.get(0).contains("run 8873")); // technical detail lives in evidence only
        assertEquals(TimeText.parse("2026-09-19T06:30:00Z"), it.lastSeenMillis);
    }

    @Test public void deputyKeepsDistinctProblemsSeparateAndOpenFirst() throws Exception {
        JSONArray items = new JSONArray()
                .put(inbox("Gateway sync failed: 401 unauthorized token", "agent_report", "DONE", "2026-09-19T07:00:00Z"))
                .put(inbox("APK 0.9.0 ready — user test in the phone required", "agent_report", "NEW", "2026-09-18T07:00:00Z"))
                .put(inbox("בדוק מה תקוע", "deputy_command", "NEW", "2026-09-17T07:00:00Z"));
        List<DeputyDigest.Item> out = DeputyDigest.from(items, Arrays.asList("Chief of Staff"), NOW);
        assertEquals(3, out.size());
        assertTrue(out.get(0).isOpen());
        assertTrue(out.get(1).isOpen());
        assertFalse(out.get(2).isOpen());
        assertEquals(DeputyDigest.Kind.SYNC_FAILURE, out.get(2).kind);
        assertEquals("הסנכרון אינו עובד", out.get(2).problem);
        assertEquals(DeputyDigest.Kind.USER_TEST, out.get(0).kind);
        assertEquals("אריאל", out.get(0).owner);
        assertEquals(DeputyDigest.Kind.COMMAND, out.get(1).kind);
        assertEquals("פקודה שלך: בדוק מה תקוע", out.get(1).problem);
        for (DeputyDigest.Kind k : DeputyDigest.Kind.values()) assertTrue(DeputyDigest.kindLabel(k).matches(".*[\\u0590-\\u05FF].*"));
    }

    @Test public void deputyReportDoesNotRepeatTheProjectNameAndPhoneTestIsAUserTest() throws Exception {
        JSONArray items = new JSONArray()
                .put(inbox("EXTERNAL_PROJECT_REPORT_V1\nTom AI Learning: גרסה 1.2 נבנתה, ממתינה לבדיקה בטלפון.", "share", "REPORTED", "2026-09-19T07:00:00Z"))
                .put(inbox("[Chief of Staff] weekly digest published", "share", "REPORTED", "2026-09-18T07:00:00Z"));
        List<DeputyDigest.Item> out = DeputyDigest.from(items, Arrays.asList("Tom AI Learning", "Chief of Staff"), NOW);
        DeputyDigest.Item tom = out.get(0);
        assertEquals(DeputyDigest.Kind.USER_TEST, tom.kind);
        assertEquals("גרסה מחכה לבדיקה שלך בלמידה של תום", tom.problem);
        assertEquals("אריאל", tom.owner);
        DeputyDigest.Item cos = out.get(1);
        assertEquals("התקבל דיווח מצ'יף", cos.problem);
        assertEquals("x", DeputyDigest.stripProjectPrefix("[Nutrition App] — x", "Nutrition App"));
        assertEquals("y", DeputyDigest.stripProjectPrefix("nutrition app: y", "Nutrition App"));
    }

    @Test public void deputySignatureIgnoresIdsHashesTimesAndCase() {
        String a = DeputyDigest.signature("Build 8871 FAILED at 2026-09-19T05:00:00Z sha 1a2b3c4d5e", "x");
        String b = DeputyDigest.signature("build 9001 failed at 2026-09-19T07:10:00Z sha ffeeddcc00", "x");
        assertEquals(a, b);
        assertFalse(a.equals(DeputyDigest.signature("build failed", "y")));
    }

    // ---------- build identity ----------

    private static final String RUNS = "{\"workflow_runs\":[{\"head_sha\":\"56a0be30aa11bb22cc33dd44ee55ff6677889900\",\"head_branch\":\"control-tower-apk-build\",\"updated_at\":\"2026-09-19T05:40:00Z\",\"created_at\":\"2026-09-19T05:30:00Z\"}]}";
    private static final String GRADLE = "android {\n defaultConfig {\n  versionCode 11\n  versionName '0.10.0'\n }\n}";

    @Test public void buildIdentityParsesWorkflowRunAndGradleWithoutInventing() {
        BuildIdentity latest = BuildIdentity.fromWorkflowRuns(RUNS, GRADLE);
        assertNotNull(latest);
        assertEquals("0.10.0", latest.versionName);
        assertEquals(11, latest.versionCode);
        assertEquals("56a0be30aa11", latest.sha);
        assertEquals("control-tower-apk-build", latest.ref);
        assertEquals(TimeText.parse("2026-09-19T05:40:00Z"), latest.builtAtMillis);
        BuildIdentity partial = BuildIdentity.fromWorkflowRuns(RUNS, null);
        assertNotNull(partial);
        assertEquals("", partial.versionName);
        assertEquals(-1, partial.versionCode);
        assertNull(BuildIdentity.fromWorkflowRuns("{\"workflow_runs\":[]}", GRADLE));
        assertNull(BuildIdentity.fromWorkflowRuns("<html>", GRADLE));
    }

    @Test public void installedVersusLatestComparesByVersionCodeThenBuildTime() {
        BuildIdentity latest = BuildIdentity.fromWorkflowRuns(RUNS, GRADLE);
        BuildIdentity installedOld = new BuildIdentity("0.9.0", 10, "abcdef012345", "control-tower-apk-build", TimeText.parse("2026-09-18T05:40:00Z"));
        BuildIdentity installedSame = new BuildIdentity("0.10.0", 11, "56a0be30aa11", "control-tower-apk-build", TimeText.parse("2026-09-19T05:40:00Z"));
        assertTrue(latest.isNewerThan(installedOld));
        assertFalse(latest.isNewerThan(installedSame));
        assertFalse(latest.isNewerThan(null));
        BuildIdentity noCode = BuildIdentity.fromWorkflowRuns(RUNS, null);
        BuildIdentity localDev = new BuildIdentity("0.10.0", -1, "0000000", "local", TimeText.parse("2026-09-01T00:00:00Z"));
        assertTrue(noCode.isNewerThan(localDev));
        String line = installedSame.line(NOW);
        assertTrue(line, line.startsWith("0.10.0 (11) · commit 56a0be30 · "));
        assertTrue(line, line.contains("19/09/2026 08:40"));
    }
}
