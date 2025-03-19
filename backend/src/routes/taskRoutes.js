const express = require('express');
const { 
    createPost, 
    getUserPosts, 
    deletePost 
} = require('../controllers/taskController'); // ✅ Updated to Post Controller

const { authenticateUser } = require('../middlewares/authMiddleware');

const router = express.Router();

// ✅ Create a new post (title, content, meeting location, meeting date, upload image)
router.post('/create', authenticateUser, createPost);

// ✅ Fetch all posts of the authenticated user (Used in Profile Page)
router.get('/', authenticateUser, getUserPosts);

// ✅ Delete a post (Only the owner can delete their own post)
router.delete('/:postId', authenticateUser, deletePost);

module.exports = router;