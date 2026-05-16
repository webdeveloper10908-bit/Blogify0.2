const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

const sendOTP = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Blogify - Email Verification OTP",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Email Verification</h2>
                <p>Your OTP for Blogify account verification is:</p>
                <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center;">
                    <h1 style="color: #3b82f6; margin: 0; letter-spacing: 5px;">${otp}</h1>
                </div>
                <p style="color: #666; margin-top: 20px;">This OTP will expire in 10 minutes.</p>
                <p style="color: #666;">If you didn't request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">Blogify - Secure Blogging Platform</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("Error sending OTP email:", error);
        return false;
    }
};

const sendPasswordResetLink = async (email, resetToken) => {
    const resetLink = `${process.env.APP_URL}/user/reset-password/${resetToken}`;
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Blogify - Password Reset Request",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p>We received a request to reset your Blogify account password.</p>
                <p style="margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password
                    </a>
                </p>
                <p style="color: #666; margin-top: 20px;">Or copy and paste this link:</p>
                <p style="color: #3b82f6; word-break: break-all;">${resetLink}</p>
                <p style="color: #666; margin-top: 20px;">This link will expire in 1 hour.</p>
                <p style="color: #666;">If you didn't request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">Blogify - Secure Blogging Platform</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("Error sending reset email:", error);
        return false;
    }
};

module.exports = { sendOTP, sendPasswordResetLink };