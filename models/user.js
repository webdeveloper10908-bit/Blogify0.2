const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const { createHmac, randomBytes } = require("crypto");
const { creatTokenForUser } = require("../services/authentication");

const UserSchema = new Schema({
    fullName: { type: String },   // Made optional
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true 
    },
    salt: { type: String },
    password: { type: String },
    profileImageURL: { 
        type: String, 
        default: "https://res.cloudinary.com/dheausxnx/image/upload/v1/blogifyer_uploads/default_profile.png" 
    },
    role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },

    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpiry: { type: Date },

    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
}, { timestamps: true });

UserSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = randomBytes(16).toString("hex");
    const hashedPassword = createHmac("sha256", salt).update(this.password).digest("hex");
    this.salt = salt;
    this.password = hashedPassword;
});

UserSchema.methods.generateResetToken = function () {
    const resetToken = randomBytes(32).toString("hex");
    this.resetToken = resetToken;
    this.resetTokenExpiry = Date.now() + 2 * 60 * 1000; // 2 minutes
    return resetToken;
};

UserSchema.static('matchPassword', async function (email, password) {
    const user = await this.findOne({ email });
    if (!user) throw new Error("User not found");
    if (!user.isVerified) throw new Error("Please verify your email first");

    const userProvidedHash = createHmac("sha256", user.salt).update(password).digest("hex");
    if (user.password !== userProvidedHash) throw new Error("Incorrect Password");

    return creatTokenForUser(user);
});

const User = mongoose.models.user || model("user", UserSchema);
module.exports = User;
