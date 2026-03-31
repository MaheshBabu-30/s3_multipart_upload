import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env.js";
import * as schema from "./schema.js";

// Initialize the postgres.js client. Aiven strict SSL configuration is enforced.
const client = postgres(env.DATABASE_URL, { ssl: "require" });

// Export the singleton db instance with full schema typing
export const db = drizzle(client, { schema });
