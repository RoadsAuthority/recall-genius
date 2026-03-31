# API Server (Neon Phase 1)

This server is a migration bridge so you can move from Supabase DB to Neon incrementally.

## Environment Variables

Add these to your `.env`:

- `NEON_DATABASE_URL=postgresql://...`
- `JWT_SECRET=<long-random-secret>`
- `API_PORT=4000` (optional)
- `CORS_ORIGIN=http://localhost:5173` (optional)
- `VITE_API_BASE_URL=http://localhost:4000` (for future frontend migration)
- `OLLAMA_BASE_URL=http://127.0.0.1:11434`
- `OLLAMA_MODEL=llama3.1:8b`
- `OLLAMA_EMBED_MODEL=nomic-embed-text`

## Run

```bash
npm run dev:api
```

## Endpoints

- `GET /api/health` - verifies API + Neon connectivity
- `GET /api/subjects` - sample subjects list
- `GET /api/notes?subject_id=<uuid>` - notes for a subject
- `GET /api/profile/:id` - profile lookup by user id

These routes are intentionally minimal and unauthenticated for Phase 1 scaffolding.

## Phase 2: apply Neon schema

Run:

```bash
npm run db:migrate:neon
```

This applies `db/neon/001_initial_schema.sql` to your Neon database.

If you want to apply a different SQL file:

```bash
node server/scripts/apply-neon-migration.js ../../db/neon/your_file.sql
```

Run the auth schema migration too:

```bash
node server/scripts/apply-neon-migration.js ../../db/neon/002_auth.sql
```

Run the RAG schema migration:

```bash
node server/scripts/apply-neon-migration.js ../../db/neon/003_rag.sql
```

