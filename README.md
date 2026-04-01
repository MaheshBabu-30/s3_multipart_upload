# 🚀 Hono S3/B2 Multipart Upload API

A production‑grade, high‑performance, and secure backend for managing large file uploads using a **frontend‑led parallel architecture**. The service generates presigned URLs so the browser uploads directly to Backblaze B2, bypassing the server entirely.

---

## 📚 Table of Contents
1. [Key Features](#-key-features)
2. [Tech Stack](#-tech-stack)
3. [Architecture Overview](#-architecture-overview)
4. [Prerequisites](#-prerequisites)
5. [Installation & Setup](#-installation--setup)
6. [Running Locally](#-running-locally)
7. [API Reference](#-api-reference)
8. [Database Schema](#-database-schema)
9. [Testing](#-testing)
10. [Deployment (Render)](#-deployment-render)
11. [CORS Configuration](#-cors-configuration)
12. [Contribution Guide](#-contribution-guide)
13. [FAQ & Troubleshooting](#-faq--troubleshooting)
14. [License](#-license)

---

## 🌟 Key Features
- **Frontend‑Led Math** – Backend is agnostic to chunk sizes; the client decides the number of parts.
- **Parallel Presigned URL Generation** – `Promise.all` creates hundreds of URLs in milliseconds.
- **DoS Protection** – Zod validation caps uploads at **1,000 parts** per request.
- **Direct‑to‑Cloud Uploads** – Files never touch the server, reducing load and cost.
- **Secure UUID‑Based Paths** – Prevents collisions and path‑injection attacks.
- **Automatic DB Migrations** – Drizzle ORM runs migrations on Render deployments.
- **Full TypeScript typings** – Strict compile‑time safety.

---

## 🛠️ Tech Stack
- **Framework**: [Hono](https://hono.dev/)
- **Database**: Aiven PostgreSQL
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Storage**: Backblaze B2 (S3‑compatible API)
- **Validation**: Zod
- **Testing**: End‑to‑end script (`test‑upload.ts`)
- **Deployment**: Render (auto‑migration on push)

---

## 🏗️ Architecture Overview
```mermaid
flowchart TD
    A[Frontend] -->|POST /start| B[Hono Server]
    B -->|POST /urls| C[Generate Presigned URLs]
    C -->|PUT (direct to B2)| D[Backblaze B2]
    D -->|PUT completed| B
    B -->|POST /complete| E[Complete Multipart Upload]
    E -->|INSERT metadata| F[PostgreSQL]
    B -->|POST /resume| G[Resume Upload]
    B -->|DELETE /:id| H[Delete Record + B2 Object]
```
- The client starts a multipart session, receives an `uploadId` and `fileKey`.
- It then requests presigned URLs for each part.
- Each chunk is uploaded **directly** to B2.
- Finally the client tells the server to complete the upload, which stitches the parts and stores metadata.

---

## 📦 Prerequisites
| Tool | Version |
|------|---------|
| Node | >=18 |
| npm | >=9 |
| PostgreSQL (Aiven) | any recent version |
| Backblaze B2 bucket | with CORS allowing `PUT`, `GET`, `HEAD`, and exposing `ETag` |

---

## 📦 Installation & Setup
```bash
# Clone the repo
git clone https://github.com/MaheshBabu-30/s3_multipart_upload.git
cd s3_multipart_upload/hono_multipart

# Install dependencies
npm install

# Create .env (see below)
cp .env.example .env
```
### .env example
```env
DATABASE_URL=postgres://user:pass@host:port/dbname?sslmode=require
B2_KEY_ID=your_backblaze_key_id
B2_APP_KEY=your_backblaze_app_key
B2_BUCKET_NAME=mahesh-backend-storage
B2_ENDPOINT=https://s3.us-east-005.backblazeb2.com
B2_REGION=us-east-005
PORT=3000
```

---

## ▶️ Running Locally
```bash
# Generate & apply DB migrations
npm run db:generate
npm run db:migrate

# Start the dev server (auto‑reload)
npm run dev
```
The API will be available at `http://localhost:3000`.

---

## 📡 API Reference
| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| **POST** | `/multipart/start` | Initialise a multipart upload. Returns `uploadId` and `fileKey`. | `{ fileName, contentType, type }` | `{ uploadId, fileKey }` |
| **POST** | `/multipart/urls` | Generate presigned URLs for each part. | `{ uploadId, fileKey, partsCount }` | `{ parts: [{ partNumber, url }] }` |
| **POST** | `/multipart/complete` | Complete the upload, assemble parts, store metadata. | `{ uploadId, fileKey, fileName, fileSize, contentType, type, parts: [{ PartNumber, ETag }] }` | `{ file }` |
| **POST** | `/multipart/resume` | Get missing parts for a partially uploaded file. | `{ uploadId, fileKey, partsCount }` | `{ uploadedParts, missingParts }` |
| **GET** | `/multipart/:id/download` | Retrieve a presigned GET URL for the completed file. | – | `{ url }` |
| **DELETE** | `/multipart/:id` | Delete the file record and the object from B2. | – | `{ success: true }` |

> **Note**: All routes are protected by CORS middleware that now allows `GET`, `POST`, `PUT`, `DELETE`, and `OPTIONS`.

---

## 🗂️ Database Schema
```ts
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  mimeType: text("mime_type").notNull(),
  type: text("type").notNull(),
  path: text("path").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```
- `id` – auto‑increment primary key.
- `name` – original filename.
- `size` – file size in bytes.
- `mimeType` – e.g., `video/mp4`.
- `type` – logical category (video, image, document).
- `path` – unique S3 key (UUID).
- `createdAt` / `updatedAt` – timestamps.

---

## 🧪 Testing
```bash
# End‑to‑end test (runs against the locally running server)
npx tsx test-upload.ts
```
The script:
1. Starts a multipart session.
2. Requests presigned URLs.
3. Uploads dummy chunks directly to B2.
4. Completes the upload.
5. Verifies download URL.
6. Deletes the file.

---

## ☁️ Deployment (Render)
1. **Connect** the GitHub repo to Render.
2. **Build Command**: `npm install && npm run build:render`
3. **Start Command**: `npm start`
4. **Environment Variables** – add the same keys from `.env` in the Render dashboard.
5. Render will automatically run `npm run db:migrate` on each deploy (see `package.json` scripts).

---

## 🔐 CORS Configuration
The server uses Hono’s built‑in CORS middleware:
```ts
app.use(
  "/multipart/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);
```
- In production replace `origin: "*"` with your actual frontend URL.
- The Backblaze bucket must expose the `ETag` header (see `fix-cors.ts`).

---

## 🤝 Contribution Guide
1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/awesome-feature`).
3. Install dependencies and run tests.
4. Ensure TypeScript compiles (`npm run build`).
5. Open a Pull Request with a clear description.
6. Follow the existing code style (ESLint, Prettier).

---

## ❓ FAQ & Troubleshooting
**Q:** *Why does the Delete button give a CORS error?*  
**A:** The CORS middleware previously allowed only `GET`, `POST`, and `OPTIONS`. It now includes `DELETE` and `PUT`.

**Q:** *My uploads are failing with “SignatureDoesNotMatch”.*  
**A:** Verify that the bucket’s CORS rules expose `ETag` and that the system clock on your machine is in sync (AWS‑style signatures are time‑sensitive).

**Q:** *How do I clean the database?*  
**A:** Run `node nuke-db.ts` (provided for local development only).

---

## 📄 License
MIT © 2026 Mahesh Babu

---

*Built with ❤️ for performance, security, and developer experience.*
