const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- 配置 ---
const DATA_ROOT = path.resolve(__dirname, '../data');
const INBOX_DIR = path.join(DATA_ROOT, 'photos/inbox');
const LIBRARY_DIR = path.join(DATA_ROOT, 'photos/library');
const TRASH_DIR = path.join(DATA_ROOT, 'photos/trash');
const DB_FILE = path.join(DATA_ROOT, 'db/photo_db.json');

// 确保目录存在
if (!fs.existsSync(INBOX_DIR)) fs.mkdirSync(INBOX_DIR, { recursive: true });
if (!fs.existsSync(LIBRARY_DIR)) fs.mkdirSync(LIBRARY_DIR, { recursive: true });
if (!fs.existsSync(TRASH_DIR)) fs.mkdirSync(TRASH_DIR, { recursive: true });

// --- 数据库操作 ---
function loadDB() {
    if (!fs.existsSync(DB_FILE)) return new Set();
    try {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        return new Set(data.processed_hashes || []);
    } catch (e) {
        console.error("[PhotoManager] DB加载失败:", e.message);
        return new Set();
    }
}

function saveDB(hashSet) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
        processed_hashes: Array.from(hashSet),
        updated_at: new Date().toISOString()
    }, null, 2));
}

// --- 核心逻辑 ---

/**
 * 获取目录下的文件统计信息
 */
function getStats() {
    const countInDir = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => !f.startsWith('.')).length : 0;

    const inbox = fs.readdirSync(INBOX_DIR).filter(f => !f.startsWith('.'));
    const library_files = [];
    
    // 递归扫描 library
    const scanDir = (dir) => {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
                scanDir(fullPath);
            } else {
                library_files.push(item);
            }
        });
    };
    scanDir(LIBRARY_DIR);

    return {
        inbox_count: inbox.length,
        library_count: library_files.length,
        trash_count: countInDir(TRASH_DIR),
        inbox_files: inbox // 返回待处理文件列表
    };
}

/**
 * 整理 Inbox 中的照片
 * @param {function} onProgress - 进度回调 (current, total, filename)
 */
async function organizeInbox(onProgress) {
    const processedHashes = loadDB();
    const files = fs.readdirSync(INBOX_DIR).filter(f => !f.startsWith('.'));

    const result = {
        processed: 0,
        skipped: 0,
        failed: 0,
        logs: []
    };

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const srcPath = path.join(INBOX_DIR, file);

        if (onProgress) onProgress(i + 1, files.length, file);

        try {
            // 1. 计算哈希去重
            const hash = getFileHash(srcPath);
            if (processedHashes.has(hash)) {
                fs.unlinkSync(srcPath); // 删除重复文件
                result.skipped++;
                result.logs.push(`⏭️ [跳过] 已存在: ${file}`);
                continue;
            }

            // 2. 判断分类 (截图 vs 正常)
            const date = getFileDate(srcPath);
            const year = date.getFullYear();
            const month = ("0" + (date.getMonth() + 1)).slice(-2);

            let targetDir, category;

            if (isScreenshot(file)) {
                targetDir = TRASH_DIR;
                category = "trash";
            } else {
                targetDir = path.join(LIBRARY_DIR, `${year}`, `${month}`);
                category = "library";
            }

            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            // 3. 移动文件 (加哈希防重名)
            const ext = path.extname(file);
            const safeName = `${path.basename(file, ext)}_${hash.substring(0, 4)}${ext}`;
            const destPath = path.join(targetDir, safeName);

            fs.renameSync(srcPath, destPath);
            
            // 4. 更新记录
            processedHashes.add(hash);
            result.processed++;
            result.logs.push(`✅ [${category}] ${file} -> ${year}/${month}/`);

        } catch (e) {
            result.failed++;
            result.logs.push(`❌ [失败] ${file}: ${e.message}`);
        }
    }

    // 保存数据库
    saveDB(processedHashes);
    return result;
}

/**
 * 获取库中的照片列表 (用于前端展示)
 * @param {number} limit - 限制数量
 * @param {number} offset - 偏移量
 */
function getLibraryPhotos(limit = 50, offset = 0) {
    const photos = [];
    const scanDir = (dir, relativePath) => {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const relPath = path.join(relativePath, item);
            if (fs.statSync(fullPath).isDirectory()) {
                scanDir(fullPath, relPath);
            } else {
                if (/\.(jpg|jpeg|png|gif|webp)$/i.test(item)) {
                    photos.push({
                        name: item,
                        path: relPath,
                        url: `/photos/${relPath.replace(/\\/g, '/')}`, // Web path
                        date: fs.statSync(fullPath).mtime
                    });
                }
            }
        });
    };
    scanDir(LIBRARY_DIR, '');
    
    // 按时间倒序
    photos.sort((a, b) => b.date - a.date);
    return photos.slice(offset, offset + limit);
}

// --- 辅助工具 ---

function getFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

function getFileDate(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.birthtime || stats.mtime;
    } catch (e) {
        return new Date();
    }
}

function isScreenshot(filename) {
    const name = filename.toLowerCase();
    return (
        name.includes('screenshot') ||
        name.includes('屏幕快照') ||
        name.includes('screen') ||
        /^\d{8}_\d{6}\./.test(name) // 格式如 20260213_180600.xxx 很可能是截图
    );
}

module.exports = {
    getStats,
    organizeInbox,
    getLibraryPhotos
};
