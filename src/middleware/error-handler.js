/**
 * 自定义应用错误类
 */
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 统一错误处理中间件
 */
function errorHandler(err, req, res, next) {
    const { statusCode = 500, message, isOperational } = err;

    // 记录非预期错误
    if (!isOperational) {
        console.error('[ERROR] 非预期错误:', err);
    }

    // 开发环境返回详细错误
    if (process.env.NODE_ENV === 'development') {
        return res.status(statusCode).json({
            status: 'error',
            statusCode,
            message,
            stack: err.stack
        });
    }

    // 生产环境返回简化错误
    res.status(statusCode).json({
        status: 'error',
        message: isOperational ? message : '服务器内部错误'
    });
}

module.exports = errorHandler;
module.exports.AppError = AppError;
