require('dotenv').config();
const app = require('./src/app');
const { initDatabase } = require('./src/data/db');
const config = require('./src/config');

// 全局错误处理
process.on('uncaughtException', (err) => {
    console.error('[FATAL] 未捕获的异常:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] 未处理的Promise拒绝:', reason);
    process.exit(1);
});

// 启动服务器
async function start() {
    try {
        // 初始化数据库
        await initDatabase();

        // 启动HTTP服务器
        app.listen(config.port, config.host, () => {
            console.log(`🚀 LifeOS v3.0 运行于 http://${config.host}:${config.port}/`);
            console.log(`📊 环境: ${config.nodeEnv}`);
        });
    } catch (error) {
        console.error('❌ 启动失败:', error);
        process.exit(1);
    }
}

start();
