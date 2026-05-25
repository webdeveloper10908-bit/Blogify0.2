const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const { graphqlHTTP } = require("express-graphql");

const UserRoute = require("./routes/User");
const GoogleAuthRoute = require("./routes/GoogleAuthentication");
const BlogRoute = require("./routes/Blog");
const AdminRoute = require("./routes/Admin");
const ProfileRoute = require("./routes/Profile");
const CommentRoute = require("./routes/Comment");
const FollowRoute = require("./routes/Follow");
const NotificationRoute = require("./routes/Notification");
const AnalyticsRoute = require("./routes/Analytics");

const { checkForAuthenticationCookie } = require("./middlewares/authentication");
const { queryHandler } = require("./middlewares/queryParams");
const { apiLimiter } = require("./middlewares/rateLimiting");
const { schema, root } = require("./graphql/schema");

const app = express();
const PORT = process.env.PORT || 8000;

require("dotenv").config();

// ====================== MONGODB CONNECTION ======================
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/blogify")
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1);
    });

// ====================== MIDDLEWARE ======================
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve("./public")));

// Security headers
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
});

app.use(passport.initialize());
app.use(checkForAuthenticationCookie("token"));
app.use(queryHandler);
app.use("/api/", apiLimiter);

// ====================== GRAPHQL ENDPOINT ======================
app.use("/graphql", graphqlHTTP((req) => ({
    schema: schema,
    rootValue: root,
    graphiql: true,
    context: { user: req.user }
})));

// ====================== HOME ROUTE ======================
app.get("/", async (req, res) => {
    try {
        const Blog = require("./models/Blog");
        const { search = '', sort = 'newest', page = 1, limit = 9 } = req.queryParams || {};

        const filter = {
            isDeleted: false,
            status: "published"
        };

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { body: { $regex: search, $options: "i" } }
            ];
        }

        let sortOption = { createdAt: -1 };
        if (sort === "oldest") sortOption = { createdAt: 1 };
        if (sort === "title") sortOption = { title: 1 };
        if (sort === "trending") sortOption = { viewCount: -1 };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const blogs = await Blog.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit))
            .populate("createdBy", "fullName profileImageURL")
            .lean();

        const totalBlogs = await Blog.countDocuments(filter);
        const totalPages = Math.ceil(totalBlogs / limit);

        // Get featured blogs
        const featuredBlogs = await Blog.find({
            isFeatured: true,
            status: "published",
            isDeleted: false
        })
            .sort({ featuredRank: 1 })
            .limit(3)
            .populate("createdBy", "fullName profileImageURL")
            .lean();

        res.render("home", {
            title: "Blogify",
            user: req.user || null,
            blogs: blogs || [],
            featuredBlogs,
            currentPage: parseInt(page),
            totalPages,
            totalBlogs,
            search,
            sort
        });
    } catch (error) {
        console.error("🚨 Home Route Error:", error.message);
        res.status(500).render("error", { error: error.message });
    }
});

// ====================== ROUTES ======================
app.use("/admin", AdminRoute);
app.use("/user/profile", ProfileRoute);
app.use("/user", UserRoute);
app.use("/user", GoogleAuthRoute);
app.use("/blogs", BlogRoute);
app.use("/comments", CommentRoute);
app.use("/follow", FollowRoute);
app.use("/notifications", NotificationRoute);
app.use("/analytics", AnalyticsRoute);

// ====================== 404 HANDLER ======================
app.use((req, res) => {
    res.status(404).render("404");
});

// ====================== ERROR HANDLER ======================
app.use((err, req, res, next) => {
    console.error("🚨 Server Error:", err);
    res.status(err.status || 500).render("error", { error: err });
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Visit http://localhost:${PORT}`);
});
