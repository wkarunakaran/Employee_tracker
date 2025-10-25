// ================================
// ProEduvate Employee Tracker Server
// ================================

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import session from "express-session";
import MongoStore from "connect-mongo";
import path from "path";
import multer from "multer";
import cors from "cors";
import { fileURLToPath } from "url";
import EmployeeProgress from "./models/EmployeeProgress.js";

// ----------------------------
// 1️⃣ Setup & Config
// ----------------------------
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Required for ES module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------
// 2️⃣ Middleware
// ----------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Session setup with connect-mongo (Render compatible)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 14 * 24 * 60 * 60 // 14 days
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      httpOnly: true
    }
  })
);

// ----------------------------
// 3️⃣ Database Connection
// ----------------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Failed:", err));

// ----------------------------
// 4️⃣ Multer Setup for File Uploads
// ----------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// ----------------------------
// 5️⃣ Routes
// ----------------------------

// Root (for testing)
app.get("/", (req, res) => {
  res.send("ProEduvate Employee Tracker API is Running ✅");
});

// Employee Progress Submission
app.post("/submit", upload.single("file"), async (req, res) => {
  try {
    const { name, email, task, date } = req.body;
    const newProgress = new EmployeeProgress({
      name,
      email,
      task,
      date,
      file: req.file ? req.file.filename : null
    });
    await newProgress.save();
    res.status(201).json({ message: "✅ Submission Successful!" });
  } catch (error) {
    console.error("Submission Error:", error);
    res.status(500).json({ message: "❌ Submission Failed" });
  }
});

// Admin Login
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  const ADMIN_USER = process.env.ADMIN_USER || "admin";
  const ADMIN_PASS = process.env.ADMIN_PASS || "12345";

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// Admin Fetch All Submissions
app.get("/admin/data", async (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  try {
    const data = await EmployeeProgress.find().sort({ date: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching data" });
  }
});

// ----------------------------
// 6️⃣ Serve Frontend (Render compatible)
// ----------------------------
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ----------------------------
// 7️⃣ Start Server
// ----------------------------
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT} (Environment: ${process.env.NODE_ENV})`)
);
