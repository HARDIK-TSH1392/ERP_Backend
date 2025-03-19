const Task = require('../models/Task');
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

exports.completeTask = async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded.' });
        }

        const { taskId } = req.params;
        const fileUrl = req.file.location;
        const userId = req.user.id;

        console.log('User ID:', userId); // Debug log

        // Fetch task
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found.' });
        }

        // Debugging: Log the assignedUsers field
        console.log('Assigned Users:', task.assignedUsers);

        // Find the user's assignment in the task
        const userTask = task.assignedUsers.find(
            (assignment) => assignment.userId.toString() === new mongoose.Types.ObjectId(userId).toString()
        );

        if (!userTask) {
            return res.status(404).json({ success: false, error: 'User is not assigned to this task.' });
        }

        // Fetch the user's details from the User model
        const user = await User.findById(userId).select('state ac_name pc_name');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        console.log("User details:", user);

        // Initialize uploads array if it doesn't exist
        if (!userTask.uploads) {
            userTask.uploads = [];
        }

        // Add the new upload with user's state, ac_name, and pc_name
        const newUpload = {
            fileUrl,
            uploadedAt: new Date(),
            state: user.state || null,
            ac_name: user.ac_name || null,
            pc_name: user.pc_name || null,
        };

        if (task.multipleUploads) {
            userTask.uploads.push(newUpload);
        } else {
            userTask.uploads = [newUpload];
        }

        // Recalculate the score based on all uploads
        const dueDate = task.dueDate || new Date();
        let totalScore = 0;

        userTask.uploads.forEach(upload => {
            const timeDifferenceInHours = Math.abs((upload.uploadedAt - dueDate) / (1000 * 60 * 60));
            totalScore += Math.round(timeDifferenceInHours);
        });

        userTask.score = totalScore;
        userTask.status = 'Done';
        userTask.completedAt = new Date();

        // Mark the task as modified to ensure mongoose updates the array
        task.markModified('assignedUsers');
        await task.save();

        // Update the User model's taskStatus
        if (user) {
            // Initialize taskStatus Map if it doesn't exist
            if (!user.taskStatus) {
                user.taskStatus = new Map();
            }

            const todoCount = user.taskStatus.get('To Do') || 0;
            const doneCount = user.taskStatus.get('Done') || 0;

            if (todoCount > 0) {
                user.taskStatus.set('To Do', todoCount - 1);
            }
            user.taskStatus.set('Done', doneCount + 1);

            // Mark the map as modified
            user.markModified('taskStatus');
            await user.save();
        }

        // Send response with additional fields
        res.status(200).json({
            success: true,
            message: 'Upload successful. Task updated.',
            taskId,
            fileUrl,
            score: totalScore,
            uploads: userTask.uploads,
            state: user.state || null,
            ac_name: user.ac_name || null,
            pc_name: user.pc_name || null,
        });
    } catch (error) {
        console.error('Error completing task:', error.message);
        res.status(500).json({ success: false, error: error.message });
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


