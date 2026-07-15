require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const { pool } = require('./config/database');
const routes = require('./routes/index');
const { initSocket } = require('./socket/index');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const uploadPath = process.env.UPLOAD_PATH || 'uploads';
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach(url => {
    const trimmed = url.trim();
    if (trimmed) {
      allowedOrigins.push(trimmed);
      // Support matching with and without trailing slashes
      if (trimmed.endsWith('/')) {
        allowedOrigins.push(trimmed.slice(0, -1));
      } else {
        allowedOrigins.push(trimmed + '/');
      }
    }
  });
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
                      (origin.endsWith('/') ? allowedOrigins.includes(origin.slice(0, -1)) : allowedOrigins.includes(origin + '/'));
                      
    if (isAllowed || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};


app.use(cors(corsOptions));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(`/${uploadPath}`, express.static(path.join(__dirname, uploadPath)));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);

app.use(routes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found.`,
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 5MB.',
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request body too large.',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error.',
  });
});

async function initializeDatabase() {
  try {
    const fs = require('fs');
    const sqlPath = path.join(__dirname, 'migrations', 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    await pool.query(sql);
    console.log('Database tables initialized.');
  } catch (error) {
    console.warn('Warning: Database initialization failed:', error.message);
    console.warn('The server will start but database-dependent endpoints will not work.');
    console.warn('Please ensure PostgreSQL is running and update .env if needed.');
  }
}

async function startServer() {
  await initializeDatabase();
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`NSC Voting API server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();

module.exports = { app, server };
