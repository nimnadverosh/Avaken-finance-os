import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Drizzle DB client (Supabase / Neon Postgres).
 *
 * The dashboard currently renders from the typed seed data in
 * `src/lib/data` so it runs with zero configuration. To switch to a live
 * database, set `DATABASE_URL` and replace the selectors in
 * `src/lib/data/queries.ts` with Drizzle queries against this client.
 */
const connectionString = process.env.DATABASE_URL;

const client = connectionString
  ? postgres(connectionString, { prepare: false })
  : undefined;

export const db = client
  ? drizzle(client, { schema })
  : (undefined as unknown as ReturnType<typeof drizzle>);

export function hasDatabase(): boolean {
  return Boolean(connectionString && client);
}

export { schema };
