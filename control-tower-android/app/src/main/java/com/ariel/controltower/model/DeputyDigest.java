package com.ariel.controltower.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Turns the raw MobileInbox stream (agent reports, shares, commands) into a short Ariel-facing list:
 * one item per functional problem, in Hebrew, with problem → impact → next action → owner.
 * Technical text (CI, tests, dogfood, file paths, hashes) stays in the evidence list only.
 */
public final class DeputyDigest {
    private DeputyDigest() {}

    public enum Kind { TECH_FAILURE, SYNC_FAILURE, DEPLOY_BLOCKED, USER_TEST, DECISION, REPORT, COMMAND, OTHER }

    public static final class Item {
        public final Kind kind;
        public final String project;      // best-effort project name, may be ""
        public final String problem;      // Hebrew, one line
        public final String impact;       // Hebrew
        public final String nextAction;   // Hebrew, imperative
        public final String owner;        // Hebrew owner/agent label
        public final String status;       // raw inbox status of the newest occurrence
        public final int count;           // merged occurrences
        public final long lastSeenMillis;
        public final List<String> evidence; // raw texts (newest first), for the detail view only

        Item(Kind kind, String project, String problem, String impact, String nextAction, String owner, String status, int count, long lastSeenMillis, List<String> evidence) {
            this.kind = kind; this.project = project; this.problem = problem; this.impact = impact; this.nextAction = nextAction;
            this.owner = owner; this.status = status; this.count = count; this.lastSeenMillis = lastSeenMillis;
            this.evidence = Collections.unmodifiableList(evidence);
        }

        public boolean isOpen() {
            String s = status == null ? "" : status.toUpperCase(Locale.ROOT);
            return !(s.equals("DONE") || s.equals("COMPLETED") || s.equals("VERIFIED") || s.equals("REJECTED") || s.equals("RESOLVED"));
        }
    }

    private static final Pattern NOISE = Pattern.compile(
            "(?i)(https?://\\S+|\\b[0-9a-f]{7,40}\\b|\\d{4}-\\d{2}-\\d{2}[T ]?[\\d:.]*Z?|\\d{1,2}[/.]\\d{1,2}[/.]\\d{2,4}|\\d+)");
    private static final Pattern TECH = Pattern.compile("(?i)\\b(ci|pipeline|workflow|lint|build|test|tests|suite|dogfood|unit|e2e|jest|vitest|gradle|npm|bun|fail(ed|ure|ing)?|error|exception|stack ?trace|assert)\\b");
    private static final Pattern SYNC = Pattern.compile("(?i)\\b(sync|synchroni[sz]|gateway|token|unauthori[sz]ed|401|403|timeout|network|offline)\\b|סנכרון|שער|טוקן");
    private static final Pattern DEPLOY = Pattern.compile("(?i)\\b(deploy|deployment|redeploy|apps script|release|apk|install)\\b|פריסה|להתקין");
    private static final Pattern USER_TEST = Pattern.compile("(?i)user test|לבדוק בטלפון|בדיקה שלך|מחכה לבדיקה|ממתינ[הת]? לבדיקה|לבדיקה בטלפון|user_test");
    private static final Pattern DECISION = Pattern.compile("(?i)decide|decision|approve|choose|להחליט|החלטה|לאשר|לבחור");

    /** Build the digest from gateway `inbox` items (newest first or any order). */
    public static List<Item> from(JSONArray items, List<String> knownProjects, long now) {
        Map<String, List<JSONObject>> groups = new LinkedHashMap<>();
        List<JSONObject> all = new ArrayList<>();
        if (items != null) for (int i = 0; i < items.length(); i++) { JSONObject o = items.optJSONObject(i); if (o != null) all.add(o); }
        all.sort((a, b) -> Long.compare(TimeText.parse(b.optString("received_at", "")), TimeText.parse(a.optString("received_at", ""))));
        for (JSONObject o : all) {
            String text = cleanText(o.optString("report_text", ""));
            String key = signature(text, o.optString("source", ""));
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(o);
        }
        List<Item> out = new ArrayList<>();
        for (List<JSONObject> g : groups.values()) {
            JSONObject newest = g.get(0);
            String text = cleanText(newest.optString("report_text", ""));
            String source = newest.optString("source", "");
            String project = detectProject(text, knownProjects);
            Kind kind = classify(text, source);
            List<String> evidence = new ArrayList<>();
            for (JSONObject o : g) evidence.add(cleanText(o.optString("report_text", "")));
            out.add(new Item(kind, project, problem(kind, text, project, source), impact(kind), nextAction(kind, source), owner(kind, source),
                    newest.optString("status", ""), g.size(), TimeText.parse(newest.optString("received_at", "")), evidence));
        }
        // open items first, then most recent
        out.sort((a, b) -> {
            if (a.isOpen() != b.isOpen()) return a.isOpen() ? -1 : 1;
            return Long.compare(b.lastSeenMillis, a.lastSeenMillis);
        });
        return out;
    }

    static String cleanText(String raw) {
        String t = raw == null ? "" : raw.trim();
        if (t.startsWith("EXTERNAL_PROJECT_REPORT_V1")) t = t.substring("EXTERNAL_PROJECT_REPORT_V1".length()).trim();
        return t;
    }

    /** Stable grouping key: same source + same text after removing ids, hashes, times, numbers and case. */
    static String signature(String text, String source) {
        String s = NOISE.matcher(text.toLowerCase(Locale.ROOT)).replaceAll(" ").replaceAll("[^\\p{L}\\s]", " ").replaceAll("\\s+", " ").trim();
        if (s.length() > 120) s = s.substring(0, 120);
        return source + "|" + s;
    }

    static Kind classify(String text, String source) {
        if ("deputy_command".equals(source)) return Kind.COMMAND;
        if (USER_TEST.matcher(text).find()) return Kind.USER_TEST;
        if (DECISION.matcher(text).find() && !TECH.matcher(text).find()) return Kind.DECISION;
        if (SYNC.matcher(text).find()) return Kind.SYNC_FAILURE;
        if (DEPLOY.matcher(text).find() && text.toLowerCase(Locale.ROOT).matches(".*\\b(needs?|required?|pending|blocked|waiting|manual)\\b.*")) return Kind.DEPLOY_BLOCKED;
        if (TECH.matcher(text).find()) return Kind.TECH_FAILURE;
        if ("share".equals(source)) return Kind.REPORT;
        return Kind.OTHER;
    }

    static String detectProject(String text, List<String> knownProjects) {
        if (knownProjects == null) return "";
        String lower = text.toLowerCase(Locale.ROOT);
        for (String name : knownProjects) if (name != null && !name.isEmpty() && lower.contains(name.toLowerCase(Locale.ROOT))) return name;
        return "";
    }

    /** "[Tom AI Learning] x" / "Tom AI Learning: x" → "x" when the project is already shown. */
    static String stripProjectPrefix(String text, String project) {
        String t = text.trim();
        String lower = t.toLowerCase(Locale.ROOT), p = project.toLowerCase(Locale.ROOT);
        if (lower.startsWith("[" + p + "]")) t = t.substring(project.length() + 2).trim();
        else if (lower.startsWith(p + ":") || lower.startsWith(p + " -") || lower.startsWith(p + " —")) t = t.substring(project.length() + 1).trim();
        return t.replaceAll("^[:\\-—\\s]+", "");
    }

    /** First human-readable sentence of the raw text (Hebrew or English), trimmed. */
    static String headline(String text, int max) {
        String first = text.split("\\r?\\n")[0].trim();
        first = first.replaceAll("^(\\[[^\\]]*\\]\\s*)+", "").replaceAll("^(VERIFIED|REPORTED|DONE|FAILED|ERROR)[:\\s-]+", "").trim();
        if (first.length() > max) first = first.substring(0, max - 1).trim() + "…";
        return first;
    }

    /**
     * Hebrew management headline only. Raw report text (often English agent prose) never becomes the headline:
     * it stays in {@link Item#evidence}. Ariel's own commands are quoted because he wrote them.
     */
    static String problem(Kind kind, String text, String project, String source) {
        String shown = project.isEmpty() ? "" : displayName(project);
        String in = shown.isEmpty() ? "" : " " + prep("ב", shown);
        switch (kind) {
            case TECH_FAILURE: return "הבדיקות האוטומטיות נכשלות" + in;
            case SYNC_FAILURE: return "הסנכרון אינו עובד" + in;
            case DEPLOY_BLOCKED: return "יש גרסה שמחכה לפריסה" + in;
            case USER_TEST: return "גרסה מחכה לבדיקה שלך" + in;
            case DECISION: return "מחכים להחלטה שלך" + in;
            case COMMAND: return "פקודה שלך: " + headline(text, 90);
            case REPORT: return "התקבל דיווח" + (shown.isEmpty() ? "" : " " + prep("מ", shown));
            default: return "התקבל עדכון" + (shown.isEmpty() ? "" : " " + prep("מ", shown));
        }
    }

    /** "ב"+"הצ'יף" → "בצ'יף", "ב"+"מערכת הבית" → "במערכת הבית", "ב"+"Nutrition App" → "ב-Nutrition App". */
    static String prep(String p, String name) {
        if (!DisplayName.hasHebrew(name)) return p + "-" + name;
        if (name.startsWith("ה")) return p + name.substring(1);
        return p + name;
    }

    static String displayName(String canonical) {
        String d = DisplayName.known(canonical);
        return d == null ? canonical : d;
    }

    static String impact(Kind kind) {
        switch (kind) {
            case TECH_FAILURE: return "השינויים האחרונים לא מאומתים — אי אפשר לסמוך על הגרסה";
            case SYNC_FAILURE: return "המידע שמוצג עלול להיות ישן";
            case DEPLOY_BLOCKED: return "התיקון קיים אבל עדיין לא פעיל";
            case USER_TEST: return "בלי הבדיקה שלך הפרויקט לא מתקדם";
            case DECISION: return "בלי החלטה העבודה תקועה";
            case COMMAND: return "בקשה שלך שממתינה לטיפול";
            case REPORT: return "דיווח חיצוני שממתין לאימות ראיות";
            default: return "";
        }
    }

    static String nextAction(Kind kind, String source) {
        switch (kind) {
            case TECH_FAILURE: return "להעביר לקלוד לריצת תיקון";
            case SYNC_FAILURE: return "להריץ תיקון סנכרון";
            case DEPLOY_BLOCKED: return "לבצע את הפריסה (פעולה של דקה)";
            case USER_TEST: return "לפתוח את הגרסה בטלפון ולדווח";
            case DECISION: return "להחליט ולכתוב לסגן";
            case COMMAND: return "הסגן יטפל וידווח";
            case REPORT: return "מגדל הפיקוח יאמת את הראיות";
            default: return "לקרוא ולהחליט אם נדרשת פעולה";
        }
    }

    static String owner(Kind kind, String source) {
        switch (kind) {
            case TECH_FAILURE: case SYNC_FAILURE: return "Claude";
            case DEPLOY_BLOCKED: case USER_TEST: case DECISION: return "אריאל";
            case COMMAND: return "הסגן";
            case REPORT: return "מגדל הפיקוח";
            default: return "";
        }
    }

    /** Hebrew label for a kind (used for chips). */
    public static String kindLabel(Kind k) {
        switch (k) {
            case TECH_FAILURE: return "תקלה טכנית";
            case SYNC_FAILURE: return "סנכרון";
            case DEPLOY_BLOCKED: return "ממתין לפריסה";
            case USER_TEST: return "בדיקה שלך";
            case DECISION: return "החלטה";
            case COMMAND: return "פקודה";
            case REPORT: return "דיווח";
            default: return "עדכון";
        }
    }
}
