import { serve } from "std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type QuestionResult = { block_id: string; questions: string[] };

function capQuestionsForFreePlan(results: QuestionResult[], maxTotalQuestions: number): QuestionResult[] {
  let remaining = maxTotalQuestions;
  const capped: QuestionResult[] = [];

  for (const item of results) {
    if (remaining <= 0) break;
    const safeQuestions = Array.isArray(item.questions) ? item.questions : [];
    const allowed = safeQuestions.slice(0, remaining);
    remaining -= allowed.length;
    capped.push({ block_id: item.block_id, questions: allowed });
  }

  return capped;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });

  try {
    const FREE_PLAN_QUESTION_LIMIT = 5;
    let body: { blocks?: unknown };
    try {
      body = req.method === "POST" && req.body ? await req.json() : {};
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
    const { blocks } = body;

    let isPremium = false;
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const authHeader = req.headers.get("Authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

      if (supabaseUrl && serviceRoleKey && token) {
        const admin = createClient(supabaseUrl, serviceRoleKey);
        const { data: userData } = await admin.auth.getUser(token);
        const userId = userData?.user?.id;
        if (userId) {
          const { data: profile } = await admin
            .from("profiles")
            .select("plan_type")
            .eq("id", userId)
            .maybeSingle();
          isPremium = profile?.plan_type === "premium";
        }
      }
    } catch (planError) {
      // If plan detection fails, we safely fall back to free-plan limits.
      console.warn("generate-questions plan detection failed:", planError);
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return jsonResponse(
        { error: "GROQ_API_KEY is not configured. Set it in Supabase: Project Settings → Edge Functions → Secrets (or: supabase secrets set GROQ_API_KEY=your_key)." },
        500
      );
    }

    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      return jsonResponse({ error: "No blocks provided" }, 400);
    }

    const blocksText = blocks.map((b: { id: string; content: string }, i: number) =>
      `Block ${i + 1} (ID: ${b.id}): "${b.content}"`
    ).join("\n");

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
            content: `You are a recall question generator for university students. Given note blocks, generate 1-2 active recall questions per block that focus on the MOST IMPORTANT parts of the notes.

Priority: Extract and test the key concepts, main ideas, definitions, and critical facts—not minor details. Questions should help students remember what matters for exams and understanding.

Rules:
- Focus on the most important concepts and takeaways in each block
- For definitions/key terms: "What is X?" or "Define X"
- For processes: "Explain how X works" or "What are the steps of X?"
- For comparisons: "How does X differ from Y?"
- For formulas/numbers: "What is the formula/value for X?"
- Prefer questions that test core understanding, not trivia
- Keep questions concise and clear

You must respond with ONLY a valid JSON object (no markdown, no code fence) with this exact structure:
{ "results": [ { "block_id": "<block id from the input>", "questions": ["question 1", "question 2"] }, ... ] }
Use the exact block_id string from each "Block N (ID: xxx)" line in the input.`
          },
          {
            role: "user",
            content: `Generate recall questions for these note blocks. Return JSON with a "results" array; each element must have "block_id" and "questions" (array of strings).\n\n${blocksText}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResponse({ error: "Rate limit exceeded, please try again later." }, 429);
      }
      const t = await response.text();
      console.error("Groq error:", response.status, t);
      return jsonResponse({ error: `Groq API error (${response.status})`, details: t.slice(0, 200) }, 500);
    }

    const data = await response.json();
    const contentText = data.choices?.[0]?.message?.content;
    if (!contentText || typeof contentText !== "string") {
      return jsonResponse({ error: "No questions generated" }, 500);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(contentText);
    } catch {
      return jsonResponse({ error: "Invalid JSON from AI" }, 500);
    }
    const rawResults = Array.isArray((parsed as { results?: unknown })?.results)
      ? (parsed as { results: unknown[] }).results
      : parsed;
    if (!Array.isArray(rawResults)) {
      return jsonResponse({ error: "Invalid response shape" }, 500);
    }

    const normalizedResults: QuestionResult[] = rawResults
      .filter((r): r is { block_id: unknown; questions: unknown } =>
        !!r && typeof r === "object" && "block_id" in r && "questions" in r
      )
      .map((r) => ({
        block_id: String(r.block_id),
        questions: Array.isArray(r.questions)
          ? r.questions.filter((q): q is string => typeof q === "string")
          : [],
      }));

    const finalResults = isPremium
      ? normalizedResults
      : capQuestionsForFreePlan(normalizedResults, FREE_PLAN_QUESTION_LIMIT);

    return jsonResponse(finalResults, 200);
  } catch (e) {
    console.error("generate-questions error:", e);
    return jsonResponse({
      error: e instanceof Error ? e.message : "Unknown error",
      details: e instanceof Error ? e.stack : undefined,
    }, 500);
  }
});
