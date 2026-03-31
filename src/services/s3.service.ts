import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListPartsCommand
} from "@aws-sdk/client-s3";
import type { CompletedPart } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env.js";

const s3 = new S3Client({
  region: env.B2_REGION,
  endpoint: env.B2_ENDPOINT,
  credentials: {
    accessKeyId: env.B2_KEY_ID,
    secretAccessKey: env.B2_APP_KEY,
  },
});

export const PART_SIZE = 5 * 1024 * 1024; // 5MB limit for S3 part sizes

export class S3Service {
  /**
   * Initializes a multipart upload session.
   */
  static async startMultipartUpload(fileName: string, contentType: string, fileSize: number, bucketName?: string) {
    // Dynamic Chunk Sizing: 10,000 part limit for S3.
    // Minimum 5MB, or whatever size is needed for files > 50GB.
    const dynamicPartSize = Math.max(
      5 * 1024 * 1024,
      Math.ceil(fileSize / 10000)
    );
    const totalParts = Math.ceil(fileSize / dynamicPartSize);
    
    // Pillar 3: Use a sanitized UUID for the key to prevent path injection
    const fileExtension = fileName.split('.').pop();
    const fileKey = `uploads/${crypto.randomUUID()}${fileExtension ? `.${fileExtension}` : ''}`;

    const command = new CreateMultipartUploadCommand({
      Bucket: bucketName || env.B2_BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
    });

    const response = await s3.send(command);

    return {
      uploadId: response.UploadId!,
      fileKey,
      partSize: dynamicPartSize,
      totalParts,
    };
  }

  /**
   * Generates presigned URLs for all parts of the file.
   */
  static async generatePresignedUrls(uploadId: string, fileKey: string, totalParts: number, bucketName?: string) {
    const urls = [];

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const command = new UploadPartCommand({
        Bucket: bucketName || env.B2_BUCKET_NAME,
        Key: fileKey,
        UploadId: uploadId,
        PartNumber: partNumber,
      });

      // Pillar 3: Lower expiration to 15 minutes (900 seconds)
      const signedUrl = await getSignedUrl(s3, command, {
        expiresIn: 900, 
      });

      urls.push({
        partNumber,
        url: signedUrl,
      });
    }

    return urls;
  }

  /**
   * Completes the multipart upload by stitching parts together on the cloud.
   */
  static async completeMultipartUpload(uploadId: string, fileKey: string, parts: CompletedPart[], bucketName?: string) {
    const command = new CompleteMultipartUploadCommand({
      Bucket: bucketName || env.B2_BUCKET_NAME,
      Key: fileKey,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.sort((a, b) => (a.PartNumber || 0) - (b.PartNumber || 0)),
      },
    });

    const response = await s3.send(command);
    
    return {
      location: response.Location,
    };
  }

  /**
   * Aborts an incomplete upload and purges the chunks.
   */
  static async abortMultipartUpload(uploadId: string, fileKey: string, bucketName?: string) {
    const command = new AbortMultipartUploadCommand({
      Bucket: bucketName || env.B2_BUCKET_NAME,
      Key: fileKey,
      UploadId: uploadId,
    });

    await s3.send(command);
  }

  /**
   * Generates a presigned URL to securely download a private file.
   */
  static async generateDownloadUrl(fileKey: string, bucketName?: string) {
    const command = new GetObjectCommand({
      Bucket: bucketName || env.B2_BUCKET_NAME,
      Key: fileKey,
    });

    // Pillar 3: Expiration set to 15 minutes for maximum security
    return await getSignedUrl(s3, command, { expiresIn: 900 });
  }

  /**
   * Permanently deletes a file from the S3 bucket.
   */
  static async deleteFile(fileKey: string, bucketName?: string) {
    const command = new DeleteObjectCommand({
      Bucket: bucketName || env.B2_BUCKET_NAME,
      Key: fileKey,
    });

    await s3.send(command);
  }

  /**
   * Fetches already uploaded parts for an active multipart session.
   */
  static async getUploadedParts(uploadId: string, fileKey: string, bucketName?: string) {
    const command = new ListPartsCommand({
      Bucket: bucketName || env.B2_BUCKET_NAME,
      Key: fileKey,
      UploadId: uploadId,
    });

    const response = await s3.send(command);
    return response.Parts || [];
  }

  /**
   * Generates presigned URLs for specific missing parts of the file.
   */
  static async generateSpecificPresignedUrls(uploadId: string, fileKey: string, partNumbers: number[], bucketName?: string) {
    const urls = [];

    for (const partNumber of partNumbers) {
      const command = new UploadPartCommand({
        Bucket: bucketName || env.B2_BUCKET_NAME,
        Key: fileKey,
        UploadId: uploadId,
        PartNumber: partNumber,
      });

      const signedUrl = await getSignedUrl(s3, command, {
        expiresIn: 900,
      });

      urls.push({
        partNumber,
        url: signedUrl,
      });
    }

    return urls;
  }
}

