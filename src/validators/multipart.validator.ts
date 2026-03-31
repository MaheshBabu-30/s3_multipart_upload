import { z } from "zod";

export const startMultipartSchema = z.object({
  fileName: z.string().min(1, "fileName is required"),
  contentType: z.string().min(1, "contentType is required"),
  fileSize: z.number().positive("fileSize must be a positive number"),
  type: z.string().min(1, "type (e.g. video, image) is required"),
});

export const urlsMultipartSchema = z.object({
  uploadId: z.string().min(1, "uploadId is required"),
  fileKey: z.string().min(1, "fileKey is required"),
  totalParts: z.number().positive("totalParts must be a positive number"),
});

// Using ETag and PartNumber as AWS completed parts require these.
export const completeMultipartSchema = z.object({
  uploadId: z.string().min(1, "uploadId is required"),
  fileKey: z.string().min(1, "fileKey is required"),
  fileName: z.string().min(1, "fileName is required"),
  fileSize: z.number().positive("fileSize must be positive"),
  contentType: z.string().min(1, "contentType is required"),
  type: z.string().min(1, "type (e.g. video, image) is required"),
  parts: z.array(
    z.object({
      ETag: z.string().min(1, "ETag is required for each part (returned by S3 on part upload)"),
      PartNumber: z.number().positive("PartNumber must be positive"),
    })
  ).min(1, "At least one uploaded part is required for completion"),
});

export const abortMultipartSchema = z.object({
  uploadId: z.string().min(1, "uploadId is required"),
  fileKey: z.string().min(1, "fileKey is required"),
});

export const resumeMultipartSchema = z.object({
  uploadId: z.string().min(1, "uploadId is required"),
  fileKey: z.string().min(1, "fileKey is required"),
  totalParts: z.number().positive("totalParts must be a positive number"),
});

// Exporting types for potential frontend/backend shared usage
export type StartMultipartInput = z.infer<typeof startMultipartSchema>;
export type UrlsMultipartInput = z.infer<typeof urlsMultipartSchema>;
export type CompleteMultipartInput = z.infer<typeof completeMultipartSchema>;
export type AbortMultipartInput = z.infer<typeof abortMultipartSchema>;
export type ResumeMultipartInput = z.infer<typeof resumeMultipartSchema>;
