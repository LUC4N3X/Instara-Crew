import pg from "pg";
import { runMigrations } from "bullmq";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const pool = new pg.Pool({ connectionString: databaseUrl });
const client = await pool.connect();

try {
  await runMigrations(client);
  console.log("BullMQ PostgreSQL schema is ready.");
} finally {
  client.release();
  await pool.end();
}
