const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', candidateController.getAll);
router.get('/:id', candidateController.getById);
router.post('/', auth, upload.single('photo'), candidateController.create);
router.put('/:id', auth, upload.single('photo'), candidateController.update);
router.delete('/:id', auth, candidateController.delete);
router.patch('/:id/status', auth, candidateController.toggleStatus);

module.exports = router;
