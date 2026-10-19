import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dns from "node:dns";

import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";

dotenv.config();

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

// CORS configured to client origin with credentials support
const clientOrigin = process.env.CLIENT_URL || "http://localhost:3000";
app.use(cors({
  origin: clientOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(cookieParser());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.get("/", (req, res) => {
  res.send("LiveLink API Service is Operational");
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.use("/api/v1/users", userRoutes);

const start = async () => {
  try {
    const connectionDb = await mongoose.connect(process.env.MONGO_URI);

    console.log(
      `✅ MongoDB Connected: ${connectionDb.connection.host}`
    );

    server.listen(app.get("port"), () => {
      console.log(`🚀 LiveLink Server Running on Port ${app.get("port")}`);
    });

  } catch (error) {
    console.error("❌ MongoDB Connection Failed");
    console.error(error.message);
    process.exit(1);
  }
};

start();