import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeTime(timeStr: string | null): string | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3];
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

async function logToSystem(supabase: any, status: string, message: string) {
  try {
    await supabase.from("system_logs").insert({
      function_name: "sync-daily-prayer-times",
      status,
      message,
    });
  } catch (e) {
    console.error("Failed to write system_log:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get the date to sync (default: today in Sri Lanka timezone)
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");

    const now = new Date();
    const sriLankaDate = dateParam || new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    // Fetch all prayer_time_changes up to this date (carry-forward logic)
    const { data: changes, error: changesError } = await supabase
      .from("prayer_time_changes")
      .select("effective_from, subah_adhan, sunrise, luhar_adhan, asr_adhan, magrib_adhan, isha_adhan")
      .lte("effective_from", sriLankaDate)
      .order("effective_from", { ascending: true });

    if (changesError) {
      throw new Error(`Failed to fetch prayer_time_changes: ${changesError.message}`);
    }

    if (!changes || changes.length === 0) {
      await logToSystem(supabase, "error", `No prayer time data found for ${sriLankaDate}`);
      return new Response(JSON.stringify({ error: "No prayer time data found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Merge changes using carry-forward logic
    const merged: Record<string, string | null> = {
      subah_adhan: null,
      sunrise: null,
      luhar_adhan: null,
      asr_adhan: null,
      magrib_adhan: null,
      isha_adhan: null,
    };

    for (const row of changes) {
      for (const field of Object.keys(merged)) {
        const val = (row as any)[field];
        if (typeof val === "string" && val.trim() !== "") {
          merged[field] = val.trim();
        }
      }
    }

    // Convert to daily_prayer_times format with 24h time
    const dailyRow = {
      date: sriLankaDate,
      fajr: normalizeTime(merged.subah_adhan) || "05:00",
      dhuhr: normalizeTime(merged.luhar_adhan) || "12:30",
      asr: normalizeTime(merged.asr_adhan) || "15:30",
      maghrib: normalizeTime(merged.magrib_adhan) || "18:15",
      isha: normalizeTime(merged.isha_adhan) || "19:30",
    };

    // Upsert into daily_prayer_times
    const { error: upsertError } = await supabase
      .from("daily_prayer_times")
      .upsert(dailyRow, { onConflict: "date" });

    if (upsertError) {
      throw new Error(`Failed to upsert daily_prayer_times: ${upsertError.message}`);
    }

    await logToSystem(supabase, "success", `Synced ${sriLankaDate}: ${JSON.stringify(dailyRow)}`);

    return new Response(JSON.stringify({ success: true, date: sriLankaDate, data: dailyRow }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    await logToSystem(supabase, "error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
