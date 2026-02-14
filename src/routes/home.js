const express = require('express');
const router = express.Router();
const { renderPage } = require('../views/renderer');
const { getDB } = require('../data/db');
const path = require('path');
const fs = require('fs');

/**
 * 首页 - Dashboard
 */
router.get('/', async (req, res, next) => {
    try {
        const db = getDB();

        // 获取照片统计
        const photoCount = db.prepare('SELECT COUNT(*) as count FROM photos').get().count;

        // 获取Inbox待处理数量
        const INBOX_DIR = path.join(__dirname, '../../data/photos/inbox');
        let inboxCount = 0;
        try {
            const files = fs.readdirSync(INBOX_DIR);
            inboxCount = files.filter(f => !f.startsWith('.')).length;
        } catch (e) {
            // Inbox目录不存在
        }

        // 仪表盘内容
        const content = `
            <h2>📊 系统概览</h2>
            <div class="grid" style="gap: 2rem; margin-top: 1.5rem;">
                <div class="stats-card">
                    <h3>🖼️ 图库规模</h3>
                    <div class="highlight-number">${photoCount}</div>
                    <p>已归档照片</p>
                </div>
                <div class="stats-card ${inboxCount > 0 ? 'alert' : ''}" style="${inboxCount > 0 ? 'border-left-color: #e74c3c;' : ''}">
                    <h3>📥 待处理区</h3>
                    <div class="highlight-number" style="${inboxCount > 0 ? 'color: #e74c3c;' : ''}">${inboxCount}</div>
                    <p>${inboxCount > 0 ? '有 <a href="/gallery" role="button" style="text-decoration: underline;">照片待整理</a>' : '整洁 ✅'}</p>
                </div>
            </div>

            <hr>

            <h2>🌍 最近的旅行</h2>
            <ul>
                <li><a href="/travel/vietnam">🇻🇳 北越特种兵攻略 (硬扛版)</a> <small>2026-02</small></li>
            </ul>

            <hr>

            <h2>🚀 LifeOS v3.0 新特性</h2>
            <ul>
                <li>✅ Express框架 + 模块化架构</li>
                <li>✅ SQLite数据库 + 高性能索引</li>
                <li>✅ 异步文件操作 + 并发处理</li>
                <li>✅ 统一错误处理 + 请求日志</li>
                <li>🔄 照片EXIF提取 (即将推出)</li>
                <li>🔄 全文搜索功能 (即将推出)</li>
            </ul>
        `;

        res.send(renderPage('Dashboard', content));
    } catch (error) {
        next(error);
    }
});

module.exports = router;
