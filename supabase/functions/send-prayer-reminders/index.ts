import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SRI_LANKA_TIMEZONE = "Asia/Colombo";
const VALID_REMINDER_TYPES = new Set(["10min", "5min", "adhan", "iqamah"]);
const PRAYER_FIELDS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const FCM_URL = "https://fcm.googleapis.com/v1/projects/akurana-prayer-app/messages:send";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

// --- OAuth2 / JWT helpers ---

let cachedAccessToken: string | null = null;
let cachedTokenExpiry = 0;

function base64url(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToUint8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function createSignedJwt(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
    scope: SCOPE,
  };

  const encodedHeader = base64url(strToUint8(JSON.stringify(header)));
  const encodedPayload = base64url(strToUint8(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, strToUint8(signingInput));
  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

async function getAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && now < cachedTokenExpiry - 60_000) {
    return cachedAccessToken;
  }

  const jwt = await createSignedJwt(serviceAccount);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth2 token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedAccessToken = data.access_token;
  cachedTokenExpiry = now + (data.expires_in || 3600) * 1000;
  return cachedAccessToken!;
}

// --- Time helpers ---

function getColomboTimeParts(): { date: string; hhmm: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SRI_LANKA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hhmm: `${parts.hour}:${parts.minute}`,
  };
}

function normalizeToHHMM(timeValue: string | null): string | null {
  if (!timeValue || typeof timeValue !== "string") return null;
  const match = timeValue.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (isNaN(hour) || isNaN(minute) || minute > 59 || hour > 23 || hour < 0) return null;
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  if (hour > 23) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function addMinutesToHHMM(hhmm: string, mins: number): string | null {
  const [h, m] = hhmm.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const total = ((h * 60 + m + mins) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function calculateReminderTime(prayerHHMM: string, reminderType: string): string | null {
  if (reminderType === "10min") return addMinutesToHHMM(prayerHHMM, -10);
  if (reminderType === "5min") return addMinutesToHHMM(prayerHHMM, -5);
  if (reminderType === "adhan") return prayerHHMM;
  if (reminderType === "iqamah") return addMinutesToHHMM(prayerHHMM, 15);
  return null;
}

function buildNotificationTitle(prayer: string, type: string): string {
  const name = prayer.charAt(0).toUpperCase() + prayer.slice(1);
  if (type === "10min") return `${name} in 10 minutes`;
  if (type === "5min") return `${name} in 5 minutes`;
  if (type === "adhan") return `${name} Adhan time`;
  if (type === "iqamah") return `${name} Iqamah reminder`;
  return `${name} reminder`;
}

// --- FCM send ---

async function sendFcmMessage(
  accessToken: string,
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<{ success: boolean; unregistered: boolean; error?: string }> {
  const res = await fetch(FCM_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: { title, body },
        data,
      },
    }),
  });

  if (res.ok) return { success: true, unregistered: false };

  const errText = await res.text();
  const unregistered =
    res.status === 404 ||
    errText.includes("UNREGISTERED") ||
    errText.includes("not a valid FCM registration token") ||
    errText.includes("Requested entity was not found");

  return { success: false, unregistered, error: errText };
}

// --- Main handler ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { date: today, hhmm: currentTime } = getColomboTimeParts();

  async function logToSystem(status: string, message: string) {
    try {
      await supabase.from("system_logs").insert({
        function_name: "send-prayer-reminders",
        status,
        message,
      });
    } catch (e) {
      console.error("Failed to write system_log:", e);
    }
  }

  try {
    // 1. Parse service account
    const saJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!saJson) {
      await logToSystem("error", "FIREBASE_SERVICE_ACCOUNT_JSON secret not set");
      return new Response(JSON.stringify({ error: "Missing service account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceAccount = JSON.parse(saJson);

    // 2. Fetch today's prayer times
    const { data: prayerRow, error: ptErr } = await supabase
      .from("daily_prayer_times")
      .select("date, fajr, dhuhr, asr, maghrib, isha")
      .eq("date", today)
      .maybeSingle();

    if (ptErr) {
      await logToSystem("error", `Failed to fetch prayer times: ${ptErr.message}`);
      return new Response(JSON.stringify({ error: ptErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!prayerRow) {
      // No prayer times for today — not necessarily an error, just nothing to do
      return new Response(JSON.stringify({ skipped: true, reason: "No prayer times for today" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch enabled push tokens
    const { data: tokenRows, error: tkErr } = await supabase
      .from("users_push_tokens")
      .select("id, token, reminder_type")
      .eq("notifications_enabled", true);

    if (tkErr) {
      await logToSystem("error", `Failed to fetch tokens: ${tkErr.message}`);
      return new Response(JSON.stringify({ error: tkErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!tokenRows?.length) {
      return new Response(JSON.stringify({ skipped: true, reason: "No enabled tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Build candidate notifications for this minute
    const candidates: {
      dedupeKey: string;
      tokenRecordId: string;
      deviceToken: string;
      prayerName: string;
      reminderType: string;
    }[] = [];

    for (const row of tokenRows) {
      if (!VALID_REMINDER_TYPES.has(row.reminder_type) || !row.token) continue;

      for (const prayer of PRAYER_FIELDS) {
        const prayerHHMM = normalizeToHHMM((prayerRow as Record<string, string | null>)[prayer]);
        if (!prayerHHMM) continue;

        const targetTime = calculateReminderTime(prayerHHMM, row.reminder_type);
        if (!targetTime || targetTime !== currentTime) continue;

        candidates.push({
          dedupeKey: `${today}:${row.id}:${prayer}:${row.reminder_type}`,
          tokenRecordId: row.id,
          deviceToken: row.token,
          prayerName: prayer,
          reminderType: row.reminder_type,
        });
      }
    }

    if (!candidates.length) {
      return new Response(JSON.stringify({ candidates: 0, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Deduplicate
    const dedupeKeys = [...new Set(candidates.map((c) => c.dedupeKey))];
    const { data: existingLogs } = await supabase
      .from("notification_sent_log")
      .select("dedupe_key")
      .in("dedupe_key", dedupeKeys);

    const sentKeys = new Set((existingLogs || []).map((r: { dedupe_key: string }) => r.dedupe_key));
    const toSend = candidates.filter((c) => !sentKeys.has(c.dedupeKey));

    if (!toSend.length) {
      return new Response(JSON.stringify({ candidates: candidates.length, alreadySent: candidates.length, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Get OAuth2 access token
    const accessToken = await getAccessToken(serviceAccount);

    // 7. Send notifications
    const sentLogRows: { token: string; prayer_name: string; reminder_type: string; sent_at: string; dedupe_key: string }[] = [];
    const invalidTokenIds: string[] = [];
    let failCount = 0;

    for (const n of toSend) {
      const result = await sendFcmMessage(
        accessToken,
        n.deviceToken,
        buildNotificationTitle(n.prayerName, n.reminderType),
        "Akurana Prayer Time Reminder",
        { prayerName: n.prayerName, reminderType: n.reminderType, date: today }
      );

      if (result.success) {
        sentLogRows.push({
          token: n.deviceToken,
          prayer_name: n.prayerName,
          reminder_type: n.reminderType,
          sent_at: new Date().toISOString(),
          dedupe_key: n.dedupeKey,
        });
      } else if (result.unregistered) {
        invalidTokenIds.push(n.tokenRecordId);
      } else {
        failCount++;
        console.error(`FCM send failed for ${n.dedupeKey}: ${result.error}`);
      }
    }

    // 8. Log sent notifications
    if (sentLogRows.length) {
      const { error: logErr } = await supabase.from("notification_sent_log").insert(sentLogRows);
      if (logErr) console.error("Failed to insert sent logs:", logErr);
    }

    // 9. Remove invalid tokens
    if (invalidTokenIds.length) {
      const uniqueIds = [...new Set(invalidTokenIds)];
      const { error: delErr } = await supabase.from("users_push_tokens").delete().in("id", uniqueIds);
      if (delErr) console.error("Failed to delete invalid tokens:", delErr);
    }

    // 10. Log summary
    const summary = `${today} ${currentTime} | candidates=${candidates.length} attempted=${toSend.length} sent=${sentLogRows.length} failed=${failCount} invalidTokens=${invalidTokenIds.length}`;
    await logToSystem("success", summary);

    return new Response(
      JSON.stringify({
        candidates: candidates.length,
        attempted: toSend.length,
        sent: sentLogRows.length,
        failed: failCount,
        invalidTokens: invalidTokenIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await logToSystem("error", msg);
    console.error("Unhandled error:", error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
