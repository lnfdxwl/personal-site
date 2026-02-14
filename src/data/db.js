const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config');

let db = null;

/**
 * 初始化数据库
 */
async function initDatabase() {
    const dbPath = path.resolve(__dirname, '../../', config.db.path);
    const dbDir = path.dirname(dbPath);

    // 确保数据库目录存在
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    // 创建数据库连接
    db = new Database(dbPath);

    // 启用WAL模式以提升并发性能
    db.pragma('journal_mode = WAL');

    // 执行迁移
    const migrationPath = path.join(__dirname, 'migrations/001_initial.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    db.exec(migration);

    console.log(`✅ 数据库已初始化: ${dbPath}`);

    return db;
}

/**
 * 获取数据库实例
 */
function getDB() {
    if (!db) {
        throw new Error('数据库未初始化,请先调用 initDatabase()');
    }
    return db;
}

/**
 * 关闭数据库连接
 */
function closeDB() {
    if (db) {
        db.close();
        db = null;
        console.log('✅ 数据库连接已关闭');
    }
}

module.exports = { initDatabase, getDB, closeDB };
