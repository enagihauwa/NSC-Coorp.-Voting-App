let ioInstance = null;

const initSocket = (server) => {
  const { Server } = require('socket.io');
  const jwt = require('jsonwebtoken');
  const { query } = require('../config/database');

  const corsOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL].filter(Boolean)
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

  ioInstance = new Server(server, {
    cors: {
      origin: corsOrigins.length ? corsOrigins : true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
  });

  ioInstance.on('connection', (socket) => {
    socket.on('join', (room) => {
      if (room === 'public-results') {
        socket.join('public-results');
      }
    });
  });

  const adminNsp = ioInstance.of('/admin');
  adminNsp.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await query('SELECT id, username, role FROM admin_users WHERE id = $1', [decoded.id]);
      if (result.rows.length === 0) {
        return next(new Error('Invalid token'));
      }
      socket.admin = result.rows[0];
      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  adminNsp.on('connection', (socket) => {
    socket.join('admin');
    socket.on('join', (room) => {
      if (room === 'admin') socket.join('admin');
    });
  });

  return ioInstance;
};

const getIO = () => ioInstance;

const emitToAdmin = (event, payload) => {
  if (!ioInstance) return;
  ioInstance.of('/admin').to('admin').emit(event, payload);
};

const emitToPublicResults = (event, payload) => {
  if (!ioInstance) return;
  ioInstance.to('public-results').emit(event, payload);
};

module.exports = { initSocket, getIO, emitToAdmin, emitToPublicResults };
