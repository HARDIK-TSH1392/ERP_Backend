const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
    {
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
        progress: { type: Number, min: 0, max: 100, default: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Progress', progressSchema);
