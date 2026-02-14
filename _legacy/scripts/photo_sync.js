const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// --- 配置 ---
const LIBRARY_ROOT = path.resolve(__dirname, '../photos');
const DEST_LIBRARY = path.join(LIBRARY_ROOT, 'library');
const DEST_JUNK = path.join(LIBRARY_ROOT, 'temp_junk');
const DB_FILE = path.join(LIBRARY_ROOT, 'sync_db.json');
const TEMP_SCRIPT_PATH = path.join(__dirname, 'temp_jxa_scan.js');
const TEMP_EXPORT_SCRIPT_PATH = path.join(__dirname, 'temp_jxa_export.js');

// --- 确保目录存在 ---
if (!fs.existsSync(DEST_LIBRARY)) fs.mkdirSync(DEST_LIBRARY, { recursive: true });
if (!fs.existsSync(DEST_JUNK)) fs.mkdirSync(DEST_JUNK, { recursive: true });

// --- 加载已同步记录 ---
let syncedIDs = new Set();
if (fs.existsSync(DB_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        syncedIDs = new Set(data.synced_ids || []);
    } catch (e) {
        console.error("⚠️ 读取数据库失败:", e.message);
    }
}

console.log(`🐱 棉子准备就绪！已同步照片数: ${syncedIDs.size}`);

// --- 1. 生成扫描脚本 (JXA) - 使用最稳健的写法 ---
const scanScriptContent = `
var app = Application("Photos");
var results = [];

// 获取 "最近项目" 相册，通常每个库都有
// 也可以尝试 app.albums.byName("Recents") 或 "All Photos"
var album = app.albums.whose({name: "Recents"})[0];
if (!album) {
    // 英文系统可能是 "Recents"，中文系统可能是 "最近项目"
    // 如果找不到，就退回到所有 item 的最后 10 个（虽然慢一点）
    // 为了稳妥，我们直接取 app.mediaItems 的最后 10 个
    // 注意：JXA 取 length 极慢，我们尝试直接引用倒数元素
    // 但为了不报错，我们先只取 5 个试试
}

// ⚠️ JXA 黑魔法：把 ObjectSpecifier 变成真正的数组 ID
// 最快的办法是只获取 ID 列表，不要获取整个对象
// 这里的 whose 过滤通常比较快
var items = app.mediaItems.whose({favorite: true})(); // 先只测试获取收藏的照片！这是最稳的！
// 如果你想获取最近的，可以用 items.slice(-10)

// 为了测试成功，我们先只获取“收藏”的照片（数量少，速度快，肯定存在）
// 之后可以改为获取全部
var testItems = items.slice(-10); // 取最后10张收藏的

testItems.forEach(function(item) {
    var date = item.date();
    var year = date.getFullYear();
    var month = ("0" + (date.getMonth() + 1)).slice(-2);
    
    results.push({
        id: item.id(),
        filename: item.filename(),
        favorite: item.favorite(),
        mediaType: item.mediaType(), 
        date: date.toISOString(),
        year: year,
        month: month
    });
});

JSON.stringify(results);
`;

// 修正：为了保证脚本通用性，我改用 "所有媒体项" 的切片，但这在大库上会慢。
// 更好的策略：列出所有 id，在 node 里做 diff，然后再去 fetch 详情。
// 但那样太复杂。
// 让我们用一个 100% 会有的相册：System Photo Library 根目录。

const robustScript = `
var app = Application("Photos");
var results = [];

// 获取所有媒体项的引用
var allMedia = app.mediaItems;

// 这是一个极其耗时的操作，如果库很大。
// 为了测试，我们用 "lastItem" 属性。
// JXA 不支持 negative index slice。
// 我们获取总数（可能会卡一下）
var count = allMedia.length; 
var limit = 5; // 先取 5 张！确保能跑通！
var start = Math.max(0, count - limit);

for (var i = start; i < count; i++) {
    var item = allMedia[i]; // 按索引访问
    try {
        var date = item.date();
        var year = date.getFullYear();
        var month = ("0" + (date.getMonth() + 1)).slice(-2);
        
        results.push({
            id: item.id(),
            filename: item.filename(),
            favorite: item.favorite(),
            mediaType: item.mediaType(),
            date: date.toISOString(),
            year: year,
            month: month
        });
    } catch(e) {
        // 忽略单张错误
    }
}

JSON.stringify(results);
`;

fs.writeFileSync(TEMP_SCRIPT_PATH, robustScript);

try {
    console.log("🔍 正在扫描 Apple Photos (最近5张)...");
    const output = execSync(`osascript -l JavaScript "${TEMP_SCRIPT_PATH}"`, { maxBuffer: 1024 * 1024 * 50 }).toString();
    
    let photos = [];
    try {
        photos = JSON.parse(output);
    } catch (e) {
        console.log("JXA输出:", output);
        throw new Error("解析 JSON 失败");
    }
    
    console.log(`📸 扫描到 ${photos.length} 张照片。`);

    let newCount = 0;
    
    photos.forEach(p => {
        if (syncedIDs.has(p.id)) {
            console.log(`⏩ 跳过已存在: ${p.filename}`);
            return;
        }

        let targetDir = path.join(DEST_LIBRARY, `${p.year}`, `${p.month}`);
        if (p.filename && p.filename.includes('Screen')) {
             targetDir = DEST_JUNK;
        }

        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const exportScriptContent = `
            var app = Application("Photos");
            var item = app.mediaItems.byId("${p.id}");
            var path = Path("${targetDir}"); 
            if (item) {
                app.export([item], { to: path, usingOriginals: true });
            }
        `;
        fs.writeFileSync(TEMP_EXPORT_SCRIPT_PATH, exportScriptContent);
        
        try {
             execSync(`osascript -l JavaScript "${TEMP_EXPORT_SCRIPT_PATH}"`);
             console.log(`✅ ${p.filename} -> ${targetDir}`);
             syncedIDs.add(p.id);
             newCount++;
        } catch (err) {
            console.error(`❌ 导出失败 ${p.filename}:`, err.message);
        }
    });

    fs.writeFileSync(DB_FILE, JSON.stringify({ synced_ids: Array.from(syncedIDs) }, null, 2));
    console.log(`🎉 同步完成！新增 ${newCount} 张。`);

} catch (err) {
    console.error("❌ 发生错误:", err.message);
}
