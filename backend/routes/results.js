const express = require('express');
const router = express.Router();
const { getResults, getLocationResults, getSummary } = require('../controllers/resultController');

router.get('/', getResults);
router.get('/location', getLocationResults);
router.get('/summary', getSummary);

module.exports = router;
