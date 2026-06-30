const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const memberRoutes = require('./members');
const candidateRoutes = require('./candidates');
const voteRoutes = require('./votes');
const resultRoutes = require('./results');
const dashboardRoutes = require('./dashboard');
const settingsRoutes = require('./settings');

router.use('/api/auth', authRoutes);
router.use('/api/members', memberRoutes);
router.use('/api/candidates', candidateRoutes);
router.use('/api/votes', voteRoutes);
router.use('/api/results', resultRoutes);
router.use('/api/dashboard', dashboardRoutes);
router.use('/api/settings', settingsRoutes);

module.exports = router;
