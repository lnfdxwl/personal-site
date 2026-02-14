require('dotenv').config();

module.exports = {
    port: parseInt(process.env.PORT) || 8080,
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',

    db: {
        path: process.env.DB_PATH || './data/photos.db'
    },

    photos: {
        concurrency: parseInt(process.env.ORGANIZE_CONCURRENCY) || 5,
        screenshotPatterns: (process.env.SCREENSHOT_PATTERNS || 'screenshot,screen,屏幕快照').split(',')
    },

    cache: {
        ttl: parseInt(process.env.CACHE_TTL) || 300
    },

    log: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || './logs/app.log'
    }
};
