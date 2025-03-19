const Post = require('../models/Task');
const mongoose = require('mongoose');
const User =require('../models/userModel');
exports.getAssignedTasks = async (req, res) => {
    try {
        const { userId } = req.user;  // `userId` comes from the decoded JWT in `authenticateUser`

        const tasks = await Task.find({ 'assignedUsers.userId': userId }).select(
            'title description dueDate assignedUsers'
        );

        const userTasks = tasks.map((task) => {
            const userTask = task.assignedUsers.find(
                (assignment) => assignment.userId.toString() === userId
            );
            return {
                taskId: task._id,
                title: task.title,
                description: task.description,
                dueDate: task.dueDate,
                status: userTask.status,
                fileUrl: userTask.fileUrl || null,
            };
        });

        res.status(200).json({ success: true, tasks: userTasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.uploadPostImage = async (req, res) => {
    try {
        // ✅ Get the authenticated user's ID from middleware
        const userId = req.user._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: User ID not found in token.'
            });
        }

        // ✅ Check if a file was uploaded
        if (!req.file || !req.file.location) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded or upload failed.'
            });
        }

        const fileUrl = req.file.location; // ✅ Get S3 URL

        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            fileUrl, // ✅ Return S3 URL to be used in `createPost`
        });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.getTaskActivity = async (req, res) => {
    try {
        const { taskId } = req.params;

        // Find the task by its ID
        const task = await Task.findById(taskId).populate('assignedUsers.userId', 'firstName lastName');
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found.' });
        }

        // Extract the assigned users' activity details
        const activityDetails = task.assignedUsers.map(assignedUser => {
            const user = assignedUser.userId; // Populated user data
            return {
                name: `${user.firstName || 'Unknown'} ${user.lastName || ''}`.trim(),
                status: assignedUser.status,
                score: assignedUser.score,
            };
        });

        res.status(200).json({
            success: true,
            taskId: task._id,
            activityDetails,
        });
    } catch (error) {
        console.error('Error fetching task activity:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};


