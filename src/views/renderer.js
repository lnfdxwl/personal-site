const { marked } = require('marked');

/**
 * 渲染完整HTML页面
 * @param {string} title - 页面标题
 * @param {string} content - 页面内容
 * @param {string} customStyles - 自定义样式
 * @returns {string} 完整的HTML页面
 */
function renderPage(title, content, customStyles = '') {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - LifeOS</title>
    <!-- 引入 Pico.css: 现代极简风格 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css">
    <!-- Markdown 渲染 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.2.0/github-markdown.min.css">
    <!-- Mermaid 图表 -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>

    <style>
        /* 自定义美化 */
        body {
            padding-top: 2rem;
        }
        .hero-section {
            text-align: center;
            padding: 3rem 0;
            margin-bottom: 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
        }
        .nav-pills {
            display: flex;
            justify-content: center;
            gap: 1rem;
            margin: 2rem 0;
        }
        .nav-pills a {
            padding: 0.5rem 1.2rem;
            background: white;
            color: #333;
            border-radius: 50px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            text-decoration: none;
            font-weight: 500;
            transition: transform 0.2s;
        }
        .nav-pills a:hover {
            transform: translateY(-2px);
            background: #f0f0f0;
        }
        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }
        .gallery-item {
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .gallery-item:hover {
            transform: scale(1.02);
        }
        .gallery-item img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            display: block;
        }
        .stats-card {
            background: white;
            padding: 1.5rem;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            border-left: 5px solid #764ba2;
        }
        .highlight-number {
            font-size: 2.5rem;
            font-weight: bold;
            color: #764ba2;
        }
        ${customStyles}
    </style>
</head>
<body>
    <main class="container">

        <header class="hero-section">
            <h1>LifeOS</h1>
            <p><small>zzy 的数字生活空间 · 极简 · 数据驱动</small></p>
        </header>

        <nav class="nav-pills">
            <a href="/">🏠 控制台</a>
            <a href="/travel">🌍 旅行</a>
            <a href="/gallery">🖼️ 图库</a>
        </nav>

        <article class="markdown-body" style="background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
            ${content}
        </article>

    </main>

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
}

module.exports = { renderPage };
