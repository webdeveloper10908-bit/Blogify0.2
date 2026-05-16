const { Router } = require("express");
const User = require("../models/user");
const { sendOTP, sendPasswordResetLink } = require("../services/email");
const { randomBytes, createHmac } = require("crypto");
const router = Router();

// Generate OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Generate Reset Token
const generateResetToken = () => randomBytes(32).toString("hex");

// GET: Signin page
router.get("/signin", (req, res) => res.render("signin"));

// GET: Signup page
router.get("/signup", (req, res) => res.render("signup"));

// POST: Send OTP for signup
router.post("/send-otp", async (req, res) => {
    const { email, fullName, password } = req.body;

    try {
        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser.isVerified) {
            return res.status(400).json({ 
                success: false, 
                message: "Email already registered. Please sign in instead." 
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save or update user with OTP
        await User.findOneAndUpdate(
            { email },
            { 
                email, 
                fullName, 
                password,
                otp, 
                otpExpiry,
                isVerified: false 
            },
            { upsert: true, new: true }
        );

        // Send OTP via email
        const emailSent = await sendOTP(email, otp);
        if (!emailSent) {
            return res.status(500).json({ 
                success: false, 
                message: "Failed to send OTP. Please try again." 
            });
        }

        return res.json({ 
            success: true, 
            message: "OTP sent to your email. Please verify within 10 minutes.",
            email: email
        });
    } catch (error) {
        console.error("Send OTP Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error sending OTP. Please try again." 
        });
    }
});

// POST: Verify OTP
router.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: "User not found. Please sign up first." 
            });
        }

        // Check OTP expiry
        if (new Date() > user.otpExpiry) {
            return res.status(400).json({ 
                success: false, 
                message: "OTP expired. Please request a new one." 
            });
        }

        // Check OTP
        if (user.otp !== otp) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid OTP. Please try again." 
            });
        }

        // Mark user as verified and clear OTP
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        return res.json({ 
            success: true, 
            message: "Email verified successfully! You can now sign in."
        });
    } catch (error) {
        console.error("Verify OTP Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error verifying OTP. Please try again." 
        });
    }
});

// POST: Signin
router.post("/signin", async (req, res) => {
    const { email, password } = req.body;
    try {
        const token = await User.matchPassword(email, password);
        return res.cookie("token", token).redirect("/");
    } catch (error) {
        console.error("Signin Error:", error.message);
        return res.render("signin", { error: error.message });
    }
});

// GET: Forgot password page
router.get("/forgot-password", (req, res) => res.render("forgot-password"));

// POST: Send password reset link
router.post("/send-reset-link", async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: "No account found with this email." 
            });
        }

        // Generate reset token
        const resetToken = generateResetToken();
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        user.resetToken = resetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save();

        // Send reset link via email
        const emailSent = await sendPasswordResetLink(email, resetToken);
        if (!emailSent) {
            return res.status(500).json({ 
                success: false, 
                message: "Failed to send reset link. Please try again." 
            });
        }

        return res.json({ 
            success: true, 
            message: "Password reset link sent to your email. Please check within 1 hour."
        });
    } catch (error) {
        console.error("Send Reset Link Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error sending reset link. Please try again." 
        });
    }
});

// GET: Reset password page
router.get("/reset-password/:token", async (req, res) => {
    try {
        const user = await User.findOne({
            resetToken: req.params.token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.render("reset-password", { 
                error: "Reset link expired or invalid.",
                token: null
            });
        }

        return res.render("reset-password", { 
            token: req.params.token,
            email: user.email
        });
    } catch (error) {
        console.error("Reset Password Page Error:", error);
        return res.render("reset-password", { 
            error: "Error loading reset page.",
            token: null
        });
    }
});

// POST: Reset password
router.post("/reset-password/:token", async (req, res) => {
    const { password, confirmPassword } = req.body;

    try {
        if (password !== confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: "Passwords do not match." 
            });
        }

        const user = await User.findOne({
            resetToken: req.params.token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: "Reset link expired or invalid." 
            });
        }

        // Update password
        user.password = password;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        return res.json({ 
            success: true, 
            message: "Password reset successfully! You can now sign in with your new password."
        });
    } catch (error) {
        console.error("Reset Password Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error resetting password. Please try again." 
        });
    }
});

// GET: Logout
router.get("/logout", (req, res) => {
    return res.clearCookie("token").redirect("/");
});

module.exports = router;