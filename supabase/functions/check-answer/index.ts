import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { content, question, user_answer } = body as {
      content?: string;
      question?: string;
      user_answer?: string;
    };

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!content || typeof content !== "string" || !question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "content and question are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const answer = (user_answer ?? "").trim();
    if (!answer) {
      return new Response(
        JSON.stringify({
          correct: false,
          feedback: "Please type an answer before checking.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
            content: `You are a fair grader for a student's recall answer. You have the original note content and the question. The student typed an answer. Decide if their answer is correct, partially correct, or wrong based ONLY on the note content. Do not use outside knowledge. Be encouraging but accurate. Respond with a short JSON object: { "correct": true or false, "feedback": "one or two sentences" }. Use "correct": true if the main idea is right even if wording differs. Use "correct": false if key facts are wrong or missing.`,
          },
          {
            role: "user",
            content: `Note content:\n${content}\n\nQuestion: ${question}\n\nStudent's answer: ${answer}\n\nRespond with only valid JSON: { "correct": boolean, "feedback": "string" }`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq error:", response.status, err);
      return new Response(
        JSON.stringify({ error: "Could not check answer", correct: false, feedback: "Check failed. Try again or use Show answer." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      return new Response(
        JSON.stringify({ correct: false, feedback: "Could not evaluate." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(raw) as { correct?: boolean; feedback?: string };
    const correct = Boolean(parsed.correct);
    const feedback = typeof parsed.feedback === "string" ? parsed.feedback : (correct ? "Correct!" : "Not quite. Review the note and try again.");

    return new Response(
      JSON.stringify({ correct, feedback }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("check-answer error:", e);
    return new Response(
      JSON.stringify({
        correct: false,
        feedback: e instanceof Error ? e.message : "Something went wrong.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
