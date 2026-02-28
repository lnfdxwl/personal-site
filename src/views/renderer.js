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
        * {
            scroll-behavior: smooth;
        }
        body {
            padding-top: 2rem;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
        }
        .hero-section {
            text-align: center;
            padding: 1rem 0;
            margin-bottom: 1.5rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
            position: relative;
            overflow: hidden;
        }
        .hero-section::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%);
            animation: pulse 8s ease-in-out infinite;
        }
        .hero-section::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            animation: shine 3s ease-in-out infinite;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.5; }
            50% { transform: scale(1.3) rotate(180deg); opacity: 1; }
        }
        @keyframes shine {
            0% { left: -100%; }
            50%, 100% { left: 100%; }
        }
        .hero-section h1 {
            position: relative;
            z-index: 1;
            font-size: 1.6rem;
            margin-bottom: 0.2rem;
            margin-top: 0;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
            font-weight: 700;
        }
        .hero-section p {
            position: relative;
            z-index: 1;
            font-size: 0.85rem;
            opacity: 0.95;
            margin: 0;
        }
        .nav-pills {
            display: flex;
            justify-content: center;
            gap: 0.8rem;
            margin: 1.2rem 0 1.8rem 0;
            flex-wrap: wrap;
        }
        .nav-pills a {
            padding: 0.5rem 1.3rem;
            background: white;
            color: #333;
            border-radius: 50px;
            box-shadow: 0 3px 12px rgba(0,0,0,0.1);
            text-decoration: none;
            font-weight: 600;
            font-size: 0.95rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }
        .nav-pills a::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.2), transparent);
            transition: left 0.5s;
        }
        .nav-pills a:hover::before {
            left: 100%;
        }
        .nav-pills a:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }
        .gallery-item {
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: white;
        }
        .gallery-item:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 12px 35px rgba(0,0,0,0.2);
        }
        .gallery-item img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            display: block;
            transition: transform 0.3s;
        }
        .gallery-item:hover img {
            transform: scale(1.1);
        }
        .stats-card {
            background: white;
            padding: 2rem;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            border-left: 5px solid #764ba2;
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
        }
        .stats-card::after {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(118, 75, 162, 0.05) 0%, transparent 70%);
        }
        .stats-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 30px rgba(118, 75, 162, 0.15);
        }
        .highlight-number {
            font-size: 3rem;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        article.markdown-body {
            background: white;
            padding: 2.5rem;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            transition: box-shadow 0.3s;
        }
        article.markdown-body:hover {
            box-shadow: 0 8px 35px rgba(0,0,0,0.12);
        }
        /* 美化滚动条 */
        ::-webkit-scrollbar {
            width: 10px;
        }
        ::-webkit-scrollbar-track {
            background: #f1f1f1;
        }
        ::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 5px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #764ba2;
        }
        /* Markdown 内容优化 */
        .markdown-body h1, .markdown-body h2, .markdown-body h3 {
            position: relative;
            padding-left: 1rem;
        }
        .markdown-body h1::before, .markdown-body h2::before, .markdown-body h3::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 70%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 2px;
        }
        .markdown-body a {
            color: #667eea;
            text-decoration: none;
            border-bottom: 2px solid transparent;
            transition: border-color 0.3s;
        }
        .markdown-body a:hover {
            border-bottom-color: #667eea;
        }
        .markdown-body code {
            background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
            padding: 0.2rem 0.5rem;
            border-radius: 5px;
            font-size: 0.9em;
        }
        .markdown-body blockquote {
            border-left: 4px solid #667eea;
            background: linear-gradient(90deg, rgba(102, 126, 234, 0.05) 0%, transparent 100%);
            padding: 1rem 1.5rem;
            margin: 1rem 0;
            border-radius: 0 8px 8px 0;
        }
        /* 加载动画 */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        main.container {
            animation: fadeIn 0.6s ease-out;
        }

        /* 响应式设计 - 移动端适配 */
        @media (max-width: 768px) {
            body {
                padding-top: 1rem;
            }
            .hero-section {
                padding: 2rem 0;
                border-radius: 10px;
            }
            .hero-section h1 {
                font-size: 1.8rem;
            }
            .nav-pills {
                gap: 0.5rem;
                margin: 1.5rem 0;
            }
            .nav-pills a {
                padding: 0.5rem 1rem;
                font-size: 0.9rem;
            }
            .stats-card {
                padding: 1.5rem;
            }
            .highlight-number {
                font-size: 2.5rem;
            }
            article.markdown-body {
                padding: 1.5rem;
            }
            .gallery-grid {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 1rem;
            }
            #backToTop {
                bottom: 20px;
                right: 20px;
                width: 45px;
                height: 45px;
                font-size: 1.3rem;
            }
        }

        /* 打印样式优化 */
        @media print {
            .hero-section, .nav-pills, footer, #backToTop {
                display: none !important;
            }
            body {
                background: white !important;
            }
            article.markdown-body {
                box-shadow: none !important;
            }
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

    <footer style="margin-top: 4rem; padding: 2rem 0; text-align: center; color: #6c7a89; font-size: 0.9rem;">
        <div class="container">
            <p style="margin-bottom: 0.5rem;">
                <strong style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">LifeOS v3.0</strong>
            </p>
            <p style="margin: 0;">
                Made with ❤️ by zzy (赵泽阳) · Powered by OpenClaw & Mianzi
            </p>
            <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #b2bec3;">
                Running on MacBook Pro · Served via Tailscale
            </p>
        </div>
    </footer>

    <!-- 返回顶部按钮 -->
    <button id="backToTop" style="position: fixed; bottom: 30px; right: 30px; width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; font-size: 1.5rem; cursor: pointer; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); opacity: 0; transition: all 0.3s; z-index: 1000; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        ↑
    </button>

    <script>
        // Mermaid 图表渲染
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

            // 返回顶部按钮
            const backToTop = document.getElementById('backToTop');
            window.addEventListener('scroll', () => {
                if (window.scrollY > 300) {
                    backToTop.style.opacity = '1';
                    backToTop.style.pointerEvents = 'auto';
                } else {
                    backToTop.style.opacity = '0';
                    backToTop.style.pointerEvents = 'none';
                }
            });
            backToTop.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // 图片懒加载优化 - 添加加载状态
            const images = document.querySelectorAll('img[loading="lazy"]');
            images.forEach(img => {
                img.style.transition = 'opacity 0.3s';
                img.style.opacity = '0';
                img.addEventListener('load', () => {
                    img.style.opacity = '1';
                });
            });

            // 添加键盘快捷键支持
            document.addEventListener('keydown', (e) => {
                // 按 Home 键返回顶部
                if (e.key === 'Home') {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                // 按 End 键滚动到底部
                if (e.key === 'End') {
                    e.preventDefault();
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }
            });

            // 性能监控 - 在控制台显示页面加载时间
            if (window.performance) {
                const perfData = window.performance.timing;
                const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                console.log('🚀 LifeOS 页面加载时间:', pageLoadTime + 'ms');
            }
        });
    </script>
</body>
</html>
    `;
}

module.exports = { renderPage };
