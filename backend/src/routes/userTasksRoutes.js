const express = require('express');
const { uploadPostImage } = require('../controllers/userTaskController'); // ✅ Updated Controller Name
const { authenticateUser } = require('../middlewares/authMiddleware');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

// ✅ Initialize S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// ✅ Configure multer for S3 file upload
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.AWS_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'private', // Secure the files
        key: (req, file, cb) => {
            const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileExtension = sanitizedName.split('.').pop().toLowerCase();
            const uniqueFilename = `posts/${req.user.id}/${Date.now()}-${uuidv4()}.${fileExtension}`;
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
});

const router = express.Router();

// ✅ Upload Post Image and return S3 URL
router.post('/posts/upload-image', authenticateUser, upload.single('file'), uploadPostImage);

module.exports = router;