import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./env.js";
import multipartRoutes from "./routes/multipart.routes.js";

const app = new Hono();

// Global Middlewares
app.use("*", logger()); // Built-in request logger

// Enable CORS for all routes so frontend browsers can interact without restriction.
// NOTE: For a production environment, restrict the `origin` to your specific frontend URL!
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

// Health check route just in case
app.get("/", (c) => c.json({ status: "healthy", service: "hono_multipart" }));

// Register our modularized multipart API routes
app.route("/multipart", multipartRoutes);

// Global Error Handler
app.onError((err, c) => {
  console.error(`[Global Error Handler]:`, err);
  return c.json({ error: "Internal Server Error" }, 500);
});

// Start Server
const port = parseInt(env.PORT, 10);
console.log(`🚀 Server starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});