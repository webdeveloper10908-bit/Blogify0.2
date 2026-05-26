// graphql/schema.js

const { buildSchema } = require("graphql");
const Blog = require("../models/Blog");
const User = require("../models/user");
const Comment = require("../models/Comment");
const BlogAnalytics = require("../models/BlogAnalytics");

/**
 * Enhanced GraphQL Schema with comprehensive types and queries
 * Supports blogs, users, comments, analytics, and search functionality
 */
const schema = buildSchema(`
  type User {
    _id: ID!
    fullName: String!
    email: String!
    profileImageURL: String
    bio: String
    role: String
    website: String
    location: String
    followerCount: Int
    followingCount: Int
    createdAt: String
  }

  type Comment {
    _id: ID!
    content: String!
    author: User!
    blog: ID!
    createdAt: String!
    updatedAt: String!
    likeCount: Int
    replies: [Comment]
  }

  type Blog {
    _id: ID!
    title: String!
    body: String!
    excerpt: String
    coverImageURL: String
    slug: String!
    status: String!
    category: String
    tags: [String]
    viewCount: Int
    readingTime: Int
    likeCount: Int
    commentCount: Int
    isFeatured: Boolean
    metaDescription: String
    createdAt: String!
    updatedAt: String!
    publishedAt: String
    createdBy: User!
  }

  type BlogAnalytics {
    _id: ID!
    blog: Blog!
    author: User!
    totalViews: Int!
    totalLikes: Int!
    totalComments: Int!
    totalShares: Int!
    createdAt: String!
    updatedAt: String!
  }

  type PaginationInfo {
    currentPage: Int!
    pageSize: Int!
    totalItems: Int!
    totalPages: Int!
    hasNext: Boolean!
    hasPrev: Boolean!
  }

  type BlogsResult {
    blogs: [Blog!]!
    pagination: PaginationInfo!
    totalCount: Int!
  }

  type CommentsResult {
    comments: [Comment!]!
    pagination: PaginationInfo!
    totalCount: Int!
  }

  type SearchResult {
    blogs: [Blog!]!
    users: [User!]!
    pagination: PaginationInfo!
  }

  type UserProfile {
    user: User!
    blogs: [Blog!]!
    followerCount: Int!
    followingCount: Int!
    totalBlogViews: Int!
  }

  type TrendingBlog {
    blog: Blog!
    views: Int!
    likes: Int!
    comments: Int!
  }

  type Query {
    # Blog Queries
    blogs(
      search: String
      sort: String
      page: Int
      limit: Int
      status: String
      category: String
      tag: String
      isFeatured: Boolean
    ): BlogsResult!

    blog(id: ID!): Blog
    blogBySlug(slug: String!): Blog
    
    # Search
    search(query: String!, page: Int, limit: Int): SearchResult!
    
    # Analytics
    blogAnalytics(blogId: ID!): BlogAnalytics
    trendingBlogs(limit: Int): [TrendingBlog!]!
    mostLikedBlogs(limit: Int): [Blog!]!
    
    # User Queries
    user(id: ID!): UserProfile
    userByEmail(email: String!): User
    me: User
    searchUsers(query: String!, limit: Int): [User!]!
    
    # Comments
    blogComments(blogId: ID!, page: Int, limit: Int): CommentsResult!
    comment(id: ID!): Comment
    
    # Categories & Tags
    categories: [String!]!
    tags(limit: Int): [TagStat!]!
  }

  type TagStat {
    tag: String!
    count: Int!
  }

  type Mutation {
    # Blog Mutations
    createBlog(
      title: String!
      body: String!
      excerpt: String
      category: String
      tags: [String]
      metaDescription: String
      status: String
    ): Blog

    updateBlog(
      id: ID!
      title: String
      body: String
      excerpt: String
      category: String
      tags: [String]
      status: String
    ): Blog

    deleteBlog(id: ID!): Boolean

    likeBlog(blogId: ID!): Blog
    unlikeBlog(blogId: ID!): Blog

    # Comment Mutations
    createComment(
      blogId: ID!
      content: String!
      parentCommentId: ID
    ): Comment

    updateComment(
      id: ID!
      content: String!
    ): Comment

    deleteComment(id: ID!): Boolean

    likeComment(commentId: ID!): Comment

    # User Mutations
    updateProfile(
      fullName: String
      bio: String
      website: String
      location: String
    ): User

    changePassword(
      currentPassword: String!
      newPassword: String!
    ): Boolean

    followUser(userId: ID!): Boolean
    unfollowUser(userId: ID!): Boolean
  }
`);

/**
 * Resolver functions for GraphQL queries and mutations
 */
const root = {
  // ==================== BLOG QUERIES ====================
  
  blogs: async ({ search, sort = "newest", page = 1, limit = 9, status, category, tag, isFeatured }) => {
    try {
      const filter = {
        isDeleted: false,
        status: status || "published"
      };

      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: "i" } },
          { body: { $regex: search, $options: "i" } },
          { excerpt: { $regex: search, $options: "i" } }
        ];
      }

      if (category) {
        filter.category = category;
      }

      if (tag) {
        filter.tags = { $in: [tag] };
      }

      if (isFeatured !== undefined) {
        filter.isFeatured = isFeatured;
      }

      const sortMap = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        title: { title: 1 },
        trending: { viewCount: -1 },
        mostLiked: { "likes.length": -1 }
      };

      const sortOption = sortMap[sort] || sortMap.newest;
      const pageNum = Math.max(1, page);
      const limitNum = Math.min(100, limit);
      const skip = (pageNum - 1) * limitNum;

      const blogs = await Blog.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .populate("createdBy", "fullName profileImageURL email")
        .lean();

      const totalCount = await Blog.countDocuments(filter);

      return {
        blogs,
        pagination: {
          currentPage: pageNum,
          pageSize: limitNum,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
          hasNext: pageNum < Math.ceil(totalCount / limitNum),
          hasPrev: pageNum > 1
        },
        totalCount
      };
    } catch (error) {
      console.error("GraphQL blogs query error:", error);
      return { blogs: [], pagination: {}, totalCount: 0 };
    }
  },

  blog: async ({ id }) => {
    try {
      return await Blog.findById(id)
        .notDeleted()
        .populate("createdBy", "fullName profileImageURL bio email website")
        .lean();
    } catch (error) {
      console.error("GraphQL blog query error:", error);
      return null;
    }
  },

  blogBySlug: async ({ slug }) => {
    try {
      return await Blog.findOne({ slug, isDeleted: false })
        .populate("createdBy", "fullName profileImageURL bio email")
        .lean();
    } catch (error) {
      console.error("GraphQL blogBySlug error:", error);
      return null;
    }
  },

  // ==================== SEARCH QUERIES ====================

  search: async ({ query, page = 1, limit = 10 }) => {
    try {
      const searchRegex = { $regex: query, $options: "i" };
      const pageNum = Math.max(1, page);
      const limitNum = Math.min(100, limit);
      const skip = (pageNum - 1) * limitNum;

      const [blogs, users, totalBlogs] = await Promise.all([
        Blog.find({
          $or: [
            { title: searchRegex },
            { body: searchRegex },
            { excerpt: searchRegex }
          ],
          isDeleted: false,
          status: "published"
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate("createdBy", "fullName profileImageURL")
          .lean(),
        
        User.find({
          $or: [
            { fullName: searchRegex },
            { email: searchRegex },
            { bio: searchRegex }
          ]
        })
          .select("fullName profileImageURL bio")
          .limit(limitNum)
          .lean(),
        
        Blog.countDocuments({
          $or: [
            { title: searchRegex },
            { body: searchRegex },
            { excerpt: searchRegex }
          ],
          isDeleted: false,
          status: "published"
        })
      ]);

      return {
        blogs,
        users,
        pagination: {
          currentPage: pageNum,
          pageSize: limitNum,
          totalItems: totalBlogs,
          totalPages: Math.ceil(totalBlogs / limitNum),
          hasNext: pageNum < Math.ceil(totalBlogs / limitNum),
          hasPrev: pageNum > 1
        }
      };
    } catch (error) {
      console.error("GraphQL search error:", error);
      return { blogs: [], users: [], pagination: {} };
    }
  },

  // ==================== ANALYTICS QUERIES ====================

  blogAnalytics: async ({ blogId }) => {
    try {
      return await BlogAnalytics.findOne({ blog: blogId })
        .populate("blog")
        .populate("author", "fullName profileImageURL")
        .lean();
    } catch (error) {
      console.error("GraphQL blogAnalytics error:", error);
      return null;
    }
  },

  trendingBlogs: async ({ limit = 5 }) => {
    try {
      const blogs = await Blog.find({
        isDeleted: false,
        status: "published"
      })
        .sort({ viewCount: -1 })
        .limit(Math.min(limit, 50))
        .populate("createdBy", "fullName profileImageURL")
        .lean();

      return blogs.map(blog => ({
        blog,
        views: blog.viewCount,
        likes: blog.likes.length,
        comments: 0 // Will need a commentCount field in Blog model
      }));
    } catch (error) {
      console.error("GraphQL trendingBlogs error:", error);
      return [];
    }
  },

  mostLikedBlogs: async ({ limit = 5 }) => {
    try {
      return await Blog.find({
        isDeleted: false,
        status: "published"
      })
        .sort({ "likes": -1 })
        .limit(Math.min(limit, 50))
        .populate("createdBy", "fullName profileImageURL")
        .lean();
    } catch (error) {
      console.error("GraphQL mostLikedBlogs error:", error);
      return [];
    }
  },

  // ==================== USER QUERIES ====================

  user: async ({ id }) => {
    try {
      const user = await User.findById(id)
        .populate("followers", "fullName profileImageURL")
        .populate("following", "fullName profileImageURL")
        .lean();

      if (!user) return null;

      const blogs = await Blog.find({
        createdBy: id,
        isDeleted: false,
        status: "published"
      }).lean();

      const totalBlogViews = blogs.reduce((sum, blog) => sum + blog.viewCount, 0);

      return {
        user: {
          ...user,
          followerCount: user.followers.length,
          followingCount: user.following.length
        },
        blogs,
        followerCount: user.followers.length,
        followingCount: user.following.length,
        totalBlogViews
      };
    } catch (error) {
      console.error("GraphQL user query error:", error);
      return null;
    }
  },

  userByEmail: async ({ email }) => {
    try {
      return await User.findOne({ email })
        .select("fullName profileImageURL bio email role")
        .lean();
    } catch (error) {
      console.error("GraphQL userByEmail error:", error);
      return null;
    }
  },

  me: (args, context) => {
    return context.user || null;
  },

  searchUsers: async ({ query, limit = 10 }) => {
    try {
      return await User.find({
        $or: [
          { fullName: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } }
        ]
      })
        .select("fullName profileImageURL bio email")
        .limit(Math.min(limit, 50))
        .lean();
    } catch (error) {
      console.error("GraphQL searchUsers error:", error);
      return [];
    }
  },

  // ==================== COMMENT QUERIES ====================

  blogComments: async ({ blogId, page = 1, limit = 10 }) => {
    try {
      const pageNum = Math.max(1, page);
      const limitNum = Math.min(100, limit);
      const skip = (pageNum - 1) * limitNum;

      const comments = await Comment.find({
        blog: blogId,
        isDeleted: false,
        parentComment: null
      })
        .populate("author", "fullName profileImageURL")
        .populate({
          path: "replies",
          populate: { path: "author", select: "fullName profileImageURL" }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalCount = await Comment.countDocuments({
        blog: blogId,
        isDeleted: false,
        parentComment: null
      });

      return {
        comments,
        pagination: {
          currentPage: pageNum,
          pageSize: limitNum,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
          hasNext: pageNum < Math.ceil(totalCount / limitNum),
          hasPrev: pageNum > 1
        },
        totalCount
      };
    } catch (error) {
      console.error("GraphQL blogComments error:", error);
      return { comments: [], pagination: {}, totalCount: 0 };
    }
  },

  comment: async ({ id }) => {
    try {
      return await Comment.findById(id)
        .notDeleted()
        .populate("author", "fullName profileImageURL")
        .populate("replies")
        .lean();
    } catch (error) {
      console.error("GraphQL comment error:", error);
      return null;
    }
  },

  // ==================== CATEGORY & TAG QUERIES ====================

  categories: async () => {
    try {
      const categories = await Blog.distinct("category", {
        isDeleted: false,
        status: "published"
      });
      return categories || [];
    } catch (error) {
      console.error("GraphQL categories error:", error);
      return [];
    }
  },

  tags: async ({ limit = 20 }) => {
    try {
      const blogs = await Blog.find({
        isDeleted: false,
        status: "published"
      })
        .select("tags")
        .lean();

      const tagCount = {};
      blogs.forEach(blog => {
        blog.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      });

      return Object.entries(tagCount)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, Math.min(limit, 100));
    } catch (error) {
      console.error("GraphQL tags error:", error);
      return [];
    }
  }
};

module.exports = { schema, root };
