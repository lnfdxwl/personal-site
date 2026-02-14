-- 照片表
CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    path TEXT UNIQUE NOT NULL,
    hash TEXT UNIQUE NOT NULL,
    size INTEGER,
    width INTEGER,
    height INTEGER,
    taken_at DATETIME,
    camera TEXT,
    location_lat REAL,
    location_lng REAL,
    tags TEXT,
    album_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_hash ON photos(hash);
CREATE INDEX IF NOT EXISTS idx_photos_tags ON photos(tags);

-- 文章表
CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    tags TEXT,
    category TEXT,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles(tags);

-- 全文搜索索引
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
    title, content, tags,
    content='articles',
    content_rowid='id'
);

-- 相册表
CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    cover_photo_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cover_photo_id) REFERENCES photos(id)
);
