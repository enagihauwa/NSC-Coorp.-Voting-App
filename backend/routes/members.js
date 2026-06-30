const express = require('express');
const router = express.Router();
const { getAll, getByStaffNumber, importMembers, getStats } = require('../controllers/memberController');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/stats', auth, getStats);
router.post('/import', auth, upload.single('file'), importMembers);
router.get('/', auth, getAll);
router.get('/:staffNumber', getByStaffNumber);

module.exports = router;
