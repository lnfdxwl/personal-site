const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { getDB } = require('../data/db');
const { getFileHash } = require('../utils/file-hash');
const config = require('../config');

const DATA_ROOT = path.resolve(__dirname, '../../data');
const INBOX_DIR = path.join(DATA_ROOT, 'photos/inbox');
const LIBRARY_DIR = path.join(DATA_ROOT, 'photos/library');
const TRASH_DIR = path.join(DATA_ROOT, 'photos/trash');

// 确保目录存在
[INBOX_DIR, LIBRARY_DIR, TRASH_DIR].forEach(dir => {
    if (!fsSync.existsSync(dir)) {
        fsSync.mkdirSync(dir, { recursive: true });
    }
});

class PhotoManager {
    /**
     * 获取统计信息
     */
    async getStats() {
        try {
            const db = getDB();
            const libraryCount = db.prepare('SELECT COUNT(*) as count FROM photos').get().count;

            const inboxFiles = await fs.readdir(INBOX_DIR);
            const inboxCount = inboxFiles.filter(f => !f.startsWith('.')).length;

            return {
                inbox_count: inboxCount,
                library_count: libraryCount,
                last_updated: new Date().toISOString()
            };
        } catch (error) {
            console.error('获取统计失败:', error);
            return { inbox_count: 0, library_count: 0 };
        }
    }

    /**
     * 整理Inbox照片 (异步优化版)
     * @param {function} onProgress - 进度回调 (current, total, filename)
     */
    async organizeInbox(onProgress) {
        const files = await fs.readdir(INBOX_DIR);
        const imageFiles = files.filter(f =>
            !f.startsWith('.') && /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
        );

        const result = {
            processed: 0,
            skipped: 0,
            failed: 0,
            logs: []
        };

        const CONCURRENCY = config.photos.concurrency || 5;

        // 批量并发处理
        for (let i = 0; i < imageFiles.length; i += CONCURRENCY) {
            const batch = imageFiles.slice(i, i + CONCURRENCY);

            await Promise.all(batch.map(async (file, idx) => {
                const currentIndex = i + idx + 1;

                if (onProgress) {
                    onProgress(currentIndex, imageFiles.length, file);
                }

                try {
                    await this._processPhoto(file, result);
                } catch (error) {
                    result.failed++;
                    result.logs.push(`❌ [失败] ${file}: ${error.message}`);
                    console.error(`处理失败 ${file}:`, error);
                }
            }));
        }

        return result;
    }

    /**
     * 处理单张照片
     */
    async _processPhoto(filename, result) {
        const srcPath = path.join(INBOX_DIR, filename);

        // 1. 计算哈希去重
        const hash = await getFileHash(srcPath);

        const db = getDB();
        const existing = db.prepare('SELECT id FROM photos WHERE hash = ?').get(hash);

        if (existing) {
            await fs.unlink(srcPath);
            result.skipped++;
            result.logs.push(`⏭️ [跳过] 重复: ${filename}`);
            return;
        }

        // 2. 获取文件信息
        const stats = await fs.stat(srcPath);
        const date = stats.mtime;

        // 3. 判断分类
        const isScreenshot = this._isScreenshot(filename);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');

        let destDir, category;
        if (isScreenshot) {
            destDir = TRASH_DIR;
            category = 'trash';
        } else {
            destDir = path.join(LIBRARY_DIR, String(year), month);
            category = 'library';
        }

        await fs.mkdir(destDir, { recursive: true });

        // 4. 移动文件
        const ext = path.extname(filename);
        const safeName = `${path.basename(filename, ext)}_${hash.substring(0, 6)}${ext}`;
        const destPath = path.join(destDir, safeName);

        await fs.rename(srcPath, destPath);

        // 5. 保存到数据库 (仅非截图)
        if (!isScreenshot) {
            const relativePath = path.relative(LIBRARY_DIR, destPath);

            db.prepare(`
                INSERT INTO photos (
                    filename, path, hash, size, taken_at
                ) VALUES (?, ?, ?, ?, ?)
            `).run(
                safeName,
                relativePath,
                hash,
                stats.size,
                date.toISOString()
            );
        }

        result.processed++;
        result.logs.push(`✅ [${category}] ${filename}`);
    }

    /**
     * 判断是否为截图
     */
    _isScreenshot(filename) {
        const name = filename.toLowerCase();
        const patterns = config.photos.screenshotPatterns || ['screenshot', 'screen', '屏幕'];

        return patterns.some(pattern => name.includes(pattern.trim()));
    }

    /**
     * 获取照片列表 (支持过滤和分页)
     */
    async getPhotos(filters = {}) {
        const db = getDB();
        const {
            year,
            month,
            sort = 'date_desc',
            limit = 50,
            offset = 0
        } = filters;

        let query = 'SELECT * FROM photos WHERE 1=1';
        const params = [];

        if (year) {
            query += ' AND strftime("%Y", taken_at) = ?';
            params.push(String(year));
        }

        if (month) {
            query += ' AND strftime("%m", taken_at) = ?';
            params.push(String(month).padStart(2, '0'));
        }

        // 排序
        const sortMap = {
            'date_desc': 'taken_at DESC',
            'date_asc': 'taken_at ASC',
            'size_desc': 'size DESC'
        };
        query += ` ORDER BY ${sortMap[sort] || 'taken_at DESC'}`;

        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const photos = db.prepare(query).all(...params);

        // 添加URL
        return photos.map(photo => ({
            ...photo,
            url: `/photos/${photo.path}`
        }));
    }
}

module.exports = new PhotoManager();
