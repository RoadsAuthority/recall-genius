import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const targetArg = process.argv[2] || "../../db/neon/001_initial_schema.sql";
  const sqlPath = path.resolve(__dirname, targetArg);
  const sql = await fs.readFile(sqlPath, "utf8");

  await query(sql);
  console.log(`Applied migration: ${sqlPath}`);
}

run().catch((error) => {
  console.error("Failed to apply migration:", error);
  process.exit(1);
});
