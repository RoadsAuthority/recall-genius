import { serve } from "std/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });

    try {
        const { content } = await req.json();
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        const OLLAMA_BASE_URL = Deno.env.get("OLLAMA_BASE_URL");
        const OLLAMA_MODEL = Deno.env.get("OLLAMA_MODEL") ?? "llama3.1:8b";
        const useOllama = Boolean(OLLAMA_BASE_URL);
        const AI_URL = useOllama
            ? `${OLLAMA_BASE_URL!.replace(/\/+$/, "")}/v1/chat/completions`
            : GEMINI_API_KEY
                ? `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${encodeURIComponent(GEMINI_API_KEY)}`
                : "";
        const AI_MODEL = useOllama ? OLLAMA_MODEL : "gemini-1.5-flash";
        if (!useOllama && !GEMINI_API_KEY) throw new Error("OLLAMA_BASE_URL or GEMINI_API_KEY is not configured");

        if (!content || typeof content !== "string") {
            return new Response(JSON.stringify({ error: "No content provided" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const response = await fetch(AI_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: AI_MODEL,
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
            const errorData = await response.json().catch(() => ({}));
            console.error("AI provider error:", response.status, errorData);
            throw new Error(`AI provider error: ${response.status} - ${errorData.error?.message || JSON.stringify(errorData)}`);
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
