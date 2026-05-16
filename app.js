const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

console.log("🚀 Server Starting...");

// MongoDB Connection (Simplified)
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((err) => console.error("❌ MongoDB Error:", err.message));

// View Engine
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

// Middlewares
app.use(require("cookie-parser")());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/", express.static(path.resolve("./public")));

// Home Route
app.get("/", async (req, res) => {
    try {
        const Blog = require("./models/Blog");
        const allBlogs = await Blog.find({}).sort({ createdAt: -1 }).lean();
        
        res.render("home", {
            user: null,
            blogs: allBlogs || []
        });
    } catch (error) {
        console.error("❌ Home Route Error:", error.message);
        res.status(500).send("Internal Server Error");
    }
});

console.log("✅ Basic routes loaded");

// Start Server for Render
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
