const Task = require('../models/Task');
const User = require('../models/userModel'); // Import the User model
const twilio = require('twilio');

exports.createTask = async (req, res) => {
    try {
        const { title, description, dueDate, phoneNumbers } = req.body;

        // Validate input
        if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Phone numbers are required to assign the task.'
            });
        }

        // Find users by phone numbers
        const users = await User.find({ phoneNumber: { $in: phoneNumbers }, role: "VOLUNTEER" });

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No users found with the provided phone numbers.'
            });
        }

        // Create the task
        const assignedUsers = users.map(user => ({
            userId: user._id,
            status: 'To Do'
        }));

        const task = new Task({
            title,
            description,
            dueDate,
            assignedUsers
        });
        await task.save();

        // Initialize Twilio client

        // Prepare task message
        const taskMessage = `New task assigned:\nTitle: ${task.title}\nDue: ${task.dueDate}\nDescription: ${task.description}`;

        // Update users in bulk to reduce multiple database writes
        await User.updateMany(
            { _id: { $in: users.map(user => user._id) } },
            {
                $inc: { taskCount: 1 },
                $push: { tasks: task._id },
                $set: { "taskStatus.To Do": 1 }
            }
        );

        res.status(201).json({
            success: true,
            task,
        });
    } catch (error) {
        console.error('Task creation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.getAllTasks = async (req, res) => {
    try {
        // Fetch all tasks and populate assignedUsers.userId
        const tasks = await Task.find().populate('assignedUsers.userId', 'phoneNumber firstName lastName');
        res.status(200).json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getTaskAssignments = async (req, res) => {
    try {
        const { taskId } = req.params;

        // Find the task and populate assigned users
        const task = await Task.findById(taskId).populate('assignedUsers.userId', 'phoneNumber firstName lastName');
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found.' });
        }

        // Format response
        const assignments = task.assignedUsers.map((assignment) => ({
            userId: assignment.userId._id,
            phoneNumber: assignment.userId.phoneNumber,
            name: `${assignment.userId.firstName} ${assignment.userId.lastName}`.trim(),
            status: assignment.status
        }));

        res.status(200).json({ success: true, taskId: task._id, assignments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteTask = async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found.' });
        }

        for (const assignment of task.assignedUsers) {
            const user = await User.findById(assignment.userId);
            if (user) {
                user.tasks = user.tasks.filter(id => id.toString() !== task._id.toString());
                user.taskCount = Math.max(user.taskCount - 1, 0);
                if (user.taskStatus.has(assignment.status)) {
                    user.taskStatus.set(assignment.status, Math.max(user.taskStatus.get(assignment.status) - 1, 0));
                }
                await user.save();
            }
        }

        // Delete the task
        await task.deleteOne();

        res.status(200).json({ success: true, message: 'Task deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getTaskActivityLog = async (req, res) => {
    try {
        const { taskId } = req.params;

        // Find the task by ID
        const task = await Task.findById(taskId).populate('assignedUsers.userId', 'firstName lastName phoneNumber');
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found.' });
        }

        // Extract the activity log from assignedUsers
        const activityLog = task.assignedUsers
            .map((assignment) => ({
                userId: assignment.userId._id,
                name: `${assignment.userId.firstName || ''} ${assignment.userId.lastName || ''}`.trim(),
                phoneNumber: assignment.userId.phoneNumber,
                status: assignment.status,
                score: assignment.score,
                uploads: assignment.uploads || [],
            }))
            .sort((a, b) => b.score - a.score); // Sort by score in descending order

        res.status(200).json({
            success: true,
            taskId: task._id,
            taskTitle: task.title,
            activityLog,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getUserTasks = async (req, res) => {
    const userId = req.user.id;
    console.log("Called getUserTasks for user:", userId);

    try {
        const user = await User.findById(userId).populate({
            path: 'tasks',
            select: 'title description dueDate assignedUsers'
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const tasks = user.tasks.map(task => {
            // Find the assigned user entry for the current user
            const assignedUser = task.assignedUsers.find(user => user.userId.toString() === userId);
            return {
                id: task._id,
                title: task.title,
                description: task.description,
                dueDate: task.dueDate,
                status: assignedUser ? assignedUser.status : 'To Do'
            };
        });

        return res.status(200).json({ success: true, tasks });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};