CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"size" bigint NOT NULL,
	"mime_type" text NOT NULL,
	"type" text NOT NULL,
	"path" text NOT NULL,
	"folder_id" integer,
	"category_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "files_path_unique" UNIQUE("path")
);
