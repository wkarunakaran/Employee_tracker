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
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Middleware
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [BASE_URL.replace(/\/$/, '')],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'proeduvate-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|zip|rar|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, documents, and archives are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
    files: parseInt(process.env.MAX_FILES) || 10
  },
  fileFilter: fileFilter
});

// MongoDB connection
let mongoUri;
if (process.env.MONGODB_URI) {
  mongoUri = process.env.MONGODB_URI;
} else if (process.env.CLUSTERNAME && process.env.USERNAME && process.env.PASSWORD) {
  const clusterName = process.env.CLUSTERNAME;
  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;
  const provider = process.env.PROVIDER || 'mongodb.net';
  mongoUri = `mongodb+srv://${username}:${password}@${clusterName}.${provider}/Proeduvate?retryWrites=true&w=majority`;
} else {
  mongoUri = 'mongodb://localhost:27017/Proeduvate';
}

mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

const ADMIN_USERNAME = process.env.LOGIN_USERNAME || 'Login@proEduvate';
const ADMIN_PASSWORD = process.env.LOGIN_PASSWORD || 'Pass@proEduvate';

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAuthenticated = true;
    req.session.adminUser = username;
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Auth check
app.get('/api/admin/auth-status', (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    res.json({ success: true, authenticated: true, user: req.session.adminUser });
  } else {
    res.json({ success: true, authenticated: false });
  }
});

// Protected admin
app.get('/admin', (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  } else {
    res.redirect('/admin-login');
  }
});

app.get('/api/config', (req, res) => {
  res.json({ BASE_URL: BASE_URL });
});

const checkConnection = () => mongoose.connection.readyState === 1;

const requireAuth = (req, res, next) => {
  if (req.session && req.session.isAuthenticated) return next();
  return res.status(401).json({ success: false, message: 'Authentication required' });
};

// Submit employee progress
app.post('/api/employee-progress', upload.array('fileAttachment', 10), async (req, res) => {
  try {
    if (!checkConnection()) {
      return res.status(503).json({ success: false, message: 'Database not connected.' });
    }

    const {
      internName, internEmail, internId, internDomain, date,
      techLeadName, assignedTask, workStatus, learnedToday,
      workDescription, challengesFaced, supportRequired, formSubmissionTime
    } = req.body;

    if (!internName || !internEmail || !internId || !internDomain || !date || !techLeadName || !assignedTask || !workStatus) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(internEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

    let fileAttachments = [];
    if (req.files && req.files.length > 0) {
      fileAttachments = req.files.map(file => ({
        originalName: file.originalname,
        fileName: file.filename,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype
      }));
    }

    const progressEntry = new EmployeeProgress({
      internName, internEmail, internId, internDomain,
      date: new Date(date), techLeadName, assignedTask,
      workStatus, learnedToday, workDescription, challengesFaced,
      supportRequired, fileAttachments,
      formSubmissionTime: formSubmissionTime ? new Date(formSubmissionTime) : new Date()
    });

    await progressEntry.save();
    res.status(201).json({ success: true, message: 'Progress submitted successfully.' });

  } catch (error) {
    console.error('Error submitting progress:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Error Handling
app.use((error, req, res, next) => {
  console.error('Error:', error.message);
  res.status(500).json({ success: false, message: 'Server error occurred.' });
});

// 404 Fallback
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ✅ Always start server (for Render/Vercel)
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
});

// ✅ Export for Vercel compatibility
module.exports = app;
