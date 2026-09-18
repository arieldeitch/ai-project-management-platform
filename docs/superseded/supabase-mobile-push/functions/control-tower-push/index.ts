// Control Tower push sender (Supabase Edge Function, Deno).
//
// Sends FCM HTTP v1 messages to the owner's registered Android devices.
// Two callers are accepted, nothing else:
//   1. The authenticated owner (app JWT; email must equal CONTROL_TOWER_OWNER_EMAIL).
//      Body: { "mode": "test" }  -> bounded test push to the caller's own devices.
//   2. An internal caller (DB trigger / automation) presenting
//      header  x-control-tower-internal: <CONTROL_TOWER_INTERNAL_SECRET>
//      Body: { "event": "project_red" | "needs_ariel" | "test", "title"?, "body"?, "target"?, "project_id"? }
//
// Deploy:  supabase functions deploy control-tower-push --project-ref tbqdpvmlhtlrngoxbouf
// Secrets: supabase secrets set FCM_SERVICE_ACCOUNT_JSON="$(cat service-account.json)" \
//                               CONTROL_TOWER_OWNER_EMAIL=arieldeitch@gmail.com \
//                               CONTROL_TOWER_INTERNAL_SECRET=<long random string>
// The Firebase service account is a platform secret only. It is never committed.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type PushRequest = {
  mode?: "test";
  event?: string;
  title?: string;
  body?: string;
  target?: "now" | "projects" | "deputy" | "activity";
  project_id?: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OWNER_EMAIL = (Deno.env.get("CONTROL_TOWER_OWNER_EMAIL") ?? "arieldeitch@gmail.com").toLowerCase();
const INTERNAL_SECRET = Deno.env.get("CONTROL_TOWER_INTERNAL_SECRET") ?? "";
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON") ?? "";

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// ---------- Google OAuth2 (service account -> access token) ----------

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function fcmAccessToken(sa: { client_email: string; private_key: string; token_uri?: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  const assertion = `${header}.${claims}.${base64url(signature)}`;

  const res = await fetch(sa.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`oauth token exchange failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: now + (data.expires_in ?? 3600) };
  return cachedToken.value;
}

// ---------- FCM v1 send ----------

async function sendToToken(
  projectId: string,
  accessToken: string,
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<{ ok: boolean; unregistered: boolean; error?: string }> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: { ...data, title, body },
        android: {
          priority: "high",
          notification: { channel_id: "control_tower_alerts", default_sound: true },
        },
      },
    }),
  });
  if (res.ok) return { ok: true, unregistered: false };
  const text = await res.text();
  const unregistered = res.status === 404 || text.includes("UNREGISTERED") || text.includes("NOT_FOUND");
  return { ok: false, unregistered, error: `${res.status} ${text.slice(0, 300)}` };
}

// ---------- Message templates (concise Hebrew) ----------

function template(req: PushRequest): { title: string; body: string; target: string } {
  switch (req.event ?? req.mode) {
    case "project_red":
      return { title: req.title ?? "פרויקט הפך לאדום", body: req.body ?? "נדרשת בדיקת שליטה עכשיו.", target: req.target ?? "projects" };
    case "needs_ariel":
      return { title: req.title ?? "החלטה ממתינה לך", body: req.body ?? "פרויקט ממתין להחלטה שלך.", target: req.target ?? "now" };
    case "test":
    default:
      return { title: req.title ?? "בדיקת מגדל הפיקוח", body: req.body ?? "ההתראות פועלות. אפשר להמשיך.", target: req.target ?? "activity" };
  }
}

// ---------- Handler ----------

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  let payload: PushRequest = {};
  try {
    payload = await req.json();
  } catch {
    // empty body is fine for a test push
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Resolve caller. Internal automation OR the authenticated owner. Nothing else.
  const internalHeader = req.headers.get("x-control-tower-internal") ?? "";
  const isInternal = INTERNAL_SECRET.length >= 16 && internalHeader === INTERNAL_SECRET;

  let ownerUserId: string | null = null;
  if (!isInternal) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "missing bearer token" });
    const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await asUser.auth.getUser();
    if (userError || !userData.user) return json(401, { error: "invalid session" });
    if ((userData.user.email ?? "").toLowerCase() !== OWNER_EMAIL) return json(403, { error: "not the Control Tower owner" });
    ownerUserId = userData.user.id;
    // Owner calls are bounded to a test push only; event pushes come from internal automation.
    payload = { mode: "test", target: payload.target };
  } else {
    // Internal calls target the owner's devices; look the owner up by email.
    const { data: list, error: ownerError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const owner = list?.users?.find((u) => (u.email ?? "").toLowerCase() === OWNER_EMAIL);
    if (ownerError || !owner) return json(500, { error: "owner account not found" });
    ownerUserId = owner.id;
  }

  if (!FCM_SERVICE_ACCOUNT_JSON) {
    return json(503, { error: "FCM_SERVICE_ACCOUNT_JSON secret is not configured", sent: 0, failed: 0 });
  }
  let sa: { project_id: string; client_email: string; private_key: string; token_uri?: string };
  try {
    sa = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
  } catch {
    return json(500, { error: "FCM_SERVICE_ACCOUNT_JSON is not valid JSON" });
  }

  const { data: tokens, error: tokenError } = await admin
    .from("control_push_tokens")
    .select("id, token")
    .eq("user_id", ownerUserId)
    .eq("platform", "android");
  if (tokenError) return json(500, { error: `token lookup failed: ${tokenError.message}` });
  if (!tokens || tokens.length === 0) return json(200, { sent: 0, failed: 0, note: "no registered devices" });

  const msg = template(payload);
  const data: Record<string, string> = {
    event: payload.event ?? payload.mode ?? "test",
    target: msg.target,
  };
  if (payload.project_id) data.project_id = String(payload.project_id);

  let accessToken: string;
  try {
    accessToken = await fcmAccessToken(sa);
  } catch (e) {
    return json(502, { error: String(e) });
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const row of tokens) {
    const result = await sendToToken(sa.project_id, accessToken, row.token, msg.title, msg.body, data);
    if (result.ok) {
      sent++;
    } else {
      failed++;
      if (result.error) errors.push(result.error);
      if (result.unregistered) await admin.from("control_push_tokens").delete().eq("id", row.id);
    }
  }
  return json(200, { sent, failed, errors: errors.slice(0, 3) });
});
