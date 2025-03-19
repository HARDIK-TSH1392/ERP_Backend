const Task = require('../models/Task');
const User = require('../models/userModel.js');

// exports.getRecentUploads = async (req, res) => {
//     try {
//         const { location } = req.query; // Get the location from query parameters
//
//         if (!location) {
//             return res.status(400).json({ success: false, error: 'Location is required.' });
//         }
//
//         // Define the 48-hour time window
//         const now = new Date();
//         const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
//
//         // Find users in the specified location
//         const usersInLocation = await User.find({ location }).select('_id firstName lastName');
//         const userMap = {};
//         usersInLocation.forEach(user => {
//             userMap[user._id.toString()] = { firstName: user.firstName, lastName: user.lastName };
//         });
//         const userIds = Object.keys(userMap);
//
//         if (userIds.length === 0) {
//             return res.status(404).json({ success: false, error: 'No users found in the specified location.' });
//         }
//
//         // Find tasks with uploads made by these users in the last 48 hours
//         const tasks = await Task.find({
//             'assignedUsers': {
//                 $elemMatch: {
//                     userId: { $in: userIds },
//                     uploads: {
//                         $elemMatch: { uploadedAt: { $gte: fortyEightHoursAgo } },
//                     },
//                 },
//             },
//         });
//
//         // Format the response to include relevant details
//         const recentUploads = tasks.flatMap(task => {
//             return task.assignedUsers
//                 .filter(userTask =>
//                     userIds.includes(userTask.userId.toString()) &&
//                     userTask.uploads.some(upload => new Date(upload.uploadedAt) >= fortyEightHoursAgo)
//                 )
//                 .map(userTask => {
//                     const uploads = userTask.uploads.filter(upload => new Date(upload.uploadedAt) >= fortyEightHoursAgo);
//                     return uploads.map(upload => {
//                         const hoursAgo = Math.floor((now - new Date(upload.uploadedAt)) / (1000 * 60 * 60));
//                         const userInfo = userMap[userTask.userId.toString()];
//                         return {
//                             taskId: task._id,
//                             userId: userTask.userId,
//                             firstName: userInfo.firstName,
//                             lastName: userInfo.lastName,
//                             fileUrl: upload.fileUrl,
//                             uploadedAt: upload.uploadedAt,
//                             hoursAgo,
//                         };
//                     });
//                 }).flat(); // Flatten the array
//         });
//
//         if (recentUploads.length === 0) {
//             return res.status(404).json({ success: false, error: 'No uploads found in the last 48 hours.' });
//         }
//
//         res.status(200).json({ success: true, recentUploads });
//     } catch (error) {
//         console.error('Error fetching recent uploads:', error.message);
//         res.status(500).json({ success: false, error: error.message });
//     }
// };



// exports.getFeeds = async (req, res) => {
//     const userId = req.user.id;
//
//     try {
//         // Find the logged-in user
//         const currentUser = await User.findById(userId).select('ac_name pc_name state');
//         if (!currentUser) {
//             return res.status(404).json({ message: 'User not found' });
//         }
//
//         // Fetch **all users**, but prioritize those in the same region
//         const users = await User.find().select('_id firstName lastName ac_name pc_name state');
//
//         // Separate users into **priority** and **remaining**
//         const priorityUsers = [];
//         const remainingUsers = [];
//
//         users.forEach(user => {
//             if (
//                 user.ac_name === currentUser.ac_name &&
//                 user.pc_name === currentUser.pc_name &&
//                 user.state === currentUser.state
//             ) {
//                 priorityUsers.push(user);
//             } else {
//                 remainingUsers.push(user);
//             }
//         });
//
//         // Combine both lists: Priority users first, then remaining users
//         const sortedUsers = [...priorityUsers, ...remainingUsers];
//
//         // Create a userId -> user details map
//         const userMap = {};
//         sortedUsers.forEach(user => {
//             userMap[user._id.toString()] = {
//                 name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
//                 ac_name: user.ac_name,
//                 pc_name: user.pc_name,
//                 state: user.state
//             };
//         });
//
//         const userIds = sortedUsers.map(user => user._id.toString());
//
//         // Fetch tasks assigned to these users
//         const tasks = await Task.find({ 'assignedUsers.userId': { $in: userIds } })
//             .select('assignedUsers');
//
//         // Extract uploaded file URLs along with uploader's name
//         let fileFeeds = [];
//         tasks.forEach(task => {
//             task.assignedUsers.forEach(assignedUser => {
//                 assignedUser.uploads.forEach(upload => {
//                     fileFeeds.push({
//                         fileUrl: upload.fileUrl,
//                         uploadedAt: upload.uploadedAt,
//                         uploadedBy: userMap[assignedUser.userId.toString()]?.name || 'Unknown User',
//                         ac_name: userMap[assignedUser.userId.toString()]?.ac_name || null,
//                         pc_name: userMap[assignedUser.userId.toString()]?.pc_name || null,
//                         state: userMap[assignedUser.userId.toString()]?.state || null
//                     });
//                 });
//             });
//         });
//
//         return res.status(200).json({ feeds: fileFeeds });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: 'Server error', error: error.message });
//     }
// };


exports.getFeeds = async (req, res) => {
    const userId = req.user.id;

    try {
        // Find the logged-in user
        const currentUser = await User.findById(userId).select('ac_name pc_name state');
        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch all tasks that have uploads
        const allTasks = await Task.find({ 'assignedUsers.uploads': { $exists: true, $ne: [] } })
            .select('assignedUsers.uploads assignedUsers.userId');

        // Separate tasks into **priority** (same state, pc_name, ac_name) and **remaining**
        let priorityFeeds = [];
        let remainingFeeds = [];

        allTasks.forEach(task => {
            task.assignedUsers.forEach(assignedUser => {
                assignedUser.uploads.forEach(upload => {
                    const post = {
                        fileUrl: upload.fileUrl,
                        uploadedAt: upload.uploadedAt,
                        state: upload.state || null,
                        ac_name: upload.ac_name || null,
                        pc_name: upload.pc_name || null,
                    };

                    // Prioritize tasks uploaded by users from the same `state`, `pc_name`, or `ac_name`
                    if (
                        upload.state === currentUser.state ||
                        upload.pc_name === currentUser.pc_name ||
                        upload.ac_name === currentUser.ac_name
                    ) {
                        priorityFeeds.push(post);
                    } else {
                        remainingFeeds.push(post);
                    }
                });
            });
        });

        // Combine both: Priority feeds first, then all remaining feeds
        const fileFeeds = [...priorityFeeds, ...remainingFeeds];

        return res.status(200).json({ feeds: fileFeeds });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};







