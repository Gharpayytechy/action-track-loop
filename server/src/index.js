import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.js";
import employeesRoutes from "./routes/employees.js";
import attendanceRoutes from "./routes/attendance.js";
import tasksRoutes from "./routes/tasks.js";
import leavesRoutes from "./routes/leaves.js";
import kudosRoutes from "./routes/kudos.js";
import calendarRoutes from "./routes/calendar.js";
import notificationsRoutes from "./routes/notifications.js";
import oneOnOnesRoutes from "./routes/oneonones.js";
import recruitingRoutes from "./routes/recruiting.js";
import consoleRoutes from "./routes/console.js";

const app = express();

// --- security & middleware ---
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const origins = (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // mobile / curl / server-to-server
      if (origins.length === 0 || origins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

app.use(
  "/api/",
  rateLimit({
    windowMs: 60_000,
    max: 240, // 4 req/sec/ip avg burstable
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// --- health ---
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.get("/api/health", (_req, res) =>
  res.json({
    ok: true,
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    ts: Date.now(),
  }),
);

// --- routes ---
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/leaves", leavesRoutes);
app.use("/api/kudos", kudosRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/one-on-ones", oneOnOnesRoutes);
app.use("/api/recruiting", recruitingRoutes);
app.use("/api/console", consoleRoutes);

// --- error handler ---
app.use((err, _req, res, _next) => {
  console.error("[api] error:", err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal error" });
});

// --- boot ---
const PORT = Number(process.env.PORT || 4000);
const MONGO = process.env.MONGODB_URI;

if (!MONGO) {
  console.error("MONGODB_URI missing — set it in .env");
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET missing — set it in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO)
  .then(() => {
    console.log("[api] mongo connected");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[api] listening on :${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[api] mongo connection failed:", err.message);
    process.exit(1);
  });
