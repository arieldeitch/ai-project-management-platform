package com.ariel.controltower.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Local, optimistic model of the idea incubator: three planning buckets (עכשיו / הבא / בהמשך), each
 * manually ordered. Moves are applied locally first; {@link #reorderPayload()} produces the batch the
 * gateway persists (manual_order normalised to 10, 20, 30 …).
 */
public final class IdeaBoard {
    public static final String[] BUCKETS = {"NOW", "NEXT", "LATER"};
    public static final String[] BUCKET_LABELS = {"עכשיו", "הבא", "בהמשך"};

    public static final class Idea {
        public final String id;
        public String title;
        public String stage;
        public String bucket;
        public int order;
        public final String need, nextStep, urgency, surface, updatedAt;
        public final int maturity;
        public final JSONObject raw;

        Idea(JSONObject o) {
            raw = o;
            id = o.optString("idea_id", "");
            title = o.optString("title", "");
            stage = o.optString("stage", "INBOX");
            String b = o.optString("planning_bucket", "LATER").toUpperCase();
            bucket = bucketIndex(b) >= 0 ? b : "LATER";
            order = o.isNull("manual_order") || !o.has("manual_order") ? Integer.MAX_VALUE : o.optInt("manual_order", Integer.MAX_VALUE);
            need = o.optString("need", "");
            nextStep = o.optString("next_step", "");
            urgency = o.optString("urgency", "MEDIUM");
            surface = o.optString("surface", "UNDECIDED");
            updatedAt = o.optString("updated_at", "");
            maturity = o.optInt("maturity_score", 0);
        }
    }

    private final List<Idea> ideas = new ArrayList<>();

    public static IdeaBoard from(JSONArray arr) {
        IdeaBoard b = new IdeaBoard();
        if (arr != null) for (int i = 0; i < arr.length(); i++) { JSONObject o = arr.optJSONObject(i); if (o != null && !o.optString("idea_id").isEmpty()) b.ideas.add(new Idea(o)); }
        b.sort();
        return b;
    }

    public static int bucketIndex(String bucket) {
        for (int i = 0; i < BUCKETS.length; i++) if (BUCKETS[i].equals(bucket)) return i;
        return -1;
    }

    public static String bucketLabel(String bucket) {
        int i = bucketIndex(bucket);
        return i < 0 ? BUCKET_LABELS[2] : BUCKET_LABELS[i];
    }

    private void sort() {
        ideas.sort((a, b) -> {
            int ba = bucketIndex(a.bucket), bb = bucketIndex(b.bucket);
            if (ba != bb) return Integer.compare(ba, bb);
            if (a.order != b.order) return Integer.compare(a.order, b.order);
            return b.updatedAt.compareTo(a.updatedAt);
        });
    }

    public List<Idea> all() { return new ArrayList<>(ideas); }

    public List<Idea> inBucket(String bucket) {
        List<Idea> out = new ArrayList<>();
        for (Idea i : ideas) if (i.bucket.equals(bucket)) out.add(i);
        return out;
    }

    public Idea find(String id) {
        for (Idea i : ideas) if (i.id.equals(id)) return i;
        return null;
    }

    /** Move an idea to a bucket at a position (0-based within that bucket). Renumbers every bucket 10,20,… */
    public boolean move(String id, String bucket, int position) {
        Idea target = find(id);
        if (target == null || bucketIndex(bucket) < 0) return false;
        List<Idea> dest = inBucket(bucket);
        dest.remove(target);
        int pos = Math.max(0, Math.min(position, dest.size()));
        dest.add(pos, target);
        target.bucket = bucket;
        for (int i = 0; i < dest.size(); i++) dest.get(i).order = (i + 1) * 10;
        for (String b : BUCKETS) if (!b.equals(bucket)) { List<Idea> l = inBucket(b); for (int i = 0; i < l.size(); i++) l.get(i).order = (i + 1) * 10; }
        sort();
        return true;
    }

    /** Move one step up/down inside its bucket (accessible alternative to drag). */
    public boolean nudge(String id, int delta) {
        Idea t = find(id);
        if (t == null) return false;
        List<Idea> l = inBucket(t.bucket);
        int idx = l.indexOf(t);
        return move(id, t.bucket, idx + delta);
    }

    /** Batch for the gateway's reorder_ideas action: every idea with its bucket and normalised order. */
    public JSONArray reorderPayload() {
        JSONArray arr = new JSONArray();
        for (Idea i : ideas) {
            try {
                arr.put(new JSONObject().put("idea_id", i.id).put("planning_bucket", i.bucket).put("manual_order", i.order == Integer.MAX_VALUE ? 1000 : i.order));
            } catch (Exception ignored) {}
        }
        return arr;
    }

    public int size() { return ideas.size(); }
}
