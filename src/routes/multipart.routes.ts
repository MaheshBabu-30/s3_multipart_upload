import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { S3Service } from "../services/s3.service.js";
import { db } from "../db/index.js";
import { files } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  startMultipartSchema,
  urlsMultipartSchema,
  completeMultipartSchema,
  abortMultipartSchema,
  resumeMultipartSchema,
} from "../validators/multipart.validator.js";

const multipartRoutes = new Hono();

// =============================
// 1️⃣ START MULTIPART
// =============================
multipartRoutes.post(
  "/start",
  zValidator("json", startMultipartSchema),
  async (c) => {
    try {
      const { fileName, contentType, fileSize, type } = c.req.valid("json");

      const result = await S3Service.startMultipartUpload(
        fileName,
        contentType,
        fileSize
      );

      return c.json(result);
    } catch (err) {
      console.error("[Start Error]:", err);
      return c.json({ error: "Failed to start upload session" }, 500);
    }
  }
);

// =============================
// 2️⃣ GENERATE ALL PART URLS
// =============================
multipartRoutes.post(
  "/urls",
  zValidator("json", urlsMultipartSchema),
  async (c) => {
    try {
      const { uploadId, fileKey, totalParts } = c.req.valid("json");

      const partsUrls = await S3Service.generatePresignedUrls(
        uploadId,
        fileKey,
        totalParts
      );

      return c.json({ parts: partsUrls });
    } catch (err) {
      console.error("[URLs Error]:", err);
      return c.json({ error: "Failed to generate presigned URLs" }, 500);
    }
  }
);

// =============================
// 3️⃣ COMPLETE MULTIPART (AND DB SAVE)
// =============================
multipartRoutes.post(
  "/complete",
  zValidator("json", completeMultipartSchema),
  async (c) => {
    try {
      const { uploadId, fileKey, fileName, fileSize, contentType, type, parts } = c.req.valid("json");

      // 1. Stitch chunks in B2
      await S3Service.completeMultipartUpload(
        uploadId,
        fileKey,
        parts
      );

      // 2. Save metadata to Aiven PostgreSQL database (Pillar 4 compliant)
      const [newFile] = await db.insert(files).values({
        name: fileName,
        size: fileSize,
        mimeType: contentType,
        type: type,
        path: fileKey,
      }).returning();

      return c.json({
        message: "Upload completed safely! Saved to DB.",
        file: newFile,
      });
    } catch (err) {
      console.error("[Complete Error]:", err);
      return c.json({ error: "Failed to complete upload" }, 500);
    }
  }
);

// =============================
// 4️⃣ ABORT MULTIPART
// =============================
multipartRoutes.post(
  "/abort",
  zValidator("json", abortMultipartSchema),
  async (c) => {
    try {
      const { uploadId, fileKey } = c.req.valid("json");

      await S3Service.abortMultipartUpload(uploadId, fileKey);

      return c.json({ message: "Upload aborted successfully" });
    } catch (err) {
      console.error("[Abort Error]:", err);
      return c.json({ error: "Failed to abort upload" }, 500);
    }
  }
);

// =============================
// 5️⃣ DOWNLOAD FILE (URL JSON)
// =============================
multipartRoutes.get("/:id/download", async (c) => {
  try {
    const fileId = parseInt(c.req.param("id"), 10);

    if (isNaN(fileId)) {
      return c.json({ error: "Invalid file ID format" }, 400);
    }

    // 1. Lookup file in DB
    const [fileRecord] = await db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);

    if (!fileRecord) {
      return c.json({ error: "File not found in database" }, 404);
    }

    // 2. Generate secure presigned URL via S3 SDK
    const downloadUrl = await S3Service.generateDownloadUrl(fileRecord.path);

    // 3. Return JSON with the temporary URL for the frontend SPA to consume
    return c.json({ 
      downloadUrl, 
      expiresInSeconds: 900,
      file: fileRecord 
    });
  } catch (err) {
    console.error("[Download Error]:", err);
    return c.json({ error: "Failed to generate download link" }, 500);
  }
});

// =============================
// 6️⃣ DELETE FILE
// =============================
multipartRoutes.delete("/:id", async (c) => {
  try {
    const fileId = parseInt(c.req.param("id"), 10);

    if (isNaN(fileId)) {
      return c.json({ error: "Invalid file ID format" }, 400);
    }

    // 1. Find record in DB
    const [fileRecord] = await db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);

    if (!fileRecord) {
      return c.json({ error: "File not found" }, 404);
    }

    // 2. Erase from S3/B2 Bucket
    await S3Service.deleteFile(fileRecord.path);

    // 3. Erase from Database
    await db.delete(files).where(eq(files.id, fileId));

    return c.json({ message: "File permanently deleted from bucket and database" });
  } catch (err) {
    console.error("[Delete Error]:", err);
    return c.json({ error: "Failed to delete file" }, 500);
  }
});

// =============================
// 7️⃣ RESUME MULTIPART
// =============================
multipartRoutes.post(
  "/resume",
  zValidator("json", resumeMultipartSchema),
  async (c) => {
    try {
      const { uploadId, fileKey, totalParts } = c.req.valid("json");

      // 1. Ask B2 what parts are already there
      const uploadedParts = await S3Service.getUploadedParts(uploadId, fileKey);
      
      const uploadedPartNumbers = uploadedParts.map(p => p.PartNumber!);
      const missingPartNumbers = [];

      for (let i = 1; i <= totalParts; i++) {
        if (!uploadedPartNumbers.includes(i)) {
          missingPartNumbers.push(i);
        }
      }

      // 2. Generate URLs ONLY for the missing parts
      const missingUrls = await S3Service.generateSpecificPresignedUrls(
        uploadId,
        fileKey,
        missingPartNumbers
      );

      return c.json({
        uploadedParts: uploadedParts.map(p => ({
          PartNumber: p.PartNumber,
          ETag: p.ETag
        })).sort((a, b) => a.PartNumber! - b.PartNumber!),
        missingParts: missingUrls
      });

    } catch (err) {
      console.error("[Resume Error]:", err);
      return c.json({ error: "Failed to resume upload session" }, 500);
    }
  }
);

export default multipartRoutes;
