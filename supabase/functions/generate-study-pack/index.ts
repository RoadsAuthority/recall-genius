import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are an academic study assistant.

Your job is to convert student notes into a structured study pack.

Using the notes provided, generate the following:

1. A clear and concise summary (5-7 sentences).

2. Key Concepts:
Extract the most important concepts or terms from the notes and list them.

3. Flashcards:
Create 5 flashcards in the format:
Term:
Definition:

4. Practice Questions:
Generate 5 study questions that help the student test their understanding.

5. Multiple Choice Questions:
Generate 3 multiple choice questions with 4 answer options each.
Also indicate the correct answer.

Rules:
- Only use information from the notes.
- Do not invent information.
- Keep explanations simple for students.
- Organize the response clearly using headings.

You MUST respond with ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "summary": "string (5-7 sentences)",
  "key_concepts": ["concept1", "concept2", ...],
  "flashcards": [
    { "term": "term text", "definition": "definition text" },
    ...
  ],
  "practice_questions": ["question1", "question2", ...],
  "multiple_choice": [
    {
      "question": "question text",
      "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
      "correct_index": 0
    },
    ...
  ]
}
Use correct_index as 0-based index of the correct option (0 = first option, 1 = second, etc.).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const content = typeof body === "object" && body !== null && "content" in body ? body.content : undefined;
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
      return new Response(
        JSON.stringify({ error: "OLLAMA_BASE_URL or GEMINI_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!content || typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "No content provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `Student Notes:\n\n${content}`;

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("AI provider error:", response.status, errorData);
      return new Response(
        JSON.stringify({
          error: `AI provider error: ${response.status}`,
          details: errorData,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) {
      return new Response(
        JSON.stringify({ error: "No content in AI response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let pack: {
      summary?: string;
      key_concepts?: string[];
      flashcards?: { term: string; definition: string }[];
      practice_questions?: string[];
      multiple_choice?: { question: string; options: string[]; correct_index: number }[];
    };

    try {
      const cleaned = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      pack = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI response was not valid JSON" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        summary: pack.summary ?? "",
        key_concepts: Array.isArray(pack.key_concepts) ? pack.key_concepts : [],
        flashcards: Array.isArray(pack.flashcards) ? pack.flashcards : [],
        practice_questions: Array.isArray(pack.practice_questions) ? pack.practice_questions : [],
        multiple_choice: Array.isArray(pack.multiple_choice) ? pack.multiple_choice : [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("generate-study-pack error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
