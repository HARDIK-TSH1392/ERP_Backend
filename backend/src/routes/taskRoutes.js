const express = require('express');
const { createTask, getAllTasks, getTaskAssignments, deleteTask, getTaskActivityLog, getUserTasks } = require('../controllers/taskController');
const { authenticateUser } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/create', createTask); // Tested
router.get('/', authenticateUser, getAllTasks); // Tested
router.get('/user/tasks', authenticateUser, getUserTasks); // Tested
router.get('/:taskId/assignments', getTaskAssignments); // This route should return list of assignments for particular task
router.delete('/:taskId', deleteTask);
router.get('/tasks/:taskId/activity-log', getTaskActivityLog); // Tested
// Add the new route for fetching tasks by userId

module.exports = router;