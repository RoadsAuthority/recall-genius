async function callAI({ system, user, jsonMode = false }) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;
  const ollamaModel = process.env.OLLAMA_MODEL || "llama3.1:8b";

  const useOllama = Boolean(ollamaBaseUrl);
  const url = useOllama
    ? `${ollamaBaseUrl.replace(/\/+$/, "")}/v1/chat/completions`
    : `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${encodeURIComponent(geminiKey || "")}`;
  let model = useOllama ? ollamaModel : "gemini-1.5-flash";

  if (!useOllama && !geminiKey) {
    throw new Error("OLLAMA_BASE_URL or GEMINI_API_KEY is not configured");
  }

  let response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      temperature: 0.3,
    }),
  });

  if (!response.ok && useOllama && response.status === 404) {
    const tagsRes = await fetch(`${ollamaBaseUrl.replace(/\/+$/, "")}/api/tags`);
    if (tagsRes.ok) {
      const tags = await tagsRes.json().catch(() => ({}));
      const installed = Array.isArray(tags?.models) ? tags.models.map((m) => m?.name).filter(Boolean) : [];
      const fallback =
        installed.find((name) => /^llama3(\.|:|$)/i.test(name)) ||
        installed.find((name) => /^qwen/i.test(name)) ||
        installed[0];
      if (fallback) {
        model = fallback;
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
            temperature: 0.3,
          }),
        });
      }
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `AI provider error (${response.status}): ${text.slice(0, 200)}. If using Ollama, run: ollama pull ${ollamaModel}`
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error("No AI response content");
  return content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export async function summarizeContent(content) {
  const text = await callAI({
    system: "You are an expert academic summarizer. Provide a concise structured summary.",
    user: `Summarize these notes:\n\n${content}`,
  });
  return { summary: text };
}

export async function generateFlashcards(content) {
  const raw = await callAI({
    system:
      "Generate 3-5 flashcards. Return JSON object with key flashcards as array of {question,answer}.",
    user: `Create flashcards for:\n\n${content}`,
    jsonMode: true,
  });
  const parsed = JSON.parse(raw);
  return { flashcards: parsed.flashcards || [] };
}

export async function generateQuestions(blocks) {
  const blocksText = blocks
    .map((b, i) => `Block ${i + 1} (ID: ${b.id}): "${b.content}"`)
    .join("\n");
  const raw = await callAI({
    system:
      'Given blocks, return JSON: {"results":[{"block_id":"id","questions":["q1","q2"]}]}. Focus on key concepts.',
    user: blocksText,
    jsonMode: true,
  });
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.results) ? parsed.results : [];
}

export async function explainConcept(term, level, retrievedContext = []) {
  const prompt =
    level === "beginner"
      ? `Explain "${term}" like I am 5 years old.`
      : `Give a detailed academic explanation of "${term}".`;
  const contextText = retrievedContext.length
    ? `Use this retrieved study context to ground your answer:\n${retrievedContext.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\n`
    : "";
  const explanation = await callAI({
    system: "You explain concepts clearly and accurately. Prefer retrieved context when available and do not invent facts.",
    user: `${contextText}${prompt}`,
  });
  return { explanation };
}

export async function generateStudyPack(content) {
  const raw = await callAI({
    system:
      'Return only JSON with keys summary, key_concepts, flashcards[{term,definition}], practice_questions, multiple_choice[{question,options,correct_index}].',
    user: `Student notes:\n\n${content}`,
    jsonMode: true,
  });
  const parsed = JSON.parse(raw);
  return {
    summary: parsed.summary || "",
    key_concepts: parsed.key_concepts || [],
    flashcards: parsed.flashcards || [],
    practice_questions: parsed.practice_questions || [],
    multiple_choice: parsed.multiple_choice || [],
  };
}

export async function checkAnswer(content, question, userAnswer) {
  const raw = await callAI({
    system:
      'Grade student answer based only on note content. Return JSON {"correct":boolean,"feedback":"..."}',
    user: `Note:\n${content}\n\nQuestion:${question}\n\nAnswer:${userAnswer}`,
    jsonMode: true,
  });
  const parsed = JSON.parse(raw);
  return { correct: Boolean(parsed.correct), feedback: parsed.feedback || "" };
}

export async function answerWithRag(queryText, retrievedContext = []) {
  const contextText = retrievedContext.length
    ? `Retrieved context:\n${retrievedContext.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\n`
    : "No retrieved context found.\n\n";
  const answer = await callAI({
    system:
      "You are a study assistant. Answer based on retrieved context first. If context is missing, say it clearly and give a cautious best-effort answer.",
    user: `${contextText}Question: ${queryText}`,
  });
  return { answer };
}
