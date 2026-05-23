const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    },
    debug: true,        // Extra logging
    logger: true        // Show detailed logs
});

// Test connection
transporter.verify((error) => {
    if (error) {
        console.error("❌ GMAIL TRANSPORTER ERROR:", error.message);
    } else {
        console.log("✅ Gmail Transporter Ready");
    }
});

const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: `"Blogify" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Signup OTP - Blogify',
        html: `
            <h2>Your Verification Code</h2>
            <h1 style="font-size:50px">${otp}</h1>
            <p>Expires in 5 minutes.</p>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ OTP SENT to ${email}`);
        return true;
    } catch (error) {
        console.error("❌ GMAIL SEND FAILED");
        console.error("Code:", error.code);
        console.error("Message:", error.message);
        if (error.response) console.error("Response:", error.response);
        throw error;
    }
};

module.exports = { sendOTPEmail };
