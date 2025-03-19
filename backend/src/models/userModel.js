const mongoose = require('mongoose');
const Roles = require('../enums/roles'); // Import the Roles enum
const STATES = require('../enums/states');
const PC_NAME = require('../enums/pc_name');
const SubRoles = require("../enums/subroles");

const userSchema = new mongoose.Schema(
    {
        phoneNumber: { type: String, required: true, unique: true },
        role: { type: String, enum: Object.values(Roles) },
        subRole: { type: String, enum: Object.values(SubRoles) },
        firstName: { type: String, default: null },
        lastName: { type: String, default: null },
        location: { type: String, default: null },
        taskCount: { type: Number, default: 0 },
        taskStatus: {
            type: Map,
            of: Number,
            default: { 'To Do': 0, 'Done': 0 }
        },
        tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],

        state: { type: String, enum: Object.keys(STATES), default: null },

        pc_name: { type: String, enum: Object.keys(PC_NAME), default: null },

        ac_name: {  type: String, default: null  },

        epic_id: { type: String, default: null },
        formFilled: { type: Boolean, default: false }
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);