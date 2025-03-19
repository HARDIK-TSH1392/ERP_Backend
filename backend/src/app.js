const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const progressRoutes = require('./routes/progressRoutes');
const userTaskRoutes = require('./routes/userTasksRoutes');
const homeScreenRoutes = require('./routes/homeScreenRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
// app.use('/api/progress', progressRoutes);
// app.use('/api/user', userTaskRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/home', homeScreenRoutes);
app._router.stack.forEach((middleware) => {
    if (middleware.route) {
        console.log(middleware.route.path);
    }
});

module.exports = app;
