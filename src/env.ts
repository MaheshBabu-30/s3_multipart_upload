import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().optional().default("3000"),
  DATABASE_URL: z.string().url("Aiven DATABASE_URL must be a valid postgres URL"),
  B2_REGION: z.string().min(1, "B2_REGION is required"),
  B2_ENDPOINT: z.string().url("B2_ENDPOINT must be a valid URL"),
  B2_KEY_ID: z.string().min(1, "B2_KEY_ID is required"),
  // Note: in the original index.ts, B2_APP_KEY was used for S3 credentials but process.env.SECRET was printed as B2_APPLICATION_KEY. Let's use B2_APP_KEY specifically.
  B2_APP_KEY: z.string().min(1, "B2_APP_KEY is required"),
  B2_BUCKET_NAME: z.string().min(1, "B2_BUCKET_NAME is required"),
});

// This will throw an error immediately on startup if an env var is missing/incorrect
export const env = envSchema.parse(process.env);
