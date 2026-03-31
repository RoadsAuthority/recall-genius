import "dotenv/config";
import cors from "cors";
import express from "express";
import { getPool, query } from "./db.js";
import { getBearerToken, hashPassword, signAuthToken, verifyAuthToken, verifyPassword } from "./auth.js";
import {
  answerWithRag,
  checkAnswer,
  explainConcept,
  generateFlashcards,
  generateQuestions,
  generateStudyPack,
  summarizeContent,
} from "./ai.js";
import { indexNoteChunks, retrieveRelevantChunks } from "./rag.js";

const app = express();
const port = Number(process.env.API_PORT || 4000);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) || true,
    credentials: true,
  }),
);
app.use(express.json());

app.post("/api/auth/signup", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: "Valid email and password (>=6 chars) are required" });
  }

  try {
    const passwordHash = await hashPassword(password);
    const userResult = await query(
      "insert into public.app_users (email, password_hash) values ($1, $2) returning id, email",
      [email, passwordHash],
    );
    const user = userResult.rows[0];
    await query(
      "insert into public.profiles (id, full_name, plan_type) values ($1, '', 'free') on conflict (id) do nothing",
      [user.id],
    );
    await query(
      "insert into public.notification_settings (user_id) values ($1) on conflict (user_id) do nothing",
      [user.id],
    );
    const token = signAuthToken({ sub: user.id, email: user.email });
    return res.status(201).json({ data: { token, user } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  try {
    const result = await query(
      "select id, email, password_hash from public.app_users where lower(email) = lower($1) limit 1",
      [email],
    );
    const row = result.rows[0];
    if (!row) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await verifyPassword(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signAuthToken({ sub: row.id, email: row.email });
    return res.status(200).json({ data: { token, user: { id: row.id, email: row.email } } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.get("/api/auth/me", async (req, res) => {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const claims = verifyAuthToken(token);
    return res.status(200).json({
      data: {
        user: { id: claims.sub, email: claims.email },
      },
    });
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
});

app.post("/api/ai/summarize-content", async (req, res) => {
  try {
    const content = String(req.body?.content || "");
    const data = await summarizeContent(content);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "AI error" });
  }
});

app.post("/api/ai/generate-flashcards", async (req, res) => {
  try {
    const content = String(req.body?.content || "");
    const data = await generateFlashcards(content);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "AI error" });
  }
});

app.post("/api/ai/generate-questions", async (req, res) => {
  try {
    const blocks = Array.isArray(req.body?.blocks) ? req.body.blocks : [];
    const data = await generateQuestions(blocks);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "AI error" });
  }
});

app.post("/api/ai/explain-concept", async (req, res) => {
  try {
    const term = String(req.body?.term || "");
    const level = String(req.body?.level || "beginner");
    const userId = String(req.body?.user_id || "").trim();
    const subjectId = String(req.body?.subject_id || "").trim();
    const retrieved = userId
      ? await retrieveRelevantChunks({ userId, question: term, topK: 5, subjectId: subjectId || null })
      : [];
    const data = await explainConcept(
      term,
      level,
      retrieved.map((r) => r.content),
    );
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "AI error" });
  }
});

app.post("/api/ai/generate-study-pack", async (req, res) => {
  try {
    const content = String(req.body?.content || "");
    const data = await generateStudyPack(content);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "AI error" });
  }
});

app.post("/api/ai/check-answer", async (req, res) => {
  try {
    const content = String(req.body?.content || "");
    const question = String(req.body?.question || "");
    const userAnswer = String(req.body?.user_answer || "");
    const data = await checkAnswer(content, question, userAnswer);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "AI error" });
  }
});

app.post("/api/ai/call-ai-feature", async (req, res) => {
  const feature = String(req.body?.feature || "");
  const payload = req.body?.payload || {};
  try {
    if (feature === "summary") {
      const data = await summarizeContent(String(payload.content || ""));
      return res.status(200).json({ ok: true, data });
    }
    if (feature === "flashcards") {
      const data = await generateFlashcards(String(payload.content || ""));
      return res.status(200).json({ ok: true, data });
    }
    if (feature === "practice-questions") {
      const blocks = Array.isArray(payload.blocks) ? payload.blocks : [];
      const data = await generateQuestions(blocks);
      return res.status(200).json({ ok: true, data });
    }
    if (feature === "study-pack") {
      const data = await generateStudyPack(String(payload.content || ""));
      return res.status(200).json({ ok: true, data });
    }
    return res.status(200).json({ ok: false, reason: "not_implemented" });
  } catch (error) {
    return res.status(500).json({ ok: false, reason: "request_failed", error: error instanceof Error ? error.message : "AI error" });
  }
});

app.post("/api/rag/query", async (req, res) => {
  try {
    const userId = String(req.body?.user_id || "").trim();
    const question = String(req.body?.question || "").trim();
    const subjectId = String(req.body?.subject_id || "").trim();
    const topK = Number(req.body?.top_k || 5);
    if (!userId || !question) {
      return res.status(400).json({ error: "user_id and question are required" });
    }

    const chunks = await retrieveRelevantChunks({
      userId,
      question,
      topK,
      subjectId: subjectId || null,
    });
    const answer = await answerWithRag(
      question,
      chunks.map((c) => c.content),
    );
    return res.status(200).json({
      data: {
        answer: answer.answer,
        chunks,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "RAG error" });
  }
});

app.post("/api/billing/create-checkout", async (_req, res) => {
  return res.status(501).json({ error: "Billing checkout is not configured on Neon backend yet." });
});

app.get("/api/health", async (_req, res) => {
  try {
    await query("select 1 as ok");
    res.status(200).json({ ok: true, db: "connected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ ok: false, db: "disconnected", error: message });
  }
});

app.get("/api/subjects", async (_req, res) => {
  const userId = String(_req.query.user_id || "").trim();
  if (!userId) {
    return res.status(400).json({ error: "user_id is required" });
  }

  try {
    const result = await query(
      `
      select
        s.id,
        s.name,
        s.user_id,
        s.created_at,
        count(distinct n.id)::int as note_count,
        count(distinct case when nb.next_review <= now() then nb.id end)::int as due_count
      from public.subjects s
      left join public.notes n on n.subject_id = s.id
      left join public.note_blocks nb on nb.note_id = n.id
      where s.user_id = $1
      group by s.id
      order by s.created_at desc
      `,
      [userId],
    );
    res.status(200).json({ data: result.rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/subjects", async (req, res) => {
  const { user_id: userId, name } = req.body || {};
  const safeUserId = String(userId || "").trim();
  const safeName = String(name || "").trim();

  if (!safeUserId || !safeName) {
    return res.status(400).json({ error: "user_id and name are required" });
  }

  try {
    const result = await query(
      "insert into public.subjects (user_id, name) values ($1, $2) returning id, name, user_id, created_at",
      [safeUserId, safeName],
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.delete("/api/subjects/:id", async (req, res) => {
  const subjectId = String(req.params.id || "").trim();
  if (!subjectId) return res.status(400).json({ error: "subject id is required" });

  try {
    await query("delete from public.subjects where id = $1", [subjectId]);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.get("/api/subjects/:id", async (req, res) => {
  const subjectId = String(req.params.id || "").trim();
  if (!subjectId) return res.status(400).json({ error: "subject id is required" });

  try {
    const result = await query(
      "select id, name, user_id, created_at from public.subjects where id = $1 limit 1",
      [subjectId],
    );
    return res.status(200).json({ data: result.rows[0] || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.get("/api/notes", async (_req, res) => {
  const subjectId = String(_req.query.subject_id || "").trim();
  if (!subjectId) {
    return res.status(400).json({ error: "subject_id is required" });
  }

  try {
    const result = await query(
      `
      select
        n.id,
        n.title,
        n.subject_id,
        n.created_at,
        (
          select
            case
              when length(nb.content) > 150 then substring(nb.content, 1, 150) || '...'
              else nb.content
            end
          from public.note_blocks nb
          where nb.note_id = n.id
          order by nb.block_order asc
          limit 1
        ) as preview
      from public.notes n
      where n.subject_id = $1
      order by n.created_at desc
      limit 200
      `,
      [subjectId],
    );
    return res.status(200).json({ data: result.rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.post("/api/notes", async (req, res) => {
  const { subject_id: subjectId, title } = req.body || {};
  const safeSubjectId = String(subjectId || "").trim();
  const safeTitle = String(title || "").trim();

  if (!safeSubjectId || !safeTitle) {
    return res.status(400).json({ error: "subject_id and title are required" });
  }

  try {
    const result = await query(
      "insert into public.notes (subject_id, title) values ($1, $2) returning id, subject_id, title, created_at",
      [safeSubjectId, safeTitle],
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.delete("/api/notes/:id", async (req, res) => {
  const noteId = String(req.params.id || "").trim();
  if (!noteId) return res.status(400).json({ error: "note id is required" });

  try {
    await query("delete from public.notes where id = $1", [noteId]);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.get("/api/notes/:id", async (req, res) => {
  const noteId = String(req.params.id || "").trim();
  if (!noteId) return res.status(400).json({ error: "note id is required" });

  try {
    const noteResult = await query(
      "select id, title, subject_id, created_at from public.notes where id = $1 limit 1",
      [noteId],
    );
    if (!noteResult.rows[0]) return res.status(404).json({ error: "Note not found" });

    const blocksResult = await query(
      "select id, content, block_order from public.note_blocks where note_id = $1 order by block_order asc",
      [noteId],
    );

    return res.status(200).json({
      data: {
        ...noteResult.rows[0],
        blocks: blocksResult.rows,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.put("/api/notes/:id/content", async (req, res) => {
  const noteId = String(req.params.id || "").trim();
  const title = String(req.body?.title || "").trim();
  const blocks = Array.isArray(req.body?.blocks) ? req.body.blocks : [];

  if (!noteId || !title) {
    return res.status(400).json({ error: "note id and title are required" });
  }

  if (!blocks.length) {
    return res.status(400).json({ error: "blocks are required" });
  }

  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("update public.notes set title = $1 where id = $2", [title, noteId]);
    const noteResult = await client.query(
      `
      select n.id, n.subject_id, s.user_id
      from public.notes n
      join public.subjects s on s.id = n.subject_id
      where n.id = $1
      limit 1
      `,
      [noteId],
    );
    const noteMeta = noteResult.rows[0];
    await client.query("delete from public.note_blocks where note_id = $1", [noteId]);

    const insertedBlocks = [];
    for (let i = 0; i < blocks.length; i += 1) {
      const content = String(blocks[i] || "").trim();
      if (!content) continue;
      const result = await client.query(
        `
        insert into public.note_blocks
          (note_id, content, block_order, confidence_score, next_review)
        values
          ($1, $2, $3, 0, now())
        returning id, content, block_order
        `,
        [noteId, content, i],
      );
      insertedBlocks.push(result.rows[0]);
    }

    await client.query("commit");
    if (noteMeta) {
      await indexNoteChunks({
        userId: noteMeta.user_id,
        subjectId: noteMeta.subject_id,
        noteId,
        blocks: insertedBlocks,
      }).catch((e) => {
        console.warn("RAG indexing failed:", e);
      });
    }
    return res.status(200).json({ data: { inserted_blocks: insertedBlocks } });
  } catch (error) {
    await client.query("rollback");
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  } finally {
    client.release();
  }
});

app.post("/api/definitions/replace", async (req, res) => {
  const blockIds = Array.isArray(req.body?.block_ids) ? req.body.block_ids : [];
  const definitions = Array.isArray(req.body?.definitions) ? req.body.definitions : [];

  const client = await getPool().connect();
  try {
    await client.query("begin");
    if (blockIds.length) {
      await client.query("delete from public.definitions where source_block_id = any($1::uuid[])", [blockIds]);
    }

    for (const d of definitions) {
      await client.query(
        `
        insert into public.definitions (user_id, subject_id, term, definition, source_block_id)
        values ($1, $2, $3, $4, $5)
        `,
        [d.user_id, d.subject_id, d.term, d.definition, d.source_block_id || null],
      );
    }

    await client.query("commit");
    return res.status(200).json({ ok: true });
  } catch (error) {
    await client.query("rollback");
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  } finally {
    client.release();
  }
});

app.post("/api/recall-questions/replace", async (req, res) => {
  const blockIds = Array.isArray(req.body?.block_ids) ? req.body.block_ids : [];
  const questions = Array.isArray(req.body?.questions) ? req.body.questions : [];

  const client = await getPool().connect();
  try {
    await client.query("begin");
    if (blockIds.length) {
      await client.query("delete from public.recall_questions where block_id = any($1::uuid[])", [blockIds]);
    }

    for (const q of questions) {
      await client.query(
        "insert into public.recall_questions (block_id, question) values ($1, $2)",
        [q.block_id, q.question],
      );
    }

    await client.query("commit");
    return res.status(200).json({ ok: true });
  } catch (error) {
    await client.query("rollback");
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  } finally {
    client.release();
  }
});

app.post("/api/flashcards/replace", async (req, res) => {
  const noteId = String(req.body?.note_id || "").trim();
  const flashcards = Array.isArray(req.body?.flashcards) ? req.body.flashcards : [];

  if (!noteId) return res.status(400).json({ error: "note_id is required" });

  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("delete from public.flashcards where note_id = $1", [noteId]);

    for (const f of flashcards) {
      await client.query(
        `
        insert into public.flashcards
          (user_id, subject_id, note_id, question, answer)
        values ($1, $2, $3, $4, $5)
        `,
        [f.user_id, f.subject_id, noteId, f.question, f.answer],
      );
    }

    await client.query("commit");
    return res.status(200).json({ ok: true });
  } catch (error) {
    await client.query("rollback");
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  } finally {
    client.release();
  }
});

app.post("/api/concepts", async (req, res) => {
  const { user_id: userId, subject_id: subjectId, type, term, description } = req.body || {};

  try {
    await query(
      `
      insert into public.concepts (user_id, subject_id, type, term, description)
      values ($1, $2, $3, $4, $5)
      `,
      [userId, subjectId, type, term, description],
    );
    return res.status(201).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.get("/api/review-items", async (req, res) => {
  const userId = String(req.query.user_id || "").trim();
  const practice = String(req.query.practice || "false") === "true";
  const subjectId = String(req.query.subject_id || "").trim();
  const noteId = String(req.query.note_id || "").trim();
  const limit = Math.max(1, Math.min(200, Number(req.query.limit || 100)));

  if (!userId) return res.status(400).json({ error: "user_id is required" });

  try {
    const params = [userId];
    let where = "where s.user_id = $1";
    if (!practice) where += " and nb.next_review <= now()";
    if (subjectId) {
      params.push(subjectId);
      where += ` and s.id = $${params.length}`;
    }
    if (noteId) {
      params.push(noteId);
      where += ` and n.id = $${params.length}`;
    }
    params.push(limit);

    const blocksResult = await query(
      `
      select nb.id, nb.content, nb.confidence_score, nb.next_review, nb.note_id
      from public.note_blocks nb
      join public.notes n on n.id = nb.note_id
      join public.subjects s on s.id = n.subject_id
      ${where}
      order by nb.next_review asc
      limit $${params.length}
      `,
      params,
    );
    const blocks = blocksResult.rows;
    const blockIds = blocks.map((b) => b.id);
    if (!blockIds.length) return res.status(200).json({ data: [] });

    const questionsResult = await query(
      "select id, block_id, question from public.recall_questions where block_id = any($1::uuid[])",
      [blockIds],
    );
    const questions = questionsResult.rows;
    const byBlock = new Map();
    for (const q of questions) {
      const list = byBlock.get(q.block_id) || [];
      list.push(q);
      byBlock.set(q.block_id, list);
    }

    const data = blocks.map((b) => ({
      block_id: b.id,
      block_content: b.content,
      confidence_score: b.confidence_score,
      next_review: b.next_review,
      questions: byBlock.get(b.id) || [],
    }));
    return res.status(200).json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.patch("/api/note-blocks/:id/review", async (req, res) => {
  const blockId = String(req.params.id || "").trim();
  const nextReview = req.body?.next_review;
  const confidenceScore = Number(req.body?.confidence_score);

  if (!blockId || !nextReview || Number.isNaN(confidenceScore)) {
    return res.status(400).json({ error: "id, next_review, confidence_score are required" });
  }

  try {
    await query(
      "update public.note_blocks set next_review = $1, confidence_score = $2 where id = $3",
      [nextReview, confidenceScore, blockId],
    );
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.get("/api/definitions-concepts", async (req, res) => {
  const userId = String(req.query.user_id || "").trim();
  if (!userId) return res.status(400).json({ error: "user_id is required" });

  try {
    const [definitionsResult, conceptsResult, subjectsResult] = await Promise.all([
      query("select * from public.definitions where user_id = $1 order by created_at desc", [userId]),
      query("select * from public.concepts where user_id = $1 order by created_at desc", [userId]),
      query("select id, name from public.subjects where user_id = $1", [userId]),
    ]);
    return res.status(200).json({
      data: {
        definitions: definitionsResult.rows,
        concepts: conceptsResult.rows,
        subjects: subjectsResult.rows,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.get("/api/notifications", async (req, res) => {
  const userId = String(req.query.user_id || "").trim();
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 5)));
  if (!userId) return res.status(400).json({ error: "user_id is required" });

  try {
    const result = await query(
      "select * from public.notifications where user_id = $1 order by created_at desc limit $2",
      [userId, limit],
    );
    return res.status(200).json({ data: result.rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.post("/api/notifications/mark-all-read", async (req, res) => {
  const userId = String(req.body?.user_id || "").trim();
  if (!userId) return res.status(400).json({ error: "user_id is required" });

  try {
    await query("update public.notifications set read = true where user_id = $1", [userId]);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.get("/api/profile/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await query(
      "select id, full_name, avatar_url, phone_number, plan_type, created_at from profiles where id = $1 limit 1",
      [userId],
    );
    res.status(200).json({ data: result.rows[0] || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.put("/api/profile/:id", async (req, res) => {
  const userId = String(req.params.id || "").trim();
  const fullName = req.body?.full_name ?? null;
  const phoneNumber = req.body?.phone_number ?? null;
  if (!userId) return res.status(400).json({ error: "user id is required" });

  try {
    const result = await query(
      `
      update public.profiles
      set full_name = $1, phone_number = $2
      where id = $3
      returning id, full_name, avatar_url, phone_number, plan_type, created_at
      `,
      [fullName, phoneNumber, userId],
    );
    return res.status(200).json({ data: result.rows[0] || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.get("/api/notification-settings/:userId", async (req, res) => {
  const userId = String(req.params.userId || "").trim();
  if (!userId) return res.status(400).json({ error: "user id is required" });

  try {
    const result = await query(
      "select * from public.notification_settings where user_id = $1 limit 1",
      [userId],
    );
    return res.status(200).json({ data: result.rows[0] || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.put("/api/notification-settings/:userId", async (req, res) => {
  const userId = String(req.params.userId || "").trim();
  if (!userId) return res.status(400).json({ error: "user id is required" });
  const {
    email_enabled: emailEnabled,
    phone_enabled: phoneEnabled,
    reminder_frequency: reminderFrequency,
    daily_reminder_count: dailyReminderCount,
  } = req.body || {};

  try {
    const result = await query(
      `
      update public.notification_settings
      set email_enabled = $1,
          phone_enabled = $2,
          reminder_frequency = $3,
          daily_reminder_count = $4
      where user_id = $5
      returning *
      `,
      [emailEnabled, phoneEnabled, reminderFrequency, dailyReminderCount, userId],
    );
    return res.status(200).json({ data: result.rows[0] || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
