const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const { createHmac, randomBytes } = require("crypto");
const { creatTokenForUser } = require("../services/authentication");

const UserSchema = new Schema({
    fullName: { type: String },
    email: { type: String, required: true, unique: true },
    salt: { type: String },
    password: { type: String },
    profileImageURL: { type: String, default: "https://res.cloudinary.com/dheausxnx/image/upload/v1/blogifyer_uploads/default_profile.png" },
    role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
    isVerified: { type: Boolean, default: false },
    otp: { type: String }, // OTP for signup verification
    otpExpiry: { type: Date }, // OTP expiry time
    resetToken: { type: String }, // Token for password reset
    resetTokenExpiry: { type: Date }, // Reset token expiry
}, { timestamps: true });

// FIXED: Removed 'next' parameter because the function is async
UserSchema.pre("save", async function () {
    const user = this;
    if (!user.isModified("password")) return;

    const salt = randomBytes(16).toString("hex");
    const hashedPassword = createHmac("sha256", salt)
        .update(user.password)
        .digest("hex");

    user.salt = salt;
    user.password = hashedPassword;
});

UserSchema.static('matchPassword', async function(email, password) {
    const user = await this.findOne({ email });
    if (!user) throw new Error("User not found!");
    if (!user.isVerified) throw new Error("Please verify your email first!");

    const userProvidedHash = createHmac("sha256", user.salt)
        .update(password) 
        .digest("hex");

    if (user.password !== userProvidedHash) throw new Error("Incorrect Password");

    return creatTokenForUser(user);
});

const User = mongoose.models.user || model("user", UserSchema);
module.exports = User;