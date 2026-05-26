// middlewares/security.js

/**
 * Enhanced Security Middleware
 * Implements best practices for web application security
 */

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

/**
 * Configure Helmet for HTTP security headers
 */
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:", "res.cloudinary.com"],
            connectSrc: ["'self'", "https:"],
            fontSrc: ["'self'", "cdn.jsdelivr.net"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
    },
    frameguard: {
        action: 'deny',
    },
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
    },
    permissionsPolicy: {
        features: {
            geolocation: ["'none'"],
            microphone: ["'none'"],
            camera: ["'none'"],
        },
    },
});

/**
 * Input sanitization middleware
 * Prevents MongoDB injection attacks
 */
const inputSanitization = mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.warn(`Sanitized key: ${key}`);
    },
});

/**
 * XSS Protection middleware
 */
const xssProtection = xss();

/**
 * HTTP Parameter Pollution protection
 */
const parameterPollutionProtection = hpp({
    whitelist: [
        'search',
        'sort',
        'page',
        'limit',
        'status',
        'category',
        'tag',
        'author',
        'dateFrom',
        'dateTo',
        'isFeatured',
        'skip'
    ]
});

/**
 * CORS Configuration
 */
const corsConfig = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8000', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400 // 24 hours
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Enable XSS filtering in older browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Enforce HTTPS
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Disable browser caching for sensitive pages
    if (req.path.includes('/user/profile') || req.path.includes('/admin')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    
    // Remove powered by header
    res.removeHeader('X-Powered-By');
    
    next();
};

/**
 * Request logging for security audits
 */
const securityAuditLog = (req, res, next) => {
    const sensitiveRoutes = ['/user/signin', '/user/signup', '/user/forgot-password', '/admin'];
    
    if (sensitiveRoutes.some(route => req.path.includes(route))) {
        console.log(`[SECURITY AUDIT] ${new Date().toISOString()} - Method: ${req.method}, Path: ${req.path}, IP: ${req.ip}`);
    }
    
    next();
};

module.exports = {
    helmetConfig,
    inputSanitization,
    xssProtection,
    parameterPollutionProtection,
    corsConfig,
    securityHeaders,
    securityAuditLog
};
