import { pgTable, serial, text, bigint, timestamp } from "drizzle-orm/pg-core";

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Original file name
  size: bigint("size", { mode: "number" }).notNull(), // File size in bytes
  mimeType: text("mime_type").notNull(), // MIME type (e.g., video/mp4)
  type: text("type").notNull(), // Category (e.g., video, image, document)
  path: text("path").notNull().unique(), // The unique S3 Key (UUID based)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

