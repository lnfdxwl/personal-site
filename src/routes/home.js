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

        // 获取最近的照片
        let recentPhotos = [];
        try {
            recentPhotos = db.prepare('SELECT * FROM photos ORDER BY taken_at DESC LIMIT 6').all();
        } catch (e) {
            // 数据库可能还没有照片
        }

        // 仪表盘内容
        const content = `
            <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%); padding: 2rem; border-radius: 15px; margin-bottom: 2rem; border: 2px solid rgba(102, 126, 234, 0.1);">
                <h2 style="margin-bottom: 0.5rem;">👋 欢迎回来！</h2>
                <p style="color: #5a6c7d; margin: 0;">这是你的个人生活数据中心 · 让生活更有条理</p>
            </div>

            <h2>📊 数据概览</h2>
            <div class="grid" style="gap: 1.5rem; margin: 1.5rem 0 3rem 0;">
                <div class="stats-card" onclick="location.href='/gallery'" style="cursor: pointer;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;">🖼️ 图库</h3>
                        <span style="font-size: 2rem; opacity: 0.3;">📸</span>
                    </div>
                    <div class="highlight-number">${photoCount}</div>
                    <p style="color: #5a6c7d; margin: 0;">已归档照片</p>
                </div>
                <div class="stats-card ${inboxCount > 0 ? 'alert' : ''}" style="${inboxCount > 0 ? 'border-left-color: #e74c3c; cursor: pointer;' : ''}" ${inboxCount > 0 ? 'onclick="location.href=\'/gallery\'"' : ''}>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;">📥 待处理</h3>
                        <span style="font-size: 2rem; opacity: 0.3;">${inboxCount > 0 ? '⚠️' : '✅'}</span>
                    </div>
                    <div class="highlight-number" style="${inboxCount > 0 ? 'background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;' : ''}">${inboxCount}</div>
                    <p style="margin: 0;">${inboxCount > 0 ? '<span style="color: #e74c3c; font-weight: 600;">需要整理 →</span>' : '<span style="color: #38d9a9; font-weight: 600;">界面整洁 ✨</span>'}</p>
                </div>
                <div class="stats-card" onclick="location.href='/travel'" style="cursor: pointer;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;">🌍 旅行</h3>
                        <span style="font-size: 2rem; opacity: 0.3;">✈️</span>
                    </div>
                    <div class="highlight-number">1</div>
                    <p style="color: #5a6c7d; margin: 0;">篇游记</p>
                </div>
            </div>

            ${recentPhotos.length > 0 ? `
                <h2 style="margin-bottom: 1.5rem;">📸 最近的照片</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 3rem;">
                    ${recentPhotos.map(p => `
                        <div style="border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); transition: transform 0.3s; cursor: pointer;" onclick="window.open('/photos/${p.path}', '_blank')" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                            <img src="/photos/${p.path}" alt="${p.filename}" style="width: 100%; height: 150px; object-fit: cover; display: block;">
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <h2 style="margin-bottom: 1.5rem;">🌍 最近的旅行</h2>
            <div style="background: white; padding: 1.5rem; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); margin-bottom: 3rem; transition: all 0.3s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.12)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.08)'">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin: 0 0 0.5rem 0;"><a href="/travel/vietnam" style="color: #2c3e50; text-decoration: none;">🇻🇳 北越特种兵攻略 (硬扛版)</a></h3>
                        <p style="color: #6c7a89; margin: 0; font-size: 0.9rem;">河内 · 宁平 · 下龙湾 | 四日深度游</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #5a6c7d; font-size: 0.85rem; margin-bottom: 0.3rem;">📅 2026-02</div>
                        <a href="/travel/vietnam" role="button" style="margin: 0; font-size: 0.85rem; padding: 0.3rem 1rem;">查看 →</a>
                    </div>
                </div>
            </div>

            <details style="background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%); padding: 1.5rem; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 2rem;">
                <summary style="cursor: pointer; font-weight: 600; color: #2c3e50; font-size: 1.1rem;">🚀 LifeOS v3.0 技术栈</summary>
                <div style="margin-top: 1rem; padding-left: 1rem;">
                    <ul style="color: #5a6c7d; line-height: 2;">
                        <li><span style="color: #38d9a9;">✅</span> <strong>Express</strong> 框架 + 模块化架构</li>
                        <li><span style="color: #38d9a9;">✅</span> <strong>SQLite</strong> 数据库 + 高性能索引</li>
                        <li><span style="color: #38d9a9;">✅</span> 异步文件操作 + 并发处理</li>
                        <li><span style="color: #38d9a9;">✅</span> 统一错误处理 + 请求日志</li>
                        <li><span style="color: #667eea;">🔄</span> 照片 EXIF 提取 <small>(即将推出)</small></li>
                        <li><span style="color: #667eea;">🔄</span> 全文搜索功能 <small>(即将推出)</small></li>
                    </ul>
                </div>
            </details>

            <div style="text-align: center; padding: 2rem; background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%); border-radius: 15px; margin-top: 3rem;">
                <p style="color: #5a6c7d; margin: 0; font-size: 0.9rem;">💡 提示：点击统计卡片可以快速跳转到对应页面</p>
            </div>
        `;

        res.send(renderPage('Dashboard', content));
    } catch (error) {
        next(error);
    }
});

module.exports = router;
