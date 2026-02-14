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
            <div class="gallery-item">
                <img src="/photos/${p.path}" alt="${p.filename}" loading="lazy">
                <div style="padding: 0.8rem; font-size: 0.9rem; color: #666;">
                    ${new Date(p.taken_at).toLocaleDateString()} · ${p.filename.substring(0, 15)}...
                </div>
            </div>
        `).join('');

        const content = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2>🖼️ 我的影集</h2>
                ${inboxCount > 0
                    ? `<button onclick="document.getElementById('actionPanel').style.display='block'" role="button" class="contrast">⚙️ 管理面板 (${inboxCount} 张待理)</button>`
                    : '<span style="color: #38d9a9;">✅ 界面整洁</span>'
                }
            </div>

            <!-- 隐藏的管理面板 -->
            <div id="actionPanel" style="display:none; background: #2d3436; color: #dfe6e9; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
                <h3>🤖 自动整理助手</h3>
                <p>将 <code>Inbox</code> 中的照片按日期归档，自动移除截图、去重。</p>
                <button onclick="startSync()" style="margin-top: 0.5rem;">🚀 开始整理</button>
            </div>

            <!-- 进度日志 -->
            <div id="logBox" style="display:none; background: #1e272e; color: #00cec9; padding: 1rem; border-radius: 8px; margin: 1rem 0; font-family: monospace; max-height: 250px; overflow-y: auto;"></div>

            <div class="gallery-grid">
                ${photosHtml || '<p>暂无照片，去 Inbox 扔几张吧！</p>'}
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
