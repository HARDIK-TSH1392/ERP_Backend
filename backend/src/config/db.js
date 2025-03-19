const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const dbURI = process.env.MONGO_URI;  // Use MONGO_URI here
        if (!dbURI) {
            throw new Error('MONGO_URI is not defined in the .env file');
        }
        await mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('MongoDB connected');
    } catch (err) {
        console.error('Database connection error:', err);
        process.exit(1); // Exit with failure code
    }
};

module.exports = connectDB;