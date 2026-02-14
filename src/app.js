const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const registerRoutes = require('./routes');
const errorHandler = require('./middleware/error-handler');
const logger = require('./middleware/logger');

const app = express();

// 安全中间件
app.use(helmet({
    contentSecurityPolicy: false, // Pico.css和Mermaid使用CDN
}));

// CORS配置
app.use(cors());

// 压缩响应
app.use(compression());

// 请求解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态资源
app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: '1d',
    etag: true
}));

// 请求日志
app.use(logger);

// 注册路由
registerRoutes(app);

// 错误处理 (必须放在最后)
app.use(errorHandler);

module.exports = app;
