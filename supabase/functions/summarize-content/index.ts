import { serve } from "std/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });

    try {
        const { content } = await req.json();
        const AI_GATEWAY_TOKEN = Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("AI_GATEWAY_TOKEN");

        if (!AI_GATEWAY_TOKEN) throw new Error("AI gateway token is not configured");

        if (!content || typeof content !== "string") {
            return new Response(JSON.stringify({ error: "No content provided" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${AI_GATEWAY_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert academic summarizer. Provide a concise, highly structured summary of the provided notes. Use bullet points for key concepts. Keep it professional and focused on university-level material."
                    },
                    {
                        role: "user",
                        content: `Please summarize these notes:\n\n${content}`
                    }
                ],
            }),
        });

        if (!response.ok) {
            throw new Error(`AI gateway error: ${response.status}`);
        }

        const data = await response.json();
        const summary = data.choices?.[0]?.message?.content;

        if (!summary) throw new Error("No summary generated");

        return new Response(JSON.stringify({ summary }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (e) {
        console.error("summarize-content error:", e);
        return new Response(JSON.stringify({
            error: e instanceof Error ? e.message : String(e),
            details: e instanceof Error ? e.stack : undefined
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
