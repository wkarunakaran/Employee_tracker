// ===============================
// 🌐 ProEduvate Employee Tracker
// ===============================

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import multer from "multer";
import session from "express-session";
import MongoStore from "connect-mongo";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import EmployeeProgress from "./models/EmployeeProgress.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// 📁 Path Configuration
// ===============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===============================
// 🧠 Middleware Setup
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  })
);

// ===============================
// 🛡️ Session Middleware (with MongoStore)
// ===============================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "proeduvate-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 14 * 24 * 60 * 60, // 14 days
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// ===============================
// ⚙️ MongoDB Connection
// ===============================
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ===============================
// 📦 File Upload Configuration
// ===============================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ===============================
// 📄 Static File Serving
// ===============================
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===============================
// 👨‍💻 Admin Authentication Routes
// ===============================
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.LOGIN_USERNAME &&
    password === process.env.LOGIN_PASSWORD
  ) {
    req.session.isAuthenticated = true;
    return res.json({ success: true });
  } else {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get("/admin/data", async (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const submissions = await EmployeeProgress.find().sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    console.error("⚠️ Error fetching data:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// 🧾 Intern Submission Route
// ===============================
app.post("/api/submit-progress", upload.array("fileAttachments", 5), async (req, res) => {
  try {
    const {
      internName,
      internEmail,
      internId,
      internDomain,
      techLeadName,
      assignedTask,
      workStatus,
    } = req.body;

    const fileData = req.files.map((file) => ({
      originalName: file.originalname,
      filePath: `/uploads/${file.filename}`,
    }));

    const newProgress = new EmployeeProgress({
      internName,
      internEmail,
      internId,
      internDomain,
      techLeadName,
      assignedTask,
      workStatus,
      fileAttachments: fileData,
      submissionTimestamp: new Date(),
    });

    await newProgress.save();
    res.status(200).json({ success: true, message: "Submission successful!" });
  } catch (error) {
    console.error("❌ Error saving submission:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ===============================
// 🏠 Default Routes
// ===============================
app.get("/admin", (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect("/admin-login.html");
  }
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/admin-login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
// 🚀 Start Server (Render fix → bind to 0.0.0.0)
// ===============================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
