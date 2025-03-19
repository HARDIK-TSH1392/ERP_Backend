const express = require('express');
const { fetchUsers, fetchUserCount, fetchActiveTasks, fetchPendingTasks, taskStatus, loginAdmin, registerAdmin, fetchCompletedTasks } = require('../controllers/adminController');



const router = express.Router();

// Fetch users based on Area
router.get('/fetch-users', fetchUsers);

// Fetch total number of users
router.get('/user-count', fetchUserCount);

// Fetch total active tasks
router.get('/active-tasks', fetchActiveTasks);

// Fetch total pending tasks
router.get('/pending-tasks', fetchPendingTasks);

// Change task status
router.put('/task/:taskId/status', taskStatus);

// Admin login
router.post('/admin-login', loginAdmin);

// Admin creation
router.post('/create-admin', registerAdmin);

router.get('/completed', fetchCompletedTasks);

module.exports = router;