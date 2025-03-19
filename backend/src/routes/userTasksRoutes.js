const express = require('express');
const router = express.Router();
const { getAssignedTasks, completeTask, getTaskActivity } = require('../controllers/userTaskController');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const aws = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { authenticateUser } = require('../middlewares/authMiddleware');

// Validate required environment variables
const requiredEnvVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'AWS_BUCKET_NAME'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Initialize S3 client with AWS SDK v3
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Configure multer for file upload
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.AWS_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        // Set appropriate ACL based on your needs
        acl: 'private', // Changed from public-read for better security
        metadata: (req, file, cb) => {
            cb(null, {
                fieldName: file.fieldname,
                contentType: file.mimetype,
                uploadedBy: req.user?.id || 'anonymous'
            });
        },
        key: (req, file, cb) => {
            // Sanitize the original filename
            const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileExtension = sanitizedName.split('.').pop().toLowerCase();

            // Create a unique filename with user ID for better organization
            const uniqueFilename = `${req.user.id}/tasks/${Date.now()}-${uuidv4()}.${fileExtension}`;
            cb(null, uniqueFilename);
        }
    }),
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

        // Check MIME type
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'), false);
        }

        // Check file extension
        const ext = '.' + file.originalname.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            return cb(new Error('Invalid file extension. Only .jpg, .jpeg, .png, and .pdf files are allowed.'), false);
        }

        cb(null, true);
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1 // Only allow one file per upload
    }
});

// Enhanced error handling middleware for file upload
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    error: 'File is too large. Maximum size is 10MB.'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    error: 'Too many files. Only one file allowed.'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    error: 'Unexpected field name in upload.'
                });
            default:
                return res.status(400).json({
                    success: false,
                    error: `Upload error: ${err.message}`
                });
        }
    }

    if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({
            success: false,
            error: err.message || 'Error processing file upload'
        });
    }

    next();
};

// Route to get assigned tasks
router.get('/tasks', authenticateUser, getAssignedTasks);

// Route to complete a task (with file upload)
router.post('/users/tasks/:taskId/complete', authenticateUser, upload.single('file'), completeTask); // Tested

// Route to fetch task activity for a given task ID
router.get('/tasks/:taskId/activity', getTaskActivity);

module.exports = router;