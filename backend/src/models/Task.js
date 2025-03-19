const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        description: { type: String },
        dueDate: { type: Date },
        multipleUploads: { type: Boolean, default: false }, // Allow multiple uploads
        assignedUsers: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                status: { type: String, enum: ['To Do', 'Done'], default: 'To Do' },
                uploads: [
                    {
                        fileUrl: { type: String }, // URL of the uploaded file
                        uploadedAt: { type: Date, default: Date.now }, // Timestamp of the upload
                        state: { type: String, default: null},
                        pc_name: { type: String, default: null },
                        ac_name: { type: String, default: null },
                    },
                ],
                score: { type: Number, default: 0 }, // Dynamic score
            }
        ],
        taskStatus: {type: String, enum: ['Active', 'Inactive'], default: 'Active'},

    },
    { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
