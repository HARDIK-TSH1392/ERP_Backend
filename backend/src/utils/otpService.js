const axios = require('axios');

// Environment variables for OTPless configurations
const OTP_BASE_URL = process.env.OTP_BASE_URL;
const OTP_CLIENT_ID = process.env.OTP_CLIENT_ID;
const OTP_CLIENT_SECRET = process.env.OTP_CLIENT_SECRET;

// Function to send OTP
const sendOtp = async (phoneNumber) => {
    try {
        const response = await axios.post(
            `${OTP_BASE_URL}/v1/initiate/otp`,
            {
                phoneNumber,
                expiry: 30, // OTP expiry in minutes
                otpLength: 4, // OTP length
                channels: ['WHATSAPP', 'SMS'], // Channels to send OTP
                metadata: {
                    key1: 'Data1',
                    key2: 'Data2',
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    clientId: OTP_CLIENT_ID,
                    clientSecret: OTP_CLIENT_SECRET,
                },
            }
        );

        if (response.data?.success) {
            return response.data; // Return the response from OTPless
        } else {
            throw new Error(response.data?.message || 'Failed to send OTP');
        }
    } catch (error) {
        throw new Error(`Error in sendOtp: ${error.response?.data?.message || error.message}`);
    }
};

// Function to verify OTP
const verifyOtp = async (requestId, otp) => {
    try {
        const response = await axios.post(
            `${OTP_BASE_URL}/v1/verify/otp`,
            {
                requestId,
                otp,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    clientId: OTP_CLIENT_ID,
                    clientSecret: OTP_CLIENT_SECRET,
                },
            }
        );

        if (response.data?.success) {
            return response.data; // Return the response from OTPless
        } else {
            throw new Error(response.data?.message || 'OTP verification failed');
        }
    } catch (error) {
        throw new Error(`Error in verifyOtp: ${error.response?.data?.message || error.message}`);
    }
};

module.exports = { sendOtp, verifyOtp };
