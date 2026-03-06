import { serve } from "std/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });

  try {
    const { blocks } = await req.json();
    const AI_GATEWAY_TOKEN = Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("AI_GATEWAY_TOKEN");
    if (!AI_GATEWAY_TOKEN) throw new Error("AI gateway token is not configured");

    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      return new Response(JSON.stringify({ error: "No blocks provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const blocksText = blocks.map((b: { id: string; content: string }, i: number) =>
      `Block ${i + 1} (ID: ${b.id}): "${b.content}"`
    ).join("\n");

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
            content: `You are a recall question generator for university students. Given note blocks, generate 1-2 active recall questions per block that test understanding. Questions should work for ANY university subject (science, law, medicine, engineering, humanities, business, etc.).

Rules:
- Generate questions that test understanding, not just memorization
- For definitions: "What is X?" or "Define X"
- For processes: "Explain how X works" or "What are the steps of X?"
- For comparisons: "How does X differ from Y?"
- For formulas/numbers: "What is the formula/value for X?"
- Keep questions concise and clear
- Return valid JSON only`
          },
          {
            role: "user",
            content: `Generate recall questions for these note blocks. Return a JSON array where each element has "block_id" and "questions" (array of question strings):\n\n${blocksText}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_questions",
              description: "Return generated recall questions for note blocks",
              parameters: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        block_id: { type: "string" },
                        questions: {
                          type: "array",
                          items: { type: "string" }
                        }
                      },
                      required: ["block_id", "questions"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["results"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_questions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No questions generated" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed.results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-questions error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
      details: e instanceof Error ? e.stack : undefined
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
