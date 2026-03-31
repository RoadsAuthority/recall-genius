import { serve } from "std/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const send = (body: Record<string, unknown>, status: number) =>
        new Response(JSON.stringify(body), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status,
        });

    try {
        let body: { term?: string; level?: string };
        try {
            body = await req.json();
        } catch {
            return send({ error: "Invalid JSON body" }, 400);
        }
        const term = body?.term;
        const level = body?.level ?? "beginner";
        if (!term || typeof term !== "string" || !term.trim()) {
            return send({ error: "Missing or invalid 'term'" }, 400);
        }

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
        if (!useOllama && !GEMINI_API_KEY) {
            return send({ error: "AI explanation is not configured (OLLAMA_BASE_URL or GEMINI_API_KEY missing)." }, 503);
        }

        const prompt = level === "beginner"
            ? `Explain the concept "${term}" like I'm 5 years old. Use simple analogies and easy language.`
            : `Provide a detailed, academic-level explanation of the concept "${term}". Include technical details and context suitable for a university student.`;

        const response = await fetch(AI_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: AI_MODEL,
                messages: [
                    {
                        role: "system",
                        content: "You are an expert academic assistant that explains complex concepts clearly and accurately."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
            }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const msg = (data as { error?: { message?: string } })?.error?.message || (data as { message?: string })?.message || JSON.stringify(data);
            console.error("AI provider error:", response.status, data);
            return send({ error: `AI provider error: ${msg}` }, 502);
        }

        const explanation = (data as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content;
        if (!explanation) {
            return send({ error: "No explanation generated" }, 502);
        }

        return send({ explanation }, 200);
    } catch (error) {
        console.error("explain-concept error:", error);
        return send({
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
})
