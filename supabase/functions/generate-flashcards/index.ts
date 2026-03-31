import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

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
                        content: "You are an expert at creating active recall flashcards. Given a piece of text, generate 3-5 high-quality flashcards. Each flashcard must have a clear 'question' and a concise 'answer'. Return only a JSON array of objects with 'question' and 'answer' keys."
                    },
                    {
                        role: "user",
                        content: `Create flashcards for these notes:\n\n${content}`
                    }
                ],
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("AI provider error:", response.status, errorData);
            throw new Error(`AI provider error: ${response.status} - ${errorData.error?.message || JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        // OpenAI with json_object might return the array inside a property
        const contentText = data.choices?.[0]?.message?.content;
        const cleaned = typeof contentText === "string"
            ? contentText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
            : "{}";
        const parsed = JSON.parse(cleaned);
        const flashcards = parsed.flashcards || parsed.cards || (Array.isArray(parsed) ? parsed : Object.values(parsed)[0]);

        return new Response(JSON.stringify({ flashcards }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        console.error("Error in generate-flashcards:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
