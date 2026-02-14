/**
 * 数据迁移脚本
 * 将旧版 photo_db.json 数据迁移到 SQLite
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initDatabase, getDB } = require('../src/data/db');
const { getFileHash } = require('../src/utils/file-hash');

const OLD_DB_PATH = path.join(__dirname, '../data/db/photo_db.json');
const LIBRARY_DIR = path.join(__dirname, '../data/photos/library');

async function migrate() {
    console.log('🚀 开始数据迁移...\n');

    // 1. 初始化数据库
    await initDatabase();
    const db = getDB();

    // 2. 检查旧数据库
    if (!fs.existsSync(OLD_DB_PATH)) {
        console.log('⚠️ 未找到旧数据库,跳过迁移');
        console.log('   如果这是全新安装,这是正常的');
        return;
    }

    // 3. 读取旧数据
    const oldData = JSON.parse(fs.readFileSync(OLD_DB_PATH, 'utf8'));
    const hashes = oldData.processed_hashes || [];
    console.log(`📦 找到 ${hashes.length} 条哈希记录\n`);

    // 4. 扫描library目录
    const photos = [];

    function scanDir(dir) {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir);

        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                scanDir(fullPath);
            } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(item)) {
                photos.push({
                    filename: item,
                    fullPath: fullPath,
                    relativePath: path.relative(LIBRARY_DIR, fullPath),
                    size: stat.size,
                    mtime: stat.mtime
                });
            }
        });
    }

    scanDir(LIBRARY_DIR);
    console.log(`📸 找到 ${photos.length} 张照片\n`);

    if (photos.length === 0) {
        console.log('✅ 没有照片需要迁移');
        return;
    }

    // 5. 计算哈希并导入数据库
    console.log('🔄 正在计算哈希并导入数据库...');

    const insert = db.prepare(`
        INSERT OR IGNORE INTO photos (
            filename, path, hash, size, taken_at
        ) VALUES (?, ?, ?, ?, ?)
    `);

    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];

        try {
            // 计算哈希
            const hash = await getFileHash(photo.fullPath);

            // 插入数据库
            const result = insert.run(
                photo.filename,
                photo.relativePath,
                hash,
                photo.size,
                photo.mtime.toISOString()
            );

            if (result.changes > 0) {
                imported++;
            } else {
                skipped++;
            }

            // 显示进度
            if ((i + 1) % 10 === 0 || i === photos.length - 1) {
                process.stdout.write(`\r   进度: ${i + 1}/${photos.length} (${Math.round((i + 1) / photos.length * 100)}%)`);
            }
        } catch (error) {
            console.error(`\n❌ 处理失败 ${photo.filename}:`, error.message);
        }
    }

    console.log('\n');

    // 6. 备份旧数据库
    const backupPath = OLD_DB_PATH + '.backup.' + Date.now();
    fs.copyFileSync(OLD_DB_PATH, backupPath);
    console.log(`💾 旧数据库已备份至: ${backupPath}`);

    // 7. 总结
    console.log('\n✅ 迁移完成!');
    console.log(`   导入: ${imported} 张`);
    console.log(`   跳过: ${skipped} 张 (已存在)`);

    // 8. 验证
    const count = db.prepare('SELECT COUNT(*) as count FROM photos').get().count;
    console.log(`   数据库中共有: ${count} 张照片`);
}

// 执行迁移
migrate()
    .then(() => {
        console.log('\n🎉 迁移脚本执行完成');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ 迁移失败:', error);
        process.exit(1);
    });
