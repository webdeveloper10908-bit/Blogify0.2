const express = require("express");
const router = express.Router();
const User = require("../models/user");
const { restrictToLoggedInUserOnly } = require("../middlewares/authentication");
const NotificationService = require("../services/notificationService");

router.use(restrictToLoggedInUserOnly);

// ====================== FOLLOW USER ======================
router.post("/:userId/follow", async (req, res) => {
    try {
        const { userId } = req.params;

        if (userId === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: "Cannot follow yourself" });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isFollowing = req.user.isFollowing(userId);

        if (isFollowing) {
            // Unfollow
            await req.user.unfollowUser(userId);
            await targetUser.removeFollower(req.user._id);
        } else {
            // Follow
            await req.user.followUser(userId);
            await targetUser.addFollower(req.user._id);

            // Send notification
            await NotificationService.createNotification(
                userId,
                "follow",
                {
                    title: "New follower",
                    message: `${req.user.fullName} started following you`,
                    actor: req.user._id
                }
            );

            // Send email
            await NotificationService.sendEmailNotification(targetUser, "follow", {
                actorName: req.user.fullName
            });
        }

        res.json({ 
            success: true, 
            following: !isFollowing,
            message: isFollowing ? "Unfollowed" : "Followed"
        });
    } catch (error) {
        console.error("Follow Error:", error);
        res.status(500).json({ success: false, message: "Failed to follow user" });
    }
});

// ====================== GET FOLLOWERS ======================
router.get("/:userId/followers", async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;

        const user = await User.findById(userId)
            .populate({
                path: "followers",
                select: "fullName profileImageURL bio",
                options: { skip, limit }
            });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const total = user.followers.length;

        res.json({
            success: true,
            followers: user.followers,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Error fetching followers:", error);
        res.status(500).json({ success: false, message: "Failed to fetch followers" });
    }
});

// ====================== GET FOLLOWING ======================
router.get("/:userId/following", async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;

        const user = await User.findById(userId)
            .populate({
                path: "following",
                select: "fullName profileImageURL bio",
                options: { skip, limit }
            });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const total = user.following.length;

        res.json({
            success: true,
            following: user.following,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Error fetching following:", error);
        res.status(500).json({ success: false, message: "Failed to fetch following" });
    }
});

module.exports = router;
