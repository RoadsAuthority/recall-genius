import { serve } from "std/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { status: 200, headers: corsHeaders })
    }

    try {
        const { term, level } = await req.json()
        const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
        if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

        const prompt = level === "beginner"
            ? `Explain the concept "${term}" like I'm 5 years old. Use simple analogies and easy language.`
            : `Provide a detailed, academic-level explanation of the concept "${term}". Include technical details and context suitable for a university student.`;

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
                        content: "You are an expert academic assistant that explains complex concepts clearly and accurately."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Groq error:", response.status, errorData);
            throw new Error(`Groq error: ${response.status} - ${errorData.error?.message || JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const explanation = data.choices?.[0]?.message?.content;

        if (!explanation) throw new Error("No explanation generated");

        return new Response(
            JSON.stringify({ explanation }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        console.error("explain-concept error:", error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            details: error instanceof Error ? error.stack : undefined
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
