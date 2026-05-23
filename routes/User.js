const express = require("express");
const router = express.Router();
const User = require("../models/user");
const { sendOTPEmail } = require("../services/email");

// Temporary OTP Store
const otpStore = new Map();

// ====================== OLD SIGNIN LOGIC (UNTOUCHED) ======================
router.post("/signin", async (req, res) => {
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

// ====================== GET SIGNUP PAGE ======================
router.get("/signup", (req, res) => {
    res.render("signup", { 
        user: req.user || null 
    });
});

// ====================== SEND OTP ======================
router.post("/send-otp", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    try {
        const normalizedEmail = email.toLowerCase();

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered. Please login instead."
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000;

        otpStore.set(normalizedEmail, { otp, expiresAt });

        await sendOTPEmail(email, otp);

        res.json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        console.error("Send OTP Error:", error);
        res.status(500).json({ success: false, message: "Failed to send OTP" });
    }
});

// ====================== POST SIGNUP ======================
router.post("/signup", async (req, res) => {
    const { FullName, email, password, otp } = req.body;

    if (!FullName || !email || !password || !otp) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    try {
        const normalizedEmail = email.toLowerCase();

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered. Please login."
            });
        }

        const storedOtpData = otpStore.get(normalizedEmail);
        if (!storedOtpData) {
            return res.status(400).json({ success: false, message: "No OTP found. Request new OTP." });
        }

        if (Date.now() > storedOtpData.expiresAt) {
            otpStore.delete(normalizedEmail);
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        if (storedOtpData.otp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        const user = await User.create({
            fullName: FullName,
            email: normalizedEmail,
            password: password
        });

        otpStore.delete(normalizedEmail);

        const token = await User.matchPassword(normalizedEmail, password);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                profileImageURL: user.profileImageURL
            }
        });

    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ success: false, message: "Signup failed. Please try again." });
    }
});

// ====================== LOGOUT ======================
router.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/");
});

router.post("/logout", (req, res) => {
    res.clearCookie("token");
    res.status(200).json({ success: true, message: "Logged out successfully" });
});

module.exports = router;
