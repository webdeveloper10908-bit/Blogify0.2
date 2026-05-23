const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { sendOTPEmail } = require('../services/email');

// In-memory OTP storage
const otpStore = new Map();

// ====================== YOUR ORIGINAL SIGNIN LOGIC (UNTOUCHED) ======================
router.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    try {
        const token = await User.matchPassword(email, password);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            success: true,
            message: "Login successful"
        });
    } catch (error) {
        console.error("Signin Error:", error.message);
        res.status(401).json({
            success: false,
            message: error.message || "Invalid email or password"
        });
    }
});

// ====================== YOUR LOGOUT LOGIC (UNTOUCHED) ======================
router.get('/logout', (req, res) => {
    res.clearCookie("token");
    res.redirect('/');
});

router.post('/logout', (req, res) => {
    res.clearCookie("token");
    res.status(200).json({ success: true, message: "Logged out successfully" });
});

// ====================== SEND OTP (Updated) ======================
router.post('/send-otp', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    try {
        const normalizedEmail = email.toLowerCase().trim();

        // Check if email already exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered. Please login instead."
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

        otpStore.set(normalizedEmail, { otp, expires });

        await sendOTPEmail(email, otp);

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error("Send OTP Error:", error.message);
        res.status(500).json({ success: false, message: 'Failed to send OTP. Try again.' });
    }
});

// ====================== SIGNUP (Updated) ======================
router.post('/signup', async (req, res) => {
    const { fullName, email, password, otp } = req.body;

    if (!fullName || !email || !password || !otp) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    try {
        const normalizedEmail = email.toLowerCase().trim();

        // Validate OTP
        const stored = otpStore.get(normalizedEmail);
        if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        // Clear OTP after use
        otpStore.delete(normalizedEmail);

        // Check if user already exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered. Please login."
            });
        }

        // Create new user (Your model will handle password hashing)
        const newUser = await User.create({
            fullName,
            email: normalizedEmail,
            password
        });

        // Generate token using your original signin logic
        const token = await User.matchPassword(normalizedEmail, password);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            success: true,
            message: "Account created successfully!",
            user: {
                id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email
            }
        });

    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ success: false, message: "Signup failed. Please try again." });
    }
});

module.exports = router;
