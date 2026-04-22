require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const externalJobRoutes = require("./routes/externalJobRoutes"); // ← moved here
const cloudDriveRoutes = require("./routes/cloudDriveRoutes");
const referralRoutes = require("./routes/referralRoutes");
const resumeBuilderRoutes = require("./routes/resumeBuilderRoutes");
const dailySessionRoutes = require("./routes/dailySessionRoutes");
const joinSessionRoutes = require("./routes/joinSessionRoutes");

const app = express();

app.set("trust proxy", 1);

function parseAllowedOrigins() {
  const raw =
    process.env.FRONTEND_ORIGINS ||
    process.env.FRONTEND_ORIGIN ||
    "http://localhost:5173";
  const configuredOrigins = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const expandedOrigins = configuredOrigins.flatMap((origin) => {
    try {
      const url = new URL(origin);
      const isLocalHost =
        url.hostname === "localhost" || url.hostname === "127.0.0.1";
      if (!isLocalHost) return [origin];

      const hostVariants =
        url.hostname === "localhost"
          ? ["localhost", "127.0.0.1"]
          : ["127.0.0.1", "localhost"];
      const protocolVariants = ["http:", "https:"];
      const port = url.port ? `:${url.port}` : "";

      return protocolVariants.flatMap((protocol) =>
        hostVariants.map((hostname) => `${protocol}//${hostname}${port}`),
      );
    } catch {
      return [origin];
    }
  });

  return [...new Set(expandedOrigins)];
}

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/external-jobs", externalJobRoutes); // ← moved here
app.use("/api/cloud-drive", cloudDriveRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/resume-builder", resumeBuilderRoutes);
app.use("/api/daily-sessions", dailySessionRoutes);
app.use("/api/join-session", joinSessionRoutes);

app.use(errorHandler);

module.exports = app;
