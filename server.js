require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // ✅ Persistent session storage
const EmployeeProgress = require('./models/EmployeeProgress');

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// ✅ MIDDLEWARE SETUP
// =========================
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'https://employee-tracker-vgqx.onrender.com', // ✅ your Render domain
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// =========================
// ✅ MongoDB Connection
// =========================
const mongoUri =
  process.env.MONGODB_URI ||
  `mongodb+srv://${process.env.USERNAME}:${encodeURIComponent(process.env.PASSWORD)}@${
    process.env.CLUSTERNAME
  }.${process.env.PROVIDER || 'mongodb.net'}/Proeduvate?retryWrites=true&w=majority`;

mongoose
  .connect(mongoUri)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// =========================
// ✅ Session Configuration (persistent in MongoDB)
// =========================
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'proeduvate-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
      collectionName: 'sessions',
    }),
    cookie: {
      secure: false, // ⚠️ true only if using HTTPS + custom domain
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// =========================
// ✅ Static Files
// =========================
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =========================
// ✅ Multer File Upload Config
// =========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
    files: parseInt(process.env.MAX_FILES) || 10,
  },
});

// =========================
// ✅ Admin Credentials
// =========================
const ADMIN_USERNAME = process.env.LOGIN_USERNAME || 'Login@proEduvate';
const ADMIN_PASSWORD = process.env.LOGIN_PASSWORD || 'Pass@proEduvate';

// =========================
// ✅ ROUTES
// =========================

// 🔹 Home
app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

// 🔹 Admin Login Page
app.get('/admin-login', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'))
);

// 🔹 Admin Login API
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAuthenticated = true;
    req.session.adminUser = username;
    console.log(`✅ Admin logged in: ${username}`);
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// 🔹 Admin Logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// 🔹 Admin Auth Check
app.get('/api/admin/auth-status', (req, res) => {
  if (req.session.isAuthenticated) {
    return res.json({ authenticated: true });
  }
  res.json({ authenticated: false });
});

// 🔹 Admin Panel
app.get('/admin', (req, res) => {
  if (req.session.isAuthenticated)
    return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  res.redirect('/admin-login');
});

// =========================
// ✅ Employee Progress APIs
// =========================
app.post('/api/employee-progress', upload.array('fileAttachment', 10), async (req, res) => {
  try {
    const entry = new EmployeeProgress({
      ...req.body,
      fileAttachments:
        req.files?.map((f) => ({
          originalName: f.originalname,
          fileName: f.filename,
          filePath: `/uploads/${f.filename}`,
          fileSize: f.size,
          mimeType: f.mimetype,
        })) || [],
      formSubmissionTime: new Date(),
    });

    await entry.save();
    res.status(201).json({ success: true, message: 'Progress submitted successfully.' });
  } catch (error) {
    console.error('❌ Error submitting progress:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

app.get('/api/employee-progress', async (req, res) => {
  try {
    const data = await EmployeeProgress.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    console.error('❌ Fetch Error:', error);
    res.status(500).json({ success: false });
  }
});

app.delete('/api/employee-progress/:id', async (req, res) => {
  try {
    await EmployeeProgress.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Delete Error:', error);
    res.status(500).json({ success: false });
  }
});

// =========================
// ✅ Catch-All Fallback
// =========================
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

// =========================
// ✅ Start Server
// =========================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
