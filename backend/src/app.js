import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import dns from "node:dns";

import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";
import logger from "./utils/logger.js";

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config(); // fallback to current working directory if present

// Ensure SRV DNS resolution works reliably across all Windows network adapters
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {
  console.warn("Could not set custom DNS servers:", e.message);
}

const app = express();
const server = createServer(app);

// Connect WebSocket with CORS and room management
connectToSocket(server);

app.set("port", process.env.PORT || 8000);

// Security Headers via Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// Step 6: CORS configured with a fixed allowlist from env (CLIENT_URLS, comma-separated).
// Never reflect the request origin or match arbitrary subdomains.
const parseClientUrls = () => {
  const envRaw = process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:3000";
  return envRaw
    .split(",")
    .map(u => u.trim().replace(/\/+$/, ""))
    .filter(Boolean);
};

const allowedOrigins = parseClientUrls();

const corsOriginHandler = (origin, callback) => {
  if (!origin) return callback(null, true); // Allow requests with no origin (e.g. mobile apps / curl / health checks)
  const normalized = origin.trim().replace(/\/+$/, "");
  if (allowedOrigins.includes(normalized)) {
    return callback(null, normalized); // Explicitly return the matched allowlisted origin
  }
  return callback(new Error("CORS policy violation: Origin not allowed"), false);
};

// Enable GZIP compression for all responses (reduces JSON payload size by ~70%)
app.use(compression());

app.use(cors({
  origin: corsOriginHandler,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(cookieParser());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// Structured Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start
    });
  });
  next();
});

app.get("/", (req, res) => {
  res.send("LiveLink API Service is Operational");
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    version: "2.5.0-profile-auth-guest-flow",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.use("/api/v1/users", userRoutes);

// Global error handling middleware (prevents stack trace leak in production)
app.use((err, req, res, next) => {
  logger.error({
    event: "unhandled_api_error",
    error: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack
  });
  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});

const start = async () => {
  try {
    const connectionDb = await mongoose.connect(process.env.MONGO_URI);

    logger.info({
      event: "mongodb_connected",
      host: connectionDb.connection.host,
      message: `MongoDB Connected: ${connectionDb.connection.host}`
    });

    server.listen(app.get("port"), () => {
      logger.info({
        event: "server_started",
        port: app.get("port"),
        message: `LiveLink Server Running on Port ${app.get("port")}`
      });
    });

  } catch (error) {
    logger.error({
      event: "mongodb_connection_failed",
      error: error.message
    });
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test" || process.env.RUN_SERVER === "true") {
  start();
}

export { app, server };
