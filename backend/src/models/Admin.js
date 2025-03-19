const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
        firstName: {type: String, required: false, default: null},
        lastName: {type: String, required: false, default: null},
        phoneNumber: {type: String, required: true, default: null},
        password: {type: String, required: true},
    },
    { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);