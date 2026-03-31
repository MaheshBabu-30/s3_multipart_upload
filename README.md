# 🚀 Hono S3/B2 Multipart Upload API

A production-grade, high-performance, and secure backend system for managing large file uploads using the **Frontend-Led parallel architecture**.

## 🌟 Key Features
- **Frontend-Led Math**: Backend is agnostic to chunk sizes; Frontend decides the logic.
- **Parallel Optimization**: Presigned URLs are generated concurrently using `Promise.all`.
- **DoS Protection**: Strict Zod validation limiting uploads to 1,000 parts per request.
- **Direct-to-Cloud**: File binary data completely bypasses the server, uploading directly to Backblaze B2.
- **Secure Pathing**: UUID-based file paths to prevent collisions and path injection.
- **Auto-Migrations**: Database schema syncs automatically on Render deployment via Drizzle ORM.

## 🛠️ Tech Stack
- **Framework**: [Hono](https://hono.dev/)
- **Database**: [Aiven PostgreSQL](https://aiven.io/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Storage**: [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html)
- **Validation**: [Zod](https://zod.dev/)

## 🏗️ Architecture Flow
1. **Initialize**: `/start` returns a unique ID and cloud path.
2. **Presign**: `/urls` provides parallel `PUT` links for the chunks.
3. **Upload**: Browser `PUT`s binary data directly to B2 (Bypassing the server).
4. **Finalize**: `/complete` stitches the file and saves metadata to PostgreSQL.

## 🚀 Getting Started

### 1. Environment Variables
Create a `.env` file with the following:
```env
DATABASE_URL=your_postgres_url
B2_KEY_ID=your_key_id
B2_APP_KEY=your_app_key
B2_BUCKET_NAME=your_bucket
B2_ENDPOINT=your_endpoint
B2_REGION=your_region
PORT=3000
```

### 2. Installation
```bash
npm install
npm run db:generate
npm run db:migrate
```

### 3. Development
```bash
npm run dev
```

### 4. Testing
Run the side-by-side end-to-end test script:
```bash
npx tsx test-upload.ts
```

## ☁️ Deployment (Render)
- **Build Command**: `npm install && npm run build:render`
- **Start Command**: `npm start`
- **Env Vars**: Ensure all `.env` keys are added to Render control panel.

---
*Built with ❤️ for performance and security.*
