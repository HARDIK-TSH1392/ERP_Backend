const express = require('express');
const { signIn, verify, updateProfile, fillForm } = require('../controllers/authController');
const { authenticateUser } = require('../middlewares/authMiddleware');
const User = require('../models/userModel');
const Roles = require('../enums/roles');
const PC_NAMES = require('../enums/pc_name');
const STATES = require('../enums/states');
const Tasks = require('../enums/tasks');
const SubRoles = require("../enums/subroles");
const router = express.Router();
require('dotenv').config();

console.log(Tasks)
// Route to send OTP: Tested
router.post('/sign-in', signIn);

router.get('/getUserProfile',authenticateUser, async(req, res) => {
    try{
        const userID = req.user.id;
        const user = await User.findById(userID);
        res.status(200).json({user});
    }
    catch(error) {
        res.status(500).json({success: false, error: error.message});
    }
});
// Route to verify OTP: Tested
router.post('/verify', verify);

// Route to fetch roles: Tested
// router.get('/roles', (req, res) => {
//     res.status(200).json({ roles: Object.values(Roles) });
// });

// router.get('/subRoles', (req, res) => {
//     res.status(200).json({subRoles: Object.values(SubRoles) });
// })

// Route to fetch tasks
router.get('/tasks', (req, res) => {
    res.status(200).json({ tasks: Object.values(Tasks) });
})

// Profile Edit
router.put('/user-info',authenticateUser, updateProfile);

// Fill the form for user name
router.post('/form', fillForm);

Tested
router.get('/ac-name/:pc', (req, res) => {
    const pc = req.params.pc.trim();

    if (!PC_NAMES[pc]) {
        return res.status(404).json({ message: "PC not found" });
    }

    res.status(200).json({ acNames: PC_NAMES[pc] });
});

Tested
router.get('/pc-name/:state', (req, res) => {
    const state = req.params.state.trim();

    if (!STATES[state]) {
        return res.status(404).json({ message: "State not found" });
    }

    res.status(200).json({ pcNames: STATES[state] });
});

Tested
router.get('/states', (req, res) => {
    res.status(200).json({ states: Object.keys(STATES) });
});

module.exports = router;
