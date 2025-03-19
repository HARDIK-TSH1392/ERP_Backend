exports.getKanbanBoard = async (req, res) => {
    try {
        const tasks = await Task.find();
        const board = {
            toDo: tasks.filter(task => task.status === 'To Do'),
            inProgress: tasks.filter(task => task.status === 'In Progress'),
            done: tasks.filter(task => task.status === 'Done'),
        };

        res.status(200).json({ success: true, board });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
