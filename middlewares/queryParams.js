// middlewares/queryParams.js

/**
 * Enhanced Query Parameter Handler
 * Validates and sanitizes query parameters across all routes
 * Supports filtering, sorting, pagination, and search
 */
const queryHandler = (req, res, next) => {
    try {
        // Extract all query parameters
        const {
            search = '',
            sort = 'newest',
            page = '1',
            limit = '9',
            status = '',
            category = '',
            tag = '',
            author = '',
            dateFrom = '',
            dateTo = '',
            isFeatured = ''
        } = req.query;

        // Validate and sanitize search term
        const sanitizeSearch = (str) => {
            return String(str)
                .trim()
                .substring(0, 100) // Limit length
                .replace(/[<>]/g, ''); // Remove dangerous chars
        };

        // Validate sort option
        const validSortOptions = ['newest', 'oldest', 'title', 'trending', 'popular', 'mostLiked', 'mostCommented'];
        const validSort = validSortOptions.includes(sort) ? sort : 'newest';

        // Validate pagination
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 9)); // Max 100 items per page

        // Validate status
        const validStatus = ['draft', 'published', ''];
        const validStatusFilter = validStatus.includes(status) ? status : '';

        // Validate category
        const validCategory = category ? String(category).trim().substring(0, 50) : '';

        // Validate boolean flag
        const parseBooleanParam = (param) => {
            if (param === '' || param === undefined) return '';
            return param === 'true' || param === '1';
        };

        // Store normalized query parameters in request object
        req.queryParams = {
            search: sanitizeSearch(search),
            sort: validSort,
            page: pageNum,
            limit: limitNum,
            status: validStatusFilter,
            category: validCategory,
            tag: tag ? String(tag).trim().substring(0, 50) : '',
            author: author ? String(author).trim() : '',
            dateFrom: dateFrom ? new Date(dateFrom) : null,
            dateTo: dateTo ? new Date(dateTo) : null,
            isFeatured: parseBooleanParam(isFeatured),
            skip: (pageNum - 1) * limitNum
        };

        // Add helper methods to queryParams for easier use in routes
        req.queryParams.getSortObject = function() {
            const sortMap = {
                'newest': { createdAt: -1 },
                'oldest': { createdAt: 1 },
                'title': { title: 1 },
                'trending': { viewCount: -1 },
                'popular': { 'likes': -1 },
                'mostLiked': { 'likes': -1 },
                'mostCommented': { 'commentCount': -1 }
            };
            return sortMap[this.sort] || { createdAt: -1 };
        };

        // Helper method to build MongoDB filter
        req.queryParams.getFilter = function(baseFilter = {}) {
            const filter = { ...baseFilter };

            if (this.search) {
                filter.$or = [
                    { title: { $regex: this.search, $options: 'i' } },
                    { body: { $regex: this.search, $options: 'i' } },
                    { excerpt: { $regex: this.search, $options: 'i' } }
                ];
            }

            if (this.status) {
                filter.status = this.status;
            }

            if (this.category) {
                filter.category = this.category;
            }

            if (this.tag) {
                filter.tags = { $in: [this.tag] };
            }

            if (this.author) {
                filter.createdBy = this.author;
            }

            if (this.isFeatured !== '') {
                filter.isFeatured = this.isFeatured;
            }

            // Date range filtering
            if (this.dateFrom || this.dateTo) {
                filter.createdAt = {};
                if (this.dateFrom && !isNaN(this.dateFrom.getTime())) {
                    filter.createdAt.$gte = this.dateFrom;
                }
                if (this.dateTo && !isNaN(this.dateTo.getTime())) {
                    filter.createdAt.$lte = this.dateTo;
                }
            }

            return filter;
        };

        // Helper method for pagination info
        req.queryParams.getPaginationInfo = function(total) {
            return {
                currentPage: this.page,
                pageSize: this.limit,
                total: total,
                totalPages: Math.ceil(total / this.limit),
                hasNext: this.page < Math.ceil(total / this.limit),
                hasPrev: this.page > 1
            };
        };

        next();
    } catch (err) {
        console.error('Query Parameter Handler Error:', err);
        // Fallback to safe defaults
        req.queryParams = {
            search: '',
            sort: 'newest',
            page: 1,
            limit: 9,
            status: '',
            category: '',
            tag: '',
            author: '',
            dateFrom: null,
            dateTo: null,
            isFeatured: '',
            skip: 0,
            getSortObject: function() { return { createdAt: -1 }; },
            getFilter: function(baseFilter) { return baseFilter || {}; },
            getPaginationInfo: function(total) {
                return {
                    currentPage: 1,
                    pageSize: 9,
                    total: total,
                    totalPages: Math.ceil(total / 9),
                    hasNext: total > 9,
                    hasPrev: false
                };
            }
        };
        next();
    }
};

module.exports = { queryHandler };
