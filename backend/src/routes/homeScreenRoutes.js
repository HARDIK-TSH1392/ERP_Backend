const express = require('express');
const { getFeeds } = require('../controllers/homeScreenController');
const { authenticateUser } = require('../middlewares/authMiddleware');


const router = express.Router();

// Route to fetch recent uploads in a specific location
// router.get('/recent-uploads', getRecentUploads);
router.get('/feeds', authenticateUser, getFeeds);
module.exports = router;
