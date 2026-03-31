import { query } from "./db.js";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL;
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";

function toVectorLiteral(values) {
  return `[${values.join(",")}]`;
}

export async function embedText(text) {
  if (!OLLAMA_BASE_URL) {
    throw new Error("OLLAMA_BASE_URL is required for RAG embeddings.");
  }

  const response = await fetch(`${OLLAMA_BASE_URL.replace(/\/+$/, "")}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_EMBED_MODEL,
      prompt: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Embedding provider error (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
    throw new Error("Embedding response is invalid.");
  }
  return data.embedding;
}

export async function indexNoteChunks({ userId, subjectId, noteId, blocks }) {
  if (!userId || !subjectId || !noteId) return;
  await query("delete from public.rag_chunks where note_id = $1", [noteId]);

  for (const block of blocks) {
    const content = String(block.content || "").trim();
    if (!content) continue;
    const embedding = await embedText(content);
    await query(
      `
      insert into public.rag_chunks (user_id, subject_id, note_id, block_id, content, embedding)
      values ($1, $2, $3, $4, $5, $6::vector)
      `,
      [userId, subjectId, noteId, block.id || null, content, toVectorLiteral(embedding)],
    );
  }
}

export async function retrieveRelevantChunks({ userId, question, topK = 5, subjectId = null }) {
  const embedding = await embedText(question);
  const k = Math.max(1, Math.min(12, Number(topK) || 5));

  if (subjectId) {
    const result = await query(
      `
      select block_id, note_id, subject_id, content,
             1 - (embedding <=> $1::vector) as score
      from public.rag_chunks
      where user_id = $2 and subject_id = $3
      order by embedding <=> $1::vector
      limit $4
      `,
      [toVectorLiteral(embedding), userId, subjectId, k],
    );
    return result.rows;
  }

  const result = await query(
    `
    select block_id, note_id, subject_id, content,
           1 - (embedding <=> $1::vector) as score
    from public.rag_chunks
    where user_id = $2
    order by embedding <=> $1::vector
    limit $3
    `,
    [toVectorLiteral(embedding), userId, k],
  );
  return result.rows;
}
