import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Placeholder for AI feature calls. Do not implement AI here yet.
 * When ready, branch on body.feature and call your AI provider;
 * keep this route so the frontend does not need to change.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      feature?: string;
      payload?: Record<string, unknown>;
    };
    const feature = body?.feature ?? "unknown";

    // Placeholder: no AI implementation yet. Return consistent shape for frontend.
    return new Response(
      JSON.stringify({
        ok: false,
        reason: "not_implemented",
        error: "AI features are not enabled yet.",
        feature,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("call-ai-feature error:", e);
    return new Response(
      JSON.stringify({
        ok: false,
        reason: "request_failed",
        error: e instanceof Error ? e.message : String(e),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
