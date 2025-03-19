const express = require('express');
const { updateProgress } = require('../controllers/progressController');

const router = express.Router();

router.post('/update', updateProgress); // Update Progress

module.exports = router;
