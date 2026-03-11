import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const auth = req.headers.get("Authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: settingsRows, error: fetchError } = await admin
    .from("notification_settings")
    .select("user_id, daily_reminder_count, last_reminder_sent_at")
    .eq("reminder_frequency", "daily");

  if (fetchError) {
    console.error("send-reminders fetch error:", fetchError);
    return new Response(
      JSON.stringify({ error: "Failed to fetch notification settings", details: fetchError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const now = new Date();
  let sent = 0;

  for (const row of settingsRows ?? []) {
    const count = Math.min(6, Math.max(1, row.daily_reminder_count ?? 2));
    const intervalHours = Math.max(4, 24 / count);
    const lastSent = row.last_reminder_sent_at ? new Date(row.last_reminder_sent_at) : null;
    const due =
      !lastSent ||
      (now.getTime() - lastSent.getTime()) >= intervalHours * 60 * 60 * 1000;

    if (!due) continue;

    const { error: insertError } = await admin.from("notifications").insert({
      user_id: row.user_id,
      title: "Reminder",
      message: "Time for a quick recall check! Review your notes to keep them fresh.",
      type: "reminder",
    });

    if (insertError) {
      console.error(`send-reminders insert for ${row.user_id}:`, insertError);
      continue;
    }

    await admin
      .from("notification_settings")
      .update({ last_reminder_sent_at: now.toISOString() })
      .eq("user_id", row.user_id);

    sent++;
  }

  return new Response(
    JSON.stringify({ ok: true, sent, total_daily: settingsRows?.length ?? 0 }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
