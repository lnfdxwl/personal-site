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
        const mdFiles = files.filter(f => f.endsWith('.md'));

        const cards = await Promise.all(mdFiles.map(async (file) => {
            const content = await fs.readFile(path.join(MD_DIR, file), 'utf8');
            const title = content.split('\n')[0].replace('# ', '').trim();
            const name = file.replace('.md', '');

            return `
                <article style="padding: 1.5rem; border: 1px solid #eee; border-radius: 8px; transition: transform 0.2s;">
                    <h3 style="margin-bottom: 0.5rem;">${title || name}</h3>
                    <small>📁 ${name}</small><br>
                    <a href="/travel/${name}" role="button" style="margin-top: 1rem;">查看详情</a>
                </article>
            `;
        }));

        const content = `
            <h2>🌍 足迹</h2>
            <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">
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
