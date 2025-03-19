const dotenv = require('dotenv');
dotenv.config();

const http = require('http'); // Use HTTP instead of HTTPS
const socketIo = require('socket.io');
const app = require('./app'); // Import Express app
const connectDB = require('./config/db'); // Database connection function

const PORT = process.env.PORT || 5001;

const startServer = async () => {
    try {
        await connectDB(); // Connect to the database
        console.log('✅ Database connected successfully');

        // Create HTTP server
        const server = http.createServer(app);

        const io = socketIo(server, {
            cors: {
                origin: '*', // Adjust to your frontend's domain in production
                methods: ['GET', 'POST'],
            },
        });

        // Handle WebSocket connections
        io.on('connection', (socket) => {
            console.log('🔗 User connected:', socket.id);

            // Listen for task updates and broadcast to other clients
            socket.on('updateTask', (data) => {
                console.log(`✅ Task updated:`, data);
                socket.broadcast.emit('taskUpdated', data);
            });

            // Listen for comments and broadcast
            socket.on('newComment', (data) => {
                console.log(`💬 New comment:`, data);
                socket.broadcast.emit('commentAdded', data);
            });

            // Disconnect event
            socket.on('disconnect', () => {
                console.log('❌ User disconnected:', socket.id);
            });
        });

        server.listen(PORT, () => {
            console.log(`🚀 HTTP Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Failed to connect to the database:', err);
        process.exit(1); // Exit with failure code
    }
};

startServer();