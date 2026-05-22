const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Blog = require("../models/Blog");

const { restrictTo } = require("../middlewares/authentication"); // We'll create this

// Admin Middleware - Only ADMIN can access
router.use(restrictTo(["ADMIN"]));

// GET - All Users + Their Blogs
router.get("/users", async (req, res) => {
    try {
        const users = await User.find({})
            .select("fullName email profileImageURL role createdAt")
            .sort({ createdAt: -1 })
            .lean();

        // Get blog count for each user
        const usersWithBlogs = await Promise.all(users.map(async (user) => {
            const blogs = await Blog.find({ createdBy: user._id })
                .select("title createdAt")
                .sort({ createdAt: -1 })
                .lean();

            return {
                ...user,
                blogCount: blogs.length,
                blogs: blogs
            };
        }));

        res.render("admin/users", {
            user: req.user,
            users: usersWithBlogs
        });
    } catch (error) {
        console.error("Admin Users Error:", error);
        res.status(500).send("Server Error");
    }
});

// DELETE - Delete User
router.delete("/users/:id", async (req, res) => {
    try {
        const userId = req.params.id;

        // Optional: Prevent deleting yourself
        if (userId === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot delete yourself" });
        }

        // Delete user's blogs first
        await Blog.deleteMany({ createdBy: userId });

        // Delete user
        await User.findByIdAndDelete(userId);

        res.json({ success: true, message: "User and their blogs deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to delete user" });
    }
});

module.exports = router;
