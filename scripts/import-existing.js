/**
 * 导入现有照片到数据库
 * 扫描 library 目录中的照片，添加到数据库
 */
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { initDatabase, getDB } = require('../src/data/db');
const { getFileHash } = require('../src/utils/file-hash');

const LIBRARY_DIR = path.join(__dirname, '../data/photos/library');

async function scanLibrary() {
    console.log('🚀 开始扫描现有照片库...\n');

    // 1. 初始化数据库
    await initDatabase();
    const db = getDB();

    let total = 0;
    let imported = 0;
    let skipped = 0;

    // 2. 递归扫描 library 目录
    async function scanDir(dir, relativePath = '') {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePathFile = path.join(relativePath, entry.name);

            if (entry.isDirectory()) {
                await scanDir(fullPath, relativePathFile);
            } else if (entry.isDirectory() === false) {
                // 检查是否是图片
                if (/\.(jpg|jpeg|png|gif|webp)$/i.test(entry.name)) {
                    total++;
                    console.log(`[${total}] 发现: ${relativePathFile}`);

                    try {
                        // 计算哈希
                        const hash = await getFileHash(fullPath);

                        // 检查是否已存在
                        const existing = db.prepare('SELECT id FROM photos WHERE hash = ?').get(hash);

                        if (existing) {
                            console.log(`    ⏭️  已存在，跳过`);
                            skipped++;
                        } else {
                            // 获取文件信息
                            const stats = await fs.stat(fullPath);

                            // 插入数据库
                            const stmt = db.prepare(`
                                INSERT INTO photos (filename, path, hash, size, created_at, updated_at)
                                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                            `);

                            // 解析日期路径 (格式: YYYY/MM/filename)
                            const match = relativePath.match(/^(\d{4})\/(\d{2})\/(.+)$/);
                            let takenAt = stats.mtime;
                            if (match) {
                                takenAt = new Date(`${match[1]}-${match[2]}-01`);
                            }

                            stmt.run(entry.name, relativePathFile, hash, stats.size);

                            // 更新 taken_at
                            db.prepare('UPDATE photos SET taken_at = ? WHERE id = ?')
                                .run(takenAt.toISOString(), db.lastInsertRowid);

                            console.log(`    ✅ 导入成功`);
                            imported++;
                        }
                    } catch (error) {
                        console.log(`    ❌ 失败: ${error.message}`);
                    }
                }
            }
        }
    }

    // 3. 开始扫描
    if (fs.access(LIBRARY_DIR)) {
        await scanDir(LIBRARY_DIR);
    } else {
        console.log('❌ Library 目录不存在');
        return;
    }

    // 4. 输出统计
    console.log('\n--- 完成 ---');
    console.log(`📊 总扫描: ${total} 张`);
    console.log(`✅ 已导入: ${imported} 张`);
    console.log(`⏭️  已跳过: ${skipped} 张`);
    console.log('\n刷新页面查看效果！');
}

scanLibrary().catch(console.error);
