package com.ariel.controltower.model;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.List;

/**
 * Human layer v2 (0.12.0): a project card is a management indicator, not a diagnostic console.
 * Reproduces the 0.11.0 phone screenshot (English objective / next-action / blocker prose on cards) and
 * asserts that class of text can never reach a card again, while the machine layer keeps every field.
 */
public class HumanLayerV2Test {
    private static final long NOW = ZonedDateTime.of(2026, 9, 21, 9, 0, 0, 0, TimeText.ISRAEL).toInstant().toEpochMilli();

    /** The rows Ariel photographed, in the shape the live board sends them. */
    private static JSONArray screenshotRows() throws Exception {
        return new JSONArray()
                .put(row("P-007", "Fitness App Recovery", "RED", true)
                        .put("objective", "Recovery and revalidation of a previously built fitness app so it becomes a real, usable product.")
                        .put("next_action", "Confirm the exact existing fitness app/repository and its current state.")
                        .put("ariel_input", "Confirm the exact existing fitness app/repository to recover.")
                        .put("blocker", "Control delta: no canonical repo confirmed yet."))
                .put(row("P-002", "Household OS", "YELLOW", false)
                        .put("next_action", "Run the existing owner/family-device checklist and record results.")
                        .put("risk", "Control delta between board and repo state."))
                .put(row("P-008", "Irish Citizenship & Passport", "GREEN", true)
                        .put("objective", "Personal bureaucracy/document control for the Irish citizenship path.")
                        .put("ariel_input", "Provide/obtain the aunt's document map and the birth certificate scan."))
                .put(row("P-006", "Chief of Staff", "GREEN", false).put("short_description", "One front door for Ariel"))
                .put(row("P-003", "Personal News Radar", "GREEN", false).put("last_meaningful_progress", "2026-08-01T00:00:00Z"))
                .put(row("P-005", "Nutrition App", "RED", false).put("os_alignment", "ACCESS_FAILED"))
                .put(row("P-004", "Tom AI Learning", "GREEN", false).put("lifecycle", "USER TEST REQUIRED"))
                .put(row("P-001", "Ariel Life OS", "GREEN", false));
    }

    private static JSONObject row(String id, String name, String rag, boolean needsAriel) throws Exception {
        return new JSONObject().put("id", id).put("name", name).put("role", "project").put("lifecycle", "Active").put("rag", rag)
                .put("needs_ariel", needsAriel).put("last_meaningful_progress", "2026-09-19T11:23:00Z").put("expected_cadence", "weekly");
    }

    private static final String[] FORBIDDEN_FRAGMENTS = {
            "Recovery and revalidation", "Confirm the exact existing", "Control delta", "Run the existing owner", "Personal bureaucracy", "Provide/obtain",
            "objective", "next_action", "blocker", "evidence", "status_bucket", "os_alignment", "OS-2026", "contract", "gateway"};

    private static void assertCardIsHumanLayer(ProjectCard c) {
        for (String field : new String[]{c.title, c.status, c.signal, c.updated, c.action}) {
            assertFalse("Latin explanatory text on a card: " + field, DisplayName.hasLatin(field));
            for (String f : FORBIDDEN_FRAGMENTS) assertFalse("forbidden fragment on a card: " + field, field.contains(f));
            assertTrue("technical vocabulary on a card: " + field, UserMessage.isHumanLayer(field));
        }
        assertTrue(c.signal.isEmpty() || c.signal.length() <= 18);
    }

    @Test public void screenshotDefectCannotRecur_cardsCarryNoEnglishAndNoProblemDetail() throws Exception {
        Portfolio p = Portfolio.from(new JSONObject().put("projects", screenshotRows()).put("contract_version", 5), NOW, false);
        assertEquals(8, p.projects.size());
        for (Project x : p.projects) {
            ProjectCard c = ProjectCard.of(x, NOW);
            assertCardIsHumanLayer(c);
            for (String extra : ProjectCard.extraChips(x)) assertFalse(DisplayName.hasLatin(extra));
        }
    }

    @Test public void cardsShowOnlyNameStatusOneSignalAndAge() throws Exception {
        Portfolio p = Portfolio.from(new JSONObject().put("projects", screenshotRows()), NOW, false);
        ProjectCard fitness = ProjectCard.of(find(p, "P-007"), NOW);
        assertEquals("אפליקציית הכושר", fitness.title);
        assertEquals("צריך אותך", fitness.status);
        assertEquals("", fitness.signal); // the chip "צריך אותך" already says it — no repeated sentence
        assertEquals("עודכן אתמול", fitness.updated);
        assertEquals("פתח", fitness.action);
        assertTrue(fitness.emphasise);

        ProjectCard household = ProjectCard.of(find(p, "P-002"), NOW);
        assertEquals("מערכת הבית", household.title);
        assertEquals("במעקב", household.status);
        assertEquals("", household.signal); // the chip already says it; the risk prose stays behind the scenes

        ProjectCard radar = ProjectCard.of(find(p, "P-003"), NOW);
        assertEquals("רדאר החדשות", radar.title);
        assertEquals("לא עודכן לאחרונה", radar.signal);

        ProjectCard nutrition = ProjectCard.of(find(p, "P-005"), NOW);
        assertEquals("דורש טיפול", nutrition.status);
        assertEquals("לא מסונכרן", nutrition.signal);
        assertEquals(0, ProjectCard.extraChips(find(p, "P-005")).length);
        assertEquals("דורש התייחסות", ProjectCard.detailLine(find(p, "P-005")));
        assertEquals("מחכה לך", ProjectCard.detailLine(find(p, "P-007")));

        ProjectCard tom = ProjectCard.of(find(p, "P-004"), NOW);
        assertEquals("הלמידה של תום", tom.title);
        assertEquals("צריך אותך", tom.status);
        assertEquals("", tom.signal);

        ProjectCard chief = ProjectCard.of(find(p, "P-006"), NOW);
        assertEquals("הצ'יף", chief.title);
        assertEquals("", chief.signal);
    }

    @Test public void everyKnownProjectGetsAHebrewDisplayName() {
        String[][] expected = {
                {"Fitness App Recovery", "אפליקציית הכושר"}, {"Household OS", "מערכת הבית"}, {"Irish Citizenship & Passport", "אזרחות ודרכון אירי"},
                {"Chief of Staff", "הצ'יף"}, {"Personal News Radar", "רדאר החדשות"}, {"Nutrition App", "אפליקציית התזונה"},
                {"Tom AI Learning", "הלמידה של תום"}, {"Ariel Life OS", "מערכת החיים"}, {"AI Control Tower", "מגדל הפיקוח"}};
        for (String[] e : expected) {
            String d = DisplayName.resolve("", e[0], "");
            assertEquals(e[0], e[1], d);
            assertFalse(DisplayName.hasLatin(d));
        }
    }

    @Test public void displayNameResolutionOrder() {
        assertEquals("שם מהלוח", DisplayName.resolve("שם מהלוח", "Household OS", "x"));        // board column wins
        assertEquals("מערכת הבית", DisplayName.resolve("", "household os", "y"));              // mapping (case-insensitive)
        assertEquals("מערכת הבית", DisplayName.resolve("", "Household OS — v2", ""));           // mapping by prefix
        assertEquals("תיאור בעברית", DisplayName.resolve("", "Unknown Thing", "תיאור בעברית")); // Hebrew description
        assertEquals("Unknown Thing", DisplayName.resolve("", "Unknown Thing", "Mixed תיאור"));  // never invented
        assertEquals("", DisplayName.resolve(null, null, null));
    }

    @Test public void gatewayDisplayNameFieldIsUsedWhenPresent() throws Exception {
        Project p = Project.from(row("P-9", "Some Repo Name", "GREEN", false).put("display_name", "פרויקט חדש"), NOW);
        assertEquals("פרויקט חדש", p.displayName);
        assertEquals("Some Repo Name", p.name); // canonical name untouched
    }

    @Test public void machineLayerKeepsEveryFieldTheCardHides() throws Exception {
        Project fitness = Project.from(screenshotRows().getJSONObject(0), NOW);
        assertEquals("Recovery and revalidation of a previously built fitness app so it becomes a real, usable product.", fitness.objective);
        assertEquals("Confirm the exact existing fitness app/repository and its current state.", fitness.nextAction);
        assertEquals("Confirm the exact existing fitness app/repository to recover.", fitness.arielInput);
        assertEquals("Control delta: no canonical repo confirmed yet.", fitness.blocker);
        assertEquals("Fitness App Recovery", fitness.name);
        assertEquals("Recovery and revalidation of a previously built fitness app so it becomes a real, usable product.", fitness.raw.getString("objective"));
        String prose = "";
        for (String[] kv : fitness.boardProse()) prose += kv[0] + "=" + kv[1] + "\n";
        assertTrue(prose.contains("objective=Recovery and revalidation"));
        assertTrue(prose.contains("next_action=Confirm the exact"));
        assertTrue(prose.contains("ariel_input=Confirm the exact"));
        assertTrue(prose.contains("blocker=Control delta"));
        String tech = String.join("\n", fitness.technicalLines());
        assertTrue(tech.contains("canonical name: Fitness App Recovery"));
        assertTrue(tech.contains("status_bucket: NEEDS_ARIEL"));
        assertTrue(tech.contains("needs_ariel: true"));
        // the human accessors that older screens used still exist for reports/agents
        assertEquals("Confirm the exact existing fitness app/repository to recover.", fitness.arielAction());
    }

    @Test public void deputyHeadlinesNeverQuoteAgentProse() throws Exception {
        JSONArray items = new JSONArray()
                .put(new JSONObject().put("report_text", "EXTERNAL_PROJECT_REPORT_V1\nFitness App Recovery: Recovery and revalidation started; confirm the exact existing repository.").put("source", "share").put("status", "REPORTED").put("received_at", "2026-09-21T06:00:00Z"))
                .put(new JSONObject().put("report_text", "Household OS weekly digest published to Drive").put("source", "agent_report").put("status", "NEW").put("received_at", "2026-09-21T05:00:00Z"))
                .put(new JSONObject().put("report_text", "בדוק מה תקוע").put("source", "deputy_command").put("status", "NEW").put("received_at", "2026-09-21T04:00:00Z"));
        List<DeputyDigest.Item> out = DeputyDigest.from(items, Arrays.asList("Fitness App Recovery", "Household OS"), NOW);
        assertEquals("התקבל דיווח מאפליקציית הכושר", out.get(0).problem);
        assertEquals("התקבל עדכון ממערכת הבית", out.get(1).problem);
        assertEquals("פקודה שלך: בדוק מה תקוע", out.get(2).problem);
        for (DeputyDigest.Item it : out) {
            assertFalse(it.problem, it.problem.contains("Recovery and revalidation") || it.problem.contains("digest"));
            assertFalse(it.evidence.isEmpty()); // prose kept as evidence
        }
        assertTrue(out.get(0).evidence.get(0).contains("Recovery and revalidation"));
        assertEquals("בצ'יף", DeputyDigest.prep("ב", "הצ'יף"));
        assertEquals("במערכת הבית", DeputyDigest.prep("ב", "מערכת הבית"));
        assertEquals("ב-Unknown", DeputyDigest.prep("ב", "Unknown"));
    }

    @Test public void pushEventLabelsNeverLeakEnglish() {
        assertEquals("הפך לאדום + צריך אותך", Hebrew.pushEvent("project_red+needs_ariel"));
        assertEquals("התראה", Hebrew.pushEvent("some_new_event"));
        assertEquals("התראה", Hebrew.pushEvent(""));
        assertFalse(DisplayName.hasLatin(Hebrew.pushEvent("user_test_required+weird")));
    }

    @Test public void osChipStatesAreHebrewAndCurrentIsQuiet() throws Exception {
        for (OsAlignment a : OsAlignment.values()) assertFalse(a.label, DisplayName.hasLatin(a.label));
        Project cur = Project.from(row("P-1", "Chief of Staff", "GREEN", false).put("os_alignment", "CURRENT"), NOW);
        assertEquals(0, ProjectCard.extraChips(cur).length);
        assertEquals("", ProjectCard.of(cur, NOW).signal);
    }

    private static Project find(Portfolio p, String id) {
        for (Project x : p.projects) if (x.id.equals(id)) return x;
        throw new AssertionError("missing " + id);
    }
}
