const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "vshntvelip@gmail.com",
        pass: "eatrtctnrqqfmhtd"
    }
});

const sendOTP = async (email, otp) => {
    const mailOptions = {
        from: '"Blogify" <vshntvelip@gmail.com>',
        to: email,
        subject: "Your OTP Code - Blogify",
        html: `
            <h2>Your OTP is: <strong>${otp}</strong></h2>
            <p>This OTP will expire in 10 minutes.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("Nodemailer Error:", error);
        return false;
    }
};

const sendPasswordResetLink = async (email, resetToken) => {
    const resetLink = `http://localhost:8000/user/reset-password/${resetToken}`;

    const mailOptions = {
        from: '"Blogify" <vshntvelip@gmail.com>',
        to: email,
        subject: "Reset Your Password - Blogify",
        html: `
            <h2>Password Reset Request</h2>
            <p>Click the link below to reset your password:</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
            <p><strong>This link is valid for only 2 minutes.</strong></p>
            <p>If you didn't request this, please ignore this email.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("Reset Email Error:", error);
        return false;
    }
};

module.exports = { sendOTP, sendPasswordResetLink };
