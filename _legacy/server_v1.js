const http = require('http');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// --- 防崩卫士 (全局异常捕获) ---
process.on('uncaughtException', (err) => {
    console.error('💥 [CRITICAL ERROR] 未捕获的异常:', err);
    // 不退出进程，只是记录错误
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 [CRITICAL ERROR] 未处理的 Promise 拒绝:', reason);
});

const PORT = 8080;
const SITE_DIR = __dirname;

// 简单的 Markdown 渲染页模板
const renderPage = (title, content) => `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - zzy的小站</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.2.0/github-markdown.min.css">
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        body { background: #f6f8fa; padding: 20px; font-family: sans-serif; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .nav { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
        .nav a { margin-right: 15px; text-decoration: none; color: #0366d6; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="nav">
            <a href="/">🏠 首页</a>
            <a href="/travel">🌍 旅行攻略</a>
            <a href="/gallery">📸 相册</a>
        </div>
        <article class="markdown-body">
            ${content}
        </article>
    </div>
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            const mermaidBlocks = document.querySelectorAll('code.language-mermaid');
            mermaidBlocks.forEach(block => {
                const content = block.textContent;
                const pre = block.parentElement;
                const div = document.createElement('div');
                div.className = 'mermaid';
                div.textContent = content;
                div.style.textAlign = 'center';
                pre.parentNode.replaceChild(div, pre);
            });
            mermaid.initialize({ startOnLoad: true, theme: 'default' });
        });
    </script>
</body>
</html>
`;

// 相册页面生成器
const renderGallery = (images) => {
    const imgHtml = images.map(img => `
        <div style="break-inside: avoid; margin-bottom: 15px;">
            <a href="/images/${img}" target="_blank">
                <img src="/images/${img}" style="width: 100%; border-radius: 6px; display: block;" loading="lazy">
            </a>
            <div style="font-size: 12px; color: #666; margin-top: 5px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${img}</div>
        </div>
    `).join('');
    
    return renderPage('本地相册', `
        <h1>📸 本地相册</h1>
        <p>存储在 <code>~/.openclaw/media/inbound</code> 的图片</p>
        <div style="column-count: 3; column-gap: 15px;">
            ${imgHtml || '<p>暂无图片</p>'}
        </div>
        
        <div style="margin-top: 40px; padding: 20px; background: #f0f4f8; border-radius: 8px;">
            <h3>📤 上传新照片</h3>
            <form action="/upload" method="post" enctype="multipart/form-data">
                <input type="file" name="image" accept="image/*" required>
                <button type="submit" style="background: #0366d6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">上传</button>
            </form>
        </div>
    `);
};

const server = http.createServer((req, res) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    // 1. 首页
    if (req.url === '/') {
        fs.readFile(path.join(SITE_DIR, 'index.html'), 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }

    // 2. 旅行攻略 (列表 & 内容)
    if (req.url.startsWith('/travel')) {
        const urlParts = req.url.split('/');
        const slug = urlParts[2]; // /travel/xxx -> xxx

        const travelDir = path.join(SITE_DIR, 'travel');

        // A. 列表页: /travel
        if (!slug || slug === '') {
            fs.readdir(travelDir, (err, files) => {
                if (err) {
                    // 如果目录不存在，尝试创建
                    if (err.code === 'ENOENT') {
                        fs.mkdirSync(travelDir);
                        files = [];
                    } else {
                        res.writeHead(500);
                        res.end('Error reading travel directory');
                        return;
                    }
                }
                
                const mdFiles = files.filter(f => f.endsWith('.md'));
                const listHtml = mdFiles.map(f => {
                    const name = f.replace('.md', '');
                    // 尝试读取文件第一行作为标题，或者直接用文件名
                    const content = fs.readFileSync(path.join(travelDir, f), 'utf8');
                    const firstLine = content.split('\n')[0].replace('# ', '').trim();
                    const title = firstLine || name;
                    return `<li><a href="/travel/${name}" style="font-size: 18px; line-height: 2;">${title}</a></li>`;
                }).join('');

                const content = `
                    <h1>🌍 旅行攻略目录</h1>
                    <p>记录每一次出发的记忆。</p>
                    <hr>
                    <ul>${listHtml || '<li>暂无攻略，快去写一篇吧！</li>'}</ul>
                `;
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(renderPage('旅行攻略', content));
            });
            return;
        }

        // B. 内容页: /travel/xxx
        const filePath = path.join(travelDir, slug + '.md');
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Travel guide not found');
                return;
            }
            const htmlContent = marked.parse(data);
            // 简单的标题提取
            const title = data.split('\n')[0].replace('# ', '').trim() || slug;
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(renderPage(title, htmlContent));
        });
        return;
    }

    // 3. 相册页面
    if (req.url === '/gallery') {
        const imgDir = path.join(SITE_DIR, 'images');
        fs.readdir(imgDir, (err, files) => {
            if (err) {
                res.writeHead(500);
                res.end('Error reading image directory');
                return;
            }
            const images = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(renderGallery(images));
        });
        return;
    }

    // 4. 静态图片服务
    if (req.url.startsWith('/images/')) {
        const imgName = path.basename(req.url);
        const imgPath = path.join(SITE_DIR, 'images', imgName);
        fs.readFile(imgPath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Image not found');
                return;
            }
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

    // 5. 上传图片 (API)
    if (req.url === '/upload' && req.method === 'POST') {
        const formidable = require('formidable');
        const form = new formidable.IncomingForm();
        form.uploadDir = path.join(SITE_DIR, 'images');
        form.keepExtensions = true;
        
        form.parse(req, (err, fields, files) => {
            if (err) {
                res.writeHead(500);
                res.end('Upload failed');
                return;
            }
            res.writeHead(302, { 'Location': '/gallery' });
            res.end();
        });
        return;
    }

    // 6. 同步照片 API
    if (req.url === '/api/sync' && req.method === 'POST') {
        const { spawn } = require('child_process');
        const scriptPath = path.join(SITE_DIR, 'scripts', 'sync_photos.sh');
        
        // 实时输出日志
        res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked'
        });

        const child = spawn('/bin/bash', [scriptPath]);

        child.stdout.on('data', (data) => {
            res.write(data);
        });

        child.stderr.on('data', (data) => {
            res.write(`[ERR] ${data}`);
        });

        child.on('close', (code) => {
            res.write(`\n--- 同步结束 (退出码: ${code}) ---`);
            res.end();
        });

        return;
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}/`);
    console.log(`Access via Tailscale IP: http://100.x.y.z:${PORT}/`);
});
