require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const session = require('express-session');
const EmployeeProgress = require('./models/EmployeeProgress');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Allow CORS for frontend on same domain (Render)
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'proeduvate-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// ✅ Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ✅ Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|zip|rar|txt/;
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype);
  if (mimetype && extname) cb(null, true);
  else cb(new Error('Invalid file type.'));
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
    files: parseInt(process.env.MAX_FILES) || 10,
  },
  fileFilter,
});

// ✅ MongoDB connection
const mongoUri =
  process.env.MONGODB_URI ||
  `mongodb+srv://${process.env.USERNAME}:${encodeURIComponent(process.env.PASSWORD)}@${
    process.env.CLUSTERNAME
  }.${process.env.PROVIDER || 'mongodb.net'}/Proeduvate?retryWrites=true&w=majority`;

mongoose
  .connect(mongoUri)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ✅ Admin Credentials
const ADMIN_USERNAME = process.env.LOGIN_USERNAME || 'Login@proEduvate';
const ADMIN_PASSWORD = process.env.LOGIN_PASSWORD || 'Pass@proEduvate';

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin-login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-login.html')));

// Admin Authentication
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAuthenticated = true;
    req.session.adminUser = username;
    return res.json({ success: true, message: 'Login successful' });
  }
  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ success: false, message: 'Logout failed' });
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/api/admin/auth-status', (req, res) => {
  if (req.session?.isAuthenticated)
    return res.json({ success: true, authenticated: true, user: req.session.adminUser });
  res.json({ success: true, authenticated: false });
});

app.get('/admin', (req, res) => {
  if (req.session?.isAuthenticated)
    return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  res.redirect('/admin-login');
});

// ✅ Submit Employee Progress
app.post('/api/employee-progress', upload.array('fileAttachment', 10), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1)
      return res.status(503).json({ success: false, message: 'Database not connected.' });

    const {
      internName,
      internEmail,
      internId,
      internDomain,
      date,
      techLeadName,
      assignedTask,
      workStatus,
      learnedToday,
      workDescription,
      challengesFaced,
      supportRequired,
      formSubmissionTime,
    } = req.body;

    if (!internName || !internEmail || !internId || !internDomain || !date || !techLeadName || !assignedTask || !workStatus)
      return res.status(400).json({ success: false, message: 'All required fields must be filled.' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(internEmail))
      return res.status(400).json({ success: false, message: 'Invalid email address.' });

    const fileAttachments =
      req.files?.map((f) => ({
        originalName: f.originalname,
        fileName: f.filename,
        filePath: f.path,
        fileSize: f.size,
        mimeType: f.mimetype,
      })) || [];

    const entry = new EmployeeProgress({
      internName,
      internEmail,
      internId,
      internDomain,
      date: new Date(date),
      techLeadName,
      assignedTask,
      workStatus,
      learnedToday,
      workDescription,
      challengesFaced,
      supportRequired,
      fileAttachments,
      formSubmissionTime: formSubmissionTime ? new Date(formSubmissionTime) : new Date(),
    });

    await entry.save();
    res.status(201).json({ success: true, message: 'Progress submitted successfully.' });
  } catch (error) {
    console.error('❌ Error submitting progress:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ✅ Error Handling
app.use((err, req, res, next) => {
  console.error('⚠️ Error:', err.message);
  res.status(500).json({ success: false, message: 'Server error occurred.' });
});

// ✅ Catch-all (for frontend routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
