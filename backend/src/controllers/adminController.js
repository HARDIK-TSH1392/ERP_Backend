const Task = require('../models/Task');
const User = require('../models/userModel.js');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const err = require("multer/lib/multer-error");

exports.fetchUsers = async (req, res) => {
    try {
        const { state } = req.body; // Extract state filter from request body

        // Build query conditionally based on state filter
        const query = state ? { state } : {}; // If state is provided, filter users by state

        // Fetch users based on query
        const users = await User.find(query).select('firstName lastName phoneNumber');

        const userMap = {};
        users.forEach(user => {
            userMap[user.phoneNumber] = {
                fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                state: user.state || null
            };
        });

        res.status(200).json({ userMap });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.fetchUserCount = async (req, res) => {
    const state = req.body.state; // Extract state from request body

    try {
        let userCount;

        if (state) {
            userCount = await User.countDocuments({ state });
        } else {
            userCount = await User.countDocuments({});
        }

        res.status(200).json({ userCount });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.fetchActiveTasks = async (req, res) => {
    try {

        const activeTasks = await Task.find({ taskStatus: 'Active' });

        const activeTasksCount = activeTasks.length;

        res.status(200).json({ activeTasksCount, activeTasks });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.fetchPendingTasks = async (req, res) => {
    try {
        // Fetch tasks where at least one assigned user has status 'To Do'
        const pendingTasks = await Task.find({ 'assignedUsers.status': 'To Do' })
            .populate('assignedUsers.userId', 'firstName lastName phoneNumber');

        const response = [];
        const uniqueTaskIds = new Set(); // To track unique task IDs

        pendingTasks.forEach(task => {
            let isTaskAdded = false; // Track if we have counted this task

            task.assignedUsers.forEach(assignedUser => {
                if (assignedUser.status === 'To Do' && assignedUser.userId) {
                    response.push({
                        firstName: assignedUser.userId.firstName,
                        lastName: assignedUser.userId.lastName,
                        phoneNumber: assignedUser.userId.phoneNumber,
                        taskTitle: task.title,
                        taskDescription: task.description,
                        taskStatus: assignedUser.status,
                        dueDate: task.dueDate
                    });

                    // Add the task ID to the unique set only once
                    if (!isTaskAdded) {
                        uniqueTaskIds.add(task._id.toString());
                        isTaskAdded = true;
                    }
                }
            });
        });

        const pendingTasksCount = uniqueTaskIds.size; // Count of unique task IDs

        res.status(200).json({ pendingTasksCount, pendingTasks: response });

    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.taskStatus = async (req, res) => {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!['Active', 'Inactive'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Allowed values: 'Active' or 'Inactive'." });
    }

    try {
        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            { taskStatus: status },
            { new: true }
        );

        if (!updatedTask) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.status(200).json({ message: `Task status updated to ${status}`, updatedTask });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.loginAdmin = async (req, res) => {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
        return res.status(400).json({ message: "Invalid phone number or password" });
    }

    try {
        const admin = await Admin.findOne({ phoneNumber });

        if (!admin) {
            console.log(`No user found with phoneNumber ${phoneNumber}`);
            return res.status(401).json({ message: "Invalid phone number or password" });
        }

        console.log(`User found ${admin._id} with phoneNumber ${phoneNumber}`);

        const isPasswordValid = await bcrypt.compare(password, admin.password);

        if (!isPasswordValid) {
            console.log(`Incorrect password for user ${admin._id}`);
            return res.status(401).json({ message: "Invalid phone number or password" });
        }

        const token = jwt.sign(
            { id: admin._id, phoneNumber: admin.phoneNumber},
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        return res.status(200).json({
            success: true,
            message: 'Login Successfully',
            token: token,
            user: {
                id: admin._id,
                phoneNumber: admin.phoneNumber,
                firstName: admin.firstName,
                lastName: admin.lastName
            },
        });

    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.registerAdmin = async (req, res) => {
    const { phoneNumber, password, firstName, lastName } = req.body;

    if (!phoneNumber || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "Invalid phone number or password or first name or last name empty" });
    }

    try {
        const existingAdmin = await Admin.findOne({ phoneNumber });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin with this phone number already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = new Admin({
            firstName,
            lastName,
            phoneNumber,
            password: hashedPassword,
        });

        await newAdmin.save();

        // Generate JWT token
        const token = jwt.sign(
            { id: newAdmin._id, phoneNumber: newAdmin.phoneNumber, firstName: newAdmin.firstName, lastName: newAdmin.lastName },
            process.env.JWT_SECRET,
            { expiresIn: "7d" } // Token valid for 7 days
        );

        return res.status(201).json({
            success: true,
            message: "Admin created successfully",
            admin: {
                id: newAdmin._id,
                phoneNumber,
                firstName,
                lastName,
            },
            token,
        });

    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};

exports.fetchCompletedTasks = async (req, res) => {
    try {
        // Find tasks where ALL assigned users have status "Done"
        const completedTasks = await Task.find({
            assignedUsers: { $not: { $elemMatch: { status: "To Do" } } } // No assigned user should have "To Do" status
        });

        const completedTasksCount = completedTasks.length;

        res.status(200).json({ completedTasksCount, completedTasks });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};