import { z } from "zod";

export const startMultipartSchema = z.object({
  fileName: z.string().min(1, "fileName is required"),
  contentType: z.string().min(1, "contentType is required"),
  // fileSize is now optional as the backend doesn't calculate chunks anymore
  fileSize: z.number().positive("fileSize must be a positive number").optional(),
  type: z.string().min(1, "type (e.g. video, image) is required"),
});

export const urlsMultipartSchema = z.object({
  uploadId: z.string().min(1, "uploadId is required"),
  fileKey: z.string().min(1, "fileKey is required"),
  // PILLAR: DoS Protection - Max 1,000 parts per request
  partsCount: z.number()
    .positive("partsCount must be a positive number")
    .max(1000, "Maximum parts limit is 1,000 for security"),
});

// Using ETag and PartNumber as AWS completed parts require these.
export const completeMultipartSchema = z.object({
  uploadId: z.string().min(1, "uploadId is required"),
  fileKey: z.string().min(1, "fileKey is required"),
  fileName: z.string().min(1, "fileName is required"),
  fileSize: z.number().positive("fileSize must be positive"), // Final confirmation
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
  partsCount: z.number()
    .positive("partsCount must be a positive number")
    .max(1000, "Maximum parts limit is 1,000 for security"),
});

// Exporting types for potential frontend/backend shared usage
export type StartMultipartInput = z.infer<typeof startMultipartSchema>;
export type UrlsMultipartInput = z.infer<typeof urlsMultipartSchema>;
export type CompleteMultipartInput = z.infer<typeof completeMultipartSchema>;
export type AbortMultipartInput = z.infer<typeof abortMultipartSchema>;
export type ResumeMultipartInput = z.infer<typeof resumeMultipartSchema>;
