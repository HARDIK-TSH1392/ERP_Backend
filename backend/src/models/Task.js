const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        content: { type: String },
        fileUrl: { type: String }, // URL of the uploaded file
        uploadedAt: { type: Date, default: Date.now }, // Timestamp of the upload
        state: { type: String, default: null },
        pc_name: { type: String, default: null },
        ac_name: { type: String, default: null },
        meetingDate: { type: Date, required: false }, // ✅ Added field for meeting date

        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ✅ Link post to a user
    },
    { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);