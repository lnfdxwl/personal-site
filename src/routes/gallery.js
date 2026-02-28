const express = require('express');
const router = express.Router();
const { renderPage } = require('../views/renderer');
const { getDB } = require('../data/db');
const path = require('path');
const fs = require('fs');

/**
 * 图库页面
 */
router.get('/', async (req, res, next) => {
    try {
        const db = getDB();

        // 获取照片列表
        const photos = db.prepare(`
            SELECT * FROM photos
            ORDER BY taken_at DESC
            LIMIT 50
        `).all();

        // 获取Inbox统计
        const INBOX_DIR = path.join(__dirname, '../../data/photos/inbox');
        let inboxCount = 0;
        try {
            const files = fs.readdirSync(INBOX_DIR);
            inboxCount = files.filter(f => !f.startsWith('.')).length;
        } catch (e) {
            // Inbox目录不存在
        }

        const photosHtml = photos.map(p => `
            <div class="gallery-item" onclick="window.open('/photos/${p.path}', '_blank')" style="cursor: pointer;">
                <img src="/photos/${p.path}" alt="${p.filename}" loading="lazy">
                <div style="padding: 1rem; font-size: 0.9rem; color: #666; background: white;">
                    <div style="font-weight: 600; margin-bottom: 0.3rem;">${p.filename.substring(0, 20)}${p.filename.length > 20 ? '...' : ''}</div>
                    <div style="color: #6c7a89; font-size: 0.85rem;">📅 ${new Date(p.taken_at).toLocaleDateString('zh-CN', {year: 'numeric', month: 'long', day: 'numeric'})}</div>
                </div>
            </div>
        `).join('');

        const emptyState = `
            <div style="text-align: center; padding: 4rem 2rem; background: white; border-radius: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                <div style="font-size: 4rem; margin-bottom: 1rem;">📸</div>
                <h3 style="color: #5a6c7d; margin-bottom: 1rem;">还没有照片</h3>
                <p style="color: #6c7a89; margin-bottom: 2rem;">将照片放入 <code>data/photos/inbox</code> 文件夹，然后点击"开始整理"按钮</p>
                ${inboxCount > 0
                    ? `<button onclick="document.getElementById('actionPanel').style.display='block'; this.style.display='none';" role="button" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none;">⚙️ 打开管理面板 (${inboxCount} 张待整理)</button>`
                    : '<p style="color: #38d9a9; font-weight: 600;">✅ Inbox 也是空的，一切整洁</p>'
                }
            </div>
        `;

        const content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <div>
                    <h2 style="margin-bottom: 0.5rem;">🖼️ 我的影集</h2>
                    <p style="color: #5a6c7d; font-size: 0.9rem; margin: 0;">${photos.length} 张照片 ${inboxCount > 0 ? `· ${inboxCount} 张待整理` : ''}</p>
                </div>
                ${inboxCount > 0
                    ? `<button onclick="document.getElementById('actionPanel').style.display='block'; this.style.display='none';" role="button" class="contrast" style="margin: 0;">⚙️ 管理面板</button>`
                    : '<span style="color: #38d9a9; font-weight: 600; font-size: 1.1rem;">✅ 界面整洁</span>'
                }
            </div>

            <!-- 隐藏的管理面板 -->
            <div id="actionPanel" style="display:none; background: linear-gradient(135deg, #2d3436 0%, #1e272e 100%); color: #dfe6e9; padding: 2rem; border-radius: 15px; margin: 1.5rem 0; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                <h3 style="color: #fff; margin-bottom: 1rem;">🤖 智能整理助手</h3>
                <p style="margin-bottom: 0.5rem;">功能说明：</p>
                <ul style="margin-bottom: 1.5rem; color: #b2bec3;">
                    <li>📁 按拍摄日期自动归档照片</li>
                    <li>🗑️ 自动移除截图和重复照片</li>
                    <li>⚡ 提取 EXIF 信息并建立索引</li>
                </ul>
                <button onclick="startSync()" style="background: linear-gradient(135deg, #00b894 0%, #00cec9 100%); border: none; font-weight: 600;">🚀 开始整理</button>
                <button onclick="document.getElementById('actionPanel').style.display='none'" style="margin-left: 1rem; background: transparent; border: 1px solid #636e72;">取消</button>
            </div>

            <!-- 进度日志 -->
            <div id="logBox" style="display:none; background: #1e272e; color: #00cec9; padding: 1.5rem; border-radius: 15px; margin: 1.5rem 0; font-family: 'Monaco', 'Courier New', monospace; max-height: 300px; overflow-y: auto; box-shadow: inset 0 2px 10px rgba(0,0,0,0.3); font-size: 0.9rem; line-height: 1.6;"></div>

            <div class="gallery-grid">
                ${photos.length > 0 ? photosHtml : emptyState}
            </div>

            <script>
                async function startSync() {
                    const log = document.getElementById('logBox');
                    log.style.display = 'block';
                    log.innerText = '🐱 棉子准备开工...\\n';

                    try {
                        const resp = await fetch('/api/photos/sync', { method: 'POST' });
                        const reader = resp.body.getReader();
                        const decoder = new TextDecoder();

                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            log.innerText += decoder.decode(value);
                            log.scrollTop = log.scrollHeight;
                        }
                    } catch (e) {
                        log.innerText += '\\n❌ 连接错误: ' + e.message;
                    } finally {
                        setTimeout(() => location.reload(), 1500);
                    }
                }
            </script>
        `;

        res.send(renderPage('图库', content));
    } catch (error) {
        next(error);
    }
});

module.exports = router;
