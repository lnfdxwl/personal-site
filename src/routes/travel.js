const express = require('express');
const router = express.Router();
const { marked } = require('marked');
const { renderPage } = require('../views/renderer');
const path = require('path');
const fs = require('fs').promises;

const MD_DIR = path.join(__dirname, '../../data/markdown');

/**
 * 旅行列表页
 */
router.get('/', async (req, res, next) => {
    try {
        const files = await fs.readdir(MD_DIR);
        const mdFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('.'));

        const cards = await Promise.all(mdFiles.map(async (file) => {
            const content = await fs.readFile(path.join(MD_DIR, file), 'utf8');
            const title = content.split('\n')[0].replace('# ', '').trim();
            const name = file.replace('.md', '');

            // 提取简介（第二行或第一段）
            const lines = content.split('\n').filter(l => l.trim());
            const description = lines[1] ? lines[1].substring(0, 100) + '...' : '点击查看详情';

            return `
                <div class="travel-card" style="padding: 1.5rem; border: 1px solid #e0e0e0; border-radius: 10px; transition: all 0.3s; background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%); box-shadow: 0 2px 8px rgba(0,0,0,0.08);" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 20px rgba(0,0,0,0.12)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'">
                    <h3 style="margin-bottom: 0.8rem; color: #2c3e50;">${title || name}</h3>
                    <p style="color: #5a6c7d; font-size: 0.9rem; margin-bottom: 1rem;">${description}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <small style="color: #6c7a89;">📁 ${name}</small>
                        <a href="/travel/${name}" role="button" style="margin: 0; font-size: 0.9rem;">查看详情 →</a>
                    </div>
                </div>
            `;
        }));

        const content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2>🌍 我的足迹</h2>
                <span style="color: #5a6c7d; font-size: 0.9rem;">${mdFiles.length} 篇游记</span>
            </div>
            <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
                ${cards.join('')}
            </div>
        `;

        res.send(renderPage('旅行列表', content));
    } catch (error) {
        next(error);
    }
});

/**
 * 旅行详情页
 */
router.get('/:slug', async (req, res, next) => {
    try {
        const { slug } = req.params;
        const mdPath = path.join(MD_DIR, slug + '.md');

        const data = await fs.readFile(mdPath, 'utf8');
        const html = marked.parse(data);
        const title = data.split('\n')[0].replace('# ', '').trim();

        res.send(renderPage(title, html));
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).send(renderPage('未找到', '<h2>404 - 文章不存在</h2>'));
        } else {
            next(error);
        }
    }
});

module.exports = router;
