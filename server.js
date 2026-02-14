const http = require('http');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// 引入核心模块
const photoManager = require('./core/photo_manager');
const { renderPage } = require('./core/renderer');

const PORT = 8080;
const SITE_DIR = __dirname;
const DATA_DIR = path.join(SITE_DIR, 'data');

// --- 防崩卫士 ---
process.on('uncaughtException', (err) => {
    console.error('💥 [CRITICAL ERROR] 未捕获的异常:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 [CRITICAL ERROR] 未处理的 Promise 拒绝:', reason);
});

const server = http.createServer((req, res) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    // --- 1. 首页 (Dashboard) ---
    if (req.url === '/') {
        try {
            const stats = photoManager.getStats();
            const countInbox = stats.inbox_count || 0; 
            const countLib = stats.library_count || 0;

            // 仪表盘内容
            const content = `
                <h2>📊 系统概览</h2>
                <div class="grid" style="gap: 2rem; margin-top: 1.5rem;">
                    <div class="stats-card">
                        <h3>🖼️ 图库规模</h3>
                        <div class="highlight-number">${countLib}</div>
                        <p>已归档照片</p>
                    </div>
                    <div class="stats-card ${countInbox > 0 ? 'alert' : ''}" style="${countInbox > 0 ? 'border-left-color: #e74c3c;' : ''}">
                        <h3>📥 待处理区</h3>
                        <div class="highlight-number" style="${countInbox > 0 ? 'color: #e74c3c;' : ''}">${countInbox}</div>
                        <p>${countInbox > 0 ? '有 <a href="/gallery" role="button" style="text-decoration: underline;">照片待整理</a>' : '整洁 ✅'}</p>
                    </div>
                </div>

                <hr>

                <h2>🌍 最近的旅行</h2>
                <ul>
                    <li><a href="/travel/vietnam">🇻🇳 北越特种兵攻略 (硬扛版)</a> <small>2026-02</small></li>
                </ul>
            `;
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(renderPage('Dashboard', content));
        } catch (e) {
            console.error(e);
            res.writeHead(500);
            res.end('Error');
        }
        return;
    }

    // --- 2. 旅行模块 --
    const mdDir = path.join(DATA_DIR, 'markdown');

    // A. 列表页
    if (req.url.startsWith('/travel')) {
        const urlParts = req.url.split('/');
        const slug = urlParts[2];

        if (!slug || slug === '') {
            // 列表
            fs.readdir(mdDir, (err, files) => {
                if (err) { res.writeHead(500); res.end('Error'); return; }
                const mdFiles = files.filter(f => f.endsWith('.md'));
                
                const cards = mdFiles.map(f => {
                    const content = fs.readFileSync(path.join(mdDir, f), 'utf8');
                    const title = content.split('\n')[0].replace('# ', '').trim();
                    const name = f.replace('.md', '');
                    return `
                        <article style="padding: 1.5rem; border: 1px solid #eee; border-radius: 8px; transition: transform 0.2s;">
                            <h3 style="margin-bottom: 0.5rem;">${title || name}</h3>
                            <small>📁 ${name}</small><br>
                            <a href="/travel/${name}" role="button" style="margin-top: 1rem;">查看详情</a>
                        </article>
                    `;
                }).join('');
                
                const content = `
                    <h2>🌍 足迹</h2>
                    <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">
                        ${cards}
                    </div>
                `;
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(renderPage('旅行列表', content));
            });
            return;
        }

        // B. 详情页
        const mdPath = path.join(mdDir, slug + '.md');
        fs.readFile(mdPath, 'utf8', (err, data) => {
            if (err) { res.writeHead(404); res.end('Not Found'); return; }
            const html = marked.parse(data);
            const title = data.split('\n')[0].replace('# ', '').trim();
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(renderPage(title, html));
        });
        return;
    }

    // --- 3. 图库模块 ---
    if (req.url === '/gallery') {
        try {
            const stats = photoManager.getStats();
            const photos = photoManager.getLibraryPhotos();

            const photosHtml = photos.map(p => `
                <div class="gallery-item">
                    <img src="${p.url}" alt="${p.name}" loading="lazy">
                    <div style="padding: 0.8rem; font-size: 0.9rem; color: #666;">
                        ${new Date(p.date).toLocaleDateString()} · ${p.name.substring(0, 15)}...
                    </div>
                </div>
            `).join('');

            const content = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2>🖼️ 我的影集</h2>
                    ${stats.inbox_count > 0 
                        ? `<button onclick="document.getElementById('actionPanel').style.display='block'" role="button" class="contrast">⚙️ 管理面板 (${stats.inbox_count} 张待理)</button>`
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
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(renderPage('图库', content));
        } catch (e) {
            console.error(e);
            res.writeHead(500);
            res.end('Error');
        }
        return;
    }

    // --- 4. API: 统计信息 ---
    if (req.url === '/api/photos/stats') {
        try {
            const stats = photoManager.getStats();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(stats));
        } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // --- 5. API: 整理 Inbox ---
    if (req.url === '/api/photos/sync' && req.method === 'POST') {
        res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked'
        });

        const writeLine = (text) => res.write(text + '\\n');

        writeLine('🐱 棉子开始整理 Inbox...');
        
        // 异步执行整理
        photoManager.organizeInbox((current, total, filename) => {
            writeLine(`[${current}/${total}] ${filename}...`);
        }).then(result => {
            writeLine(`\\n--- 完成 ---`);
            writeLine(`✅ 处理: ${result.processed}`);
            writeLine(`⏭️ 跳过: ${result.skipped}`);
            writeLine(`❌ 失败: ${result.failed}`);
            writeLine(`\\n刷新页面查看效果！`);
            res.end();
        }).catch(err => {
            writeLine(`❌ 严重错误: ${err.message}`);
            res.end();
        });
        return;
    }

    // --- 6. 静态图片服务 (新版: /photos) ---
    if (req.url.startsWith('/photos/')) {
        const relPath = req.url.substring('/photos/'.length); // 去掉前缀
        // 安全检查：防止 path traversal
        const safePath = path.normalize(relPath).replace(/^\\.\\./, '');
        const fullPath = path.join(DATA_DIR, 'photos/library', safePath);

        fs.readFile(fullPath, (err, data) => {
            if (err) { res.writeHead(404); res.end('Not Found'); return; }
            const ext = path.extname(fullPath).toLowerCase();
            const mime = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            }[ext] || 'application/octet-stream';
            
            res.writeHead(200, { 'Content-Type': mime });
            res.end(data);
        });
        return;
    }

    // --- 7. 兼容旧版图片路径 (/images) ---
    if (req.url.startsWith('/images/')) {
        const imgName = path.basename(req.url);
        const imgPath = path.join(SITE_DIR, 'images', imgName);
        fs.readFile(imgPath, (err, data) => {
            if (err) { res.writeHead(404); res.end('Image not found'); return; }
            const ext = path.extname(imgName).toLowerCase();
            const mime = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            }[ext] || 'application/octet-stream';
            
            res.writeHead(200, { 'Content-Type': mime });
            res.end(data);
        });
        return;
    }

    // --- 404 ---
    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 LifeOS v2.0 running at http://0.0.0.0:${PORT}/`);
});
