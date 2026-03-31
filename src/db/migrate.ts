import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "../env.js";

const runMigrate = async () => {
  console.log("🚀 Starting database migration towards Aiven...");
  
  // Use postgres.js client directly with SSL required for Aiven. max: 1 isolates the connection pool
  const migrationClient = postgres(env.DATABASE_URL, { ssl: "require", max: 1 });
  const db = drizzle(migrationClient);
  
  await migrate(db, { migrationsFolder: "./drizzle" });
  
  console.log("✅ Migrations applied successfully!");
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
