const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// --- 配置 ---
const LIBRARY_ROOT = path.resolve(__dirname, '../photos');
const INBOX_DIR = path.join(LIBRARY_ROOT, 'inbox');
const DEST_LIBRARY = path.join(LIBRARY_ROOT, 'library');
const DEST_JUNK = path.join(LIBRARY_ROOT, 'temp_junk');
const DB_FILE = path.join(LIBRARY_ROOT, 'photo_db.json');

// --- 确保目录存在 ---
if (!fs.existsSync(DEST_LIBRARY)) fs.mkdirSync(DEST_LIBRARY, { recursive: true });
if (!fs.existsSync(DEST_JUNK)) fs.mkdirSync(DEST_JUNK, { recursive: true });

// --- 加载已处理记录 (哈希库) ---
let processedHashes = new Set();
if (fs.existsSync(DB_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        processedHashes = new Set(data.processed_hashes || []);
    } catch (e) {
        console.error("⚠️ 读取数据库失败:", e.message);
    }
}

// --- 辅助函数：计算文件哈希 ---
function getFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

// --- 辅助函数：获取文件日期 (尝试 exiftool，如果没有就用文件修改时间) ---
function getFileDate(filePath) {
    try {
        // 尝试用 stat 获取创建时间/修改时间
        const stats = fs.statSync(filePath);
        return stats.birthtime || stats.mtime;
    } catch (e) {
        return new Date(); // 默认当前时间
    }
}

// --- 辅助函数：判断是否是截图 ---
function isScreenshot(filename, width, height) {
    // 1. 文件名判断
    if (filename.toLowerCase().includes('screenshot') || filename.toLowerCase().includes('屏幕快照')) {
        return true;
    }
    // 2. 尺寸判断 (常见手机截图尺寸比例)
    // 这里简单略过，主要靠文件名和后续人工
    return false;
}

// --- 主逻辑 ---
console.log(`🐱 棉子准备整理照片...`);
console.log(`📂 Inbox: ${INBOX_DIR}`);

if (!fs.existsSync(INBOX_DIR)) {
    console.log("❌ Inbox 不存在！请先创建并放入照片。");
    process.exit(1);
}

const files = fs.readdirSync(INBOX_DIR);
let processedCount = 0;
let skippedCount = 0;

files.forEach(file => {
    if (file.startsWith('.')) return; // 跳过 .DS_Store
    
    const srcPath = path.join(INBOX_DIR, file);
    
    // 1. 计算哈希，查重
    const fileHash = getFileHash(srcPath);
    if (processedHashes.has(fileHash)) {
        console.log(`⏩ [跳过] 已存在: ${file}`);
        // 既然已存在，直接删除 Inbox 里的副本
        fs.unlinkSync(srcPath);
        skippedCount++;
        return;
    }

    // 2. 获取日期
    const date = getFileDate(srcPath);
    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2);

    // 3. 决定目标路径
    let targetDir;
    let category = "normal";

    if (isScreenshot(file)) {
        targetDir = DEST_JUNK;
        category = "junk";
    } else {
        targetDir = path.join(DEST_LIBRARY, `${year}`, `${month}`);
    }

    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // 4. 移动文件 (为了防止重名，加上哈希前缀)
    const ext = path.extname(file);
    const safeFilename = `${path.basename(file, ext)}_${fileHash.substring(0, 6)}${ext}`;
    const destPath = path.join(targetDir, safeFilename);

    fs.renameSync(srcPath, destPath);
    console.log(`✅ [${category}] ${file} -> ${year}/${month}/`);
    
    // 5. 记录哈希
    processedHashes.add(fileHash);
    processedCount++;
});

// --- 保存状态 ---
fs.writeFileSync(DB_FILE, JSON.stringify({ processed_hashes: Array.from(processedHashes) }, null, 2));
console.log(`🎉 整理完成！处理 ${processedCount} 张，跳过 ${skippedCount} 张。`);
