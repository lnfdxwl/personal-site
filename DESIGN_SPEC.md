# LifeOS-Lite 设计规格说明书 (v2.0)

**项目代号**: `LifeOS-Lite`
**核心理念**: 数据私有、文件驱动、极简交互。

## 1. 核心架构与目录规划

### 1.1 目录结构
```text
personal-site/
├── DESIGN_SPEC.md        # 本文档
├── server.js             # 🚀 入口 (PM2 托管)
├── core/                 # 🧠 核心逻辑
│   ├── router.js         # 路由分发
│   ├── renderer.js       # Markdown 渲染器
│   └── photo_manager.js  # 照片管理逻辑 (整理/同步)
├── data/                 # 💾 数据存储
│   ├── db/               # JSON 数据库 (photo_db.json)
│   ├── markdown/         # 旅行攻略 (原 travel/)
│   └── photos/           # 照片库
│       ├── inbox/        # 📥 待处理区
│       ├── library/      # 📚 正式库 (按年月归档)
│       └── trash/        # 🗑️ 垃圾桶
└── public/               # 🎨 静态资源
    ├── css/
    ├── js/
    └── assets/
```

## 2. 功能模块

### 🏠 Dashboard (首页)
- **今日概览**: 欢迎语、系统状态。
- **快捷入口**: 最新攻略、图库概览。

### 🌍 Explorer (旅行)
- **列表页**: 展示 `data/markdown` 下的文档列表。
- **详情页**: 渲染 Markdown，支持 Mermaid 图表。
- **侧边栏**: 自动生成文章目录 (TOC)。

### 🖼️ Gallery (图库)
- **浏览模式**:
  - 时间轴流式布局。
  - 按文件夹 (相册) 归类。
- **管理面板 (Admin Panel)**:
  - **Inbox 监控**: 显示待处理照片数量。
  - **Action**: [整理照片] 按钮 -> 触发 `core/photo_manager.js`。
  - **Trash**: [清空垃圾桶] 按钮。

## 3. API 设计

- `GET /api/photos`: 获取照片列表 (分页/按时间)。
- `GET /api/photos/stats`: 获取 Inbox/Library 统计信息。
- `POST /api/photos/sync`: 触发 Inbox 整理任务。
- `GET /api/markdown/:slug`: 获取文章内容。

## 4. 交互规范
- 使用 SSE (Server-Sent Events) 或简单的进度轮询来反馈“同步”进度。
- 响应式布局，适配移动端。
