const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

/**
 * 获取照片统计信息
 */
router.get('/stats', async (req, res, next) => {
    try {
        const { getDB } = require('../../data/db');
        const db = getDB();

        const libraryCount = db.prepare('SELECT COUNT(*) as count FROM photos').get().count;

        // 获取Inbox数量
        const INBOX_DIR = path.join(__dirname, '../../../data/photos/inbox');
        let inboxCount = 0;
        try {
            const files = fs.readdirSync(INBOX_DIR);
            inboxCount = files.filter(f => !f.startsWith('.')).length;
        } catch (e) {
            // Inbox目录不存在
        }

        res.json({
            inbox_count: inboxCount,
            library_count: libraryCount,
            last_updated: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 触发照片同步 (流式响应)
 */
router.post('/sync', async (req, res, next) => {
    try {
        // 设置流式响应
        res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked'
        });

        const writeLine = (text) => res.write(text + '\n');

        writeLine('🐱 棉子开始整理 Inbox...');

        // 动态加载photo-manager (避免循环依赖)
        const photoManager = require('../../services/photo-manager');

        const result = await photoManager.organizeInbox((current, total, filename) => {
            writeLine(`[${current}/${total}] ${filename}...`);
        });

        writeLine('\n--- 完成 ---');
        writeLine(`✅ 处理: ${result.processed}`);
        writeLine(`⏭️ 跳过: ${result.skipped}`);
        writeLine(`❌ 失败: ${result.failed}`);
        writeLine('\n刷新页面查看效果！');

        res.end();
    } catch (error) {
        console.error('同步失败:', error);
        res.write(`\n❌ 严重错误: ${error.message}\n`);
        res.end();
    }
});

/**
 * 静态图片服务
 */
router.get('/:year/:month/:filename', (req, res, next) => {
    const { year, month, filename } = req.params;
    const LIBRARY_DIR = path.join(__dirname, '../../../data/photos/library');
    const filePath = path.join(LIBRARY_DIR, year, month, filename);

    // 安全检查
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(LIBRARY_DIR)) {
        return res.status(403).json({ error: '非法路径' });
    }

    res.sendFile(filePath, (err) => {
        if (err) {
            next(err);
        }
    });
});

module.exports = router;
