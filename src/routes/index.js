/**
 * 路由注册器
 * 集中管理所有路由模块
 */
function registerRoutes(app) {
    const homeRouter = require('./home');
    const travelRouter = require('./travel');
    const galleryRouter = require('./gallery');
    const photosApiRouter = require('./api/photos');

    // 页面路由
    app.use('/', homeRouter);
    app.use('/travel', travelRouter);
    app.use('/gallery', galleryRouter);

    // API路由
    app.use('/api/photos', photosApiRouter);

    // 静态图片服务 (兼容旧路径)
    app.use('/photos', photosApiRouter);

    // 404处理
    app.use((req, res) => {
        res.status(404).json({
            status: 'error',
            message: '页面未找到'
        });
    });
}

module.exports = registerRoutes;
