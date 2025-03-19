const Post = require('../models/Task');
const User = require('../models/userModel'); // Import the User model
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

// ✅ Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// ✅ Configure multer for S3 upload
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.AWS_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'private', // Secure uploads
        key: (req, file, cb) => {
            const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileExtension = sanitizedName.split('.').pop().toLowerCase();
            const uniqueFilename = `posts/${req.user._id}/${Date.now()}-${uuidv4()}.${fileExtension}`;
            cb(null, uniqueFilename);
        }
    }),
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Only JPEG and PNG files are allowed.'), false);
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('file'); // Accepts a single file upload

exports.createPost = async (req, res) => {
    try {
        // ✅ Authenticate user
        const userId = req.user._id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized: User ID not found in token.' });
        }

        // ✅ Upload the file (if provided)
        upload(req, res, async function (err) {
            if (err) {
                console.error('File upload error:', err);
                return res.status(400).json({ success: false, error: err.message || 'File upload failed' });
            }

            // ✅ Extract form data
            const { title, content, state, pc_name, ac_name, meetingDate } = req.body;
            const fileUrl = req.file ? req.file.location : null; // ✅ Store S3 URL if uploaded

            // ✅ Create post in MongoDB
            const post = new Post({
                title,
                content,
                fileUrl, // ✅ Store S3 file URL
                state,
                pc_name,
                ac_name,
                meetingDate,
                userId,
            });

            await post.save();

            res.status(201).json({
                success: true,
                message: 'Post created successfully',
                post,
            });
        });
    } catch (error) {
        console.error('Post creation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getUserPosts = async (req, res) => {
    try {
        // ✅ Get the authenticated user's ID from middleware
        const userId = req.user._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: User ID not found in token.'
            });
        }

        // ✅ Fetch posts created by this user
        const posts = await Post.find({ userId });

        res.status(200).json({ success: true, posts });
    } catch (error) {
        console.error('Error fetching user posts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};


exports.deletePost = async (req, res) => {
    try {
        const { postId } = req.params;

        // ✅ Get the authenticated user's ID from middleware
        const userId = req.user._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: User ID not found in token.'
            });
        }

        // ✅ Find the post and ensure it belongs to the logged-in user
        const post = await Post.findOne({ _id: postId, userId });

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found or you do not have permission to delete it.'
            });
        }

        // ✅ Delete the post
        await post.deleteOne();

        res.status(200).json({ success: true, message: 'Post deleted successfully.' });
    } catch (error) {
        console.error('Error deleting post:', error);
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