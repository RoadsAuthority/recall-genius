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
        const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
        if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

        if (!content || typeof content !== "string") {
            return new Response(JSON.stringify({ error: "No content provided" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
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
            console.error("Groq error:", response.status, errorData);
            throw new Error(`Groq error: ${response.status} - ${errorData.error?.message || JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        // OpenAI with json_object might return the array inside a property
        const contentText = data.choices?.[0]?.message?.content;
        const parsed = JSON.parse(contentText);
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
