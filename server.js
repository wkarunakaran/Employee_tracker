// ===============================
// 🌐 ProEduvate Employee Tracker (Fixed Version)
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
// 📁 Path Config
// ===============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===============================
// 🧠 Middleware
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
// 🛡️ Session (Cross-Origin Safe)
// ===============================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "proeduvate-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 14 * 24 * 60 * 60,
    }),
    cookie: {
      secure: true,           // ✅ needed for Render/Vercel
      httpOnly: true,
      sameSite: "none",       // ✅ cross-site cookie fix
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// ===============================
// ⚙️ MongoDB
// ===============================
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ===============================
// 📦 Multer
// ===============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ===============================
// 📄 Static
// ===============================
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===============================
// 👨‍💻 Admin Auth
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
  req.session.destroy(() => res.json({ success: true }));
});

// ✅ NEW: Check if admin session is valid
app.get("/api/admin/check-session", (req, res) => {
  if (req.session.isAuthenticated) {
    return res.json({ loggedIn: true });
  } else {
    return res.status(401).json({ loggedIn: false });
  }
});

// ✅ FIXED: Changed endpoint to match frontend
app.get("/api/admin/data", async (req, res) => {
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
// 🧾 Intern Submission
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
// 🏠 Routes
// ===============================
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

app.get("/admin", (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect("/admin-login.html");
  }
  res.sendFile(path.join(__dirname, "public", "admin-dashboard.html"));
});

app.get("/admin-login", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "admin-login.html"))
);

// ===============================
// 🚀 Start
// ===============================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
