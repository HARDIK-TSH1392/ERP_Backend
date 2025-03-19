const Progress = require('../models/Progress');

exports.updateProgress = async (req, res) => {
    try {
        const { taskId, progress } = req.body;

        const updatedProgress = await Progress.findOneAndUpdate(
            { taskId },
            { progress },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, progress: updatedProgress });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
