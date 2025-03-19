const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const axios = require('axios');
require('dotenv').config();

/**
 * Initiates the OTP verification process using the new OTPLess API
 */
exports.signIn = async (req, res) => {
    const {
        phoneNumber,
        expiry,
        otpLength,
        channels,
        metadata = {}
    } = req.body;

    // Check if either phoneNumber or email is provided
    if (!phoneNumber) {
        return res.status(400).json({
            success: false,
            error: "Missing required parameters; please provide either 'phoneNumber' or 'email'.",
        });
    }

    try {
        // Prepare the payload for the OTPLess API
        const payload = {
            phoneNumber,
            expiry,
            otpLength,
            channels,
            metadata
        };

        // Add the appropriate identifier (phone or email)
        if (phoneNumber) {
            payload.phoneNumber = phoneNumber;
        }

        // Make request to the new OTPLess API to initiate OTP using fetch
        const options = {
            method: 'POST',
            headers: {
                clientId: process.env.OTPLESS_CLIENT_ID,
                clientSecret: process.env.OTPLESS_CLIENT_SECRET,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        };

        const response = await fetch('https://auth.otpless.app/auth/v1/initiate/otp', options);
        const responseData = await response.json();

        // Log the complete response for debugging
        console.log('OTPLess initiate response:', responseData);


        if (response.status === 200) {
            return res.status(200).json({
                success: true,
                requestId: responseData.requestId, // Store this for verification
                message: responseData.message || 'OTP initiated successfully',
                otpSent: responseData.otpSent || false,
                channel: responseData.channel || null,
                expiry: responseData.expiry || expiry,
                timestamp: responseData.timestamp || new Date().toISOString()
            });
        } else {
            throw new Error(responseData.message || 'Failed to initiate OTP');
        }
    } catch (error) {
        console.error('Error in sending OTP:', error.message);
        return res.status(500).json({
            success: false,
            error: error.response?.data?.message || error.message
        });
    }
};

/**
 * Verifies the OTP code using the new OTPLess API
 */
exports.verify = async (req, res) => {
    const { requestId, otp, phoneNumber, role } = req.body;
    let userExists = false;

    if (!requestId || !otp) {
        return res.status(400).json({
            success: false,
            error: "Missing 'requestId' or 'otp' parameter; both are required.",
        });
    }

    if (!phoneNumber || phoneNumber.trim() === "") {
        return res.status(400).json({
            success: false,
            error: "Invalid 'phoneNumber' parameter.",
        });
    }
    console.log({
        phoneNumber,
        requestId,
        otp,
        role
    })

    try {
        // Verify OTP with the new OTPLess API
        const verifyOptions = {
            method: 'POST',
            headers: {
                clientId: process.env.OTPLESS_CLIENT_ID,
                clientSecret: process.env.OTPLESS_CLIENT_SECRET,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requestId,
                otp
            })
        };

        const verifyResponse = await fetch('https://auth.otpless.app/auth/v1/verify/otp', verifyOptions);
        const verifyData = await verifyResponse.json();

        // Log the complete verification response for debugging
        console.log('OTPLess verify response:', verifyData);
        console.log(verifyResponse);

        if (verifyResponse.status !== 200) {
            return res.status(400).json({
                success: false,
                message: verifyData.message || 'Invalid verification code',
                errorCode: verifyData.errorCode || null,
                timestamp: verifyData.timestamp || new Date().toISOString()
            });
        }
        console.log("About to go to create user: ");
        let user = await User.findOne({ phoneNumber });
        if (!user) {
            console.log(`No user found with phoneNumber: ${phoneNumber}. Creating a new user.`);
            user = new User({ phoneNumber, role: role});
            await user.save();
        } else {
            console.log(`User found: ${user._id}`);
            userExists = true;
        }
        console.log("Created user");

        const token = jwt.sign(
            { id: user._id, phoneNumber: user.phoneNumber, role: user.role },
            process.env.JWT_SECRET
        );

        return res.status(200).json({
            success: true,
            message: 'Verification successful',
            token,
            user: { id: user._id, phoneNumber: user.phoneNumber, role: user.role, userExists },
        });
    } catch (error) {
        console.error('Error in verifying OTP:', error.message);
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'Duplicate phone number detected.',
            });
        }
        return res.status(500).json({
            success: false,
            error: error.response?.data?.message || error.message
        });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id
        const { firstName, lastName, state, pc_name, ac_name, epic_id } = req.body;
        console.log(req.body)
        console.log(userId)
        const user = await User.findById(userId);
        console.log("This is the found user: " + user) // null

        if (!user) {
            return res.status(404).json({ success: false, error: `No user found with phoneNumber: ${`yo`}.` });
        }

        user.firstName = firstName !== undefined ? firstName : null;
        user.lastName = lastName !== undefined ? lastName : null;
        // user.location = location !== undefined ? location : null;
        user.ac_name = ac_name !== undefined ? ac_name : null;
        user.pc_name = pc_name !== undefined ? pc_name : null;
        user.epic_id = epic_id !== undefined ? epic_id : null;
        user.state = state !== undefined ? state : null;

        await user.save();

        res.status(200).json({ success: true, message: 'Profile updated successfully.', user });
    } catch (error) {
        console.error('Error updating profile:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.fillForm = async (req, res) => {
    const {ac_name, pc_name, state, epic_id, role, phoneNumber, first_name, last_name} = req.body;

    try{
        if(!ac_name || !pc_name || !state || !epic_id || !role || !phoneNumber || !first_name || !last_name) {
            return res.status(400).json({
                success: false,
                error: "Missing 'ac_name', 'pc_name', 'state', 'epic_id', or 'role' or 'first' or 'last' name missing parameter; all are required.",
            });
        }

        const user = await User.findOne({phoneNumber});
        if(!user) {
            return res.status(404).json({
                success: false,
                error: `No user found with phoneNumber: ${phoneNumber}.`
            });
        }
        user.ac_name = ac_name;
        user.pc_name = pc_name;
        user.state = state;
        user.epic_id = epic_id;
        user.firstName = first_name;
        user.lastName = last_name;
        user.role = role;
        await user.save();
        return res.status(200).json({success: true, message: 'Form filled successfully.'});
    }catch (error){
        console.error('Error in filling form:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}
