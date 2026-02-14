# 快速启动指南 (AI代理专用)

> 本文档为AI代理提供最简洁的部署和运行指令

## ⚡ 一键启动 (本地开发)

\`\`\`bash
# 1. 安装依赖
npm install

# 2. 创建配置文件
cp .env.example .env

# 3. 启动服务器
npm start
\`\`\`

访问: `http://localhost:8080`

## 🚀 生产环境部署

\`\`\`bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
nano .env  # 设置 NODE_ENV=production

# 3. 运行数据迁移 (如果从旧版本升级)
npm run migrate

# 4. 使用PM2启动
npm install -g pm2
pm2 start server.js --name lifeos
pm2 save
pm2 startup  # 设置开机自启
\`\`\`

## 📋 核心命令

\`\`\`bash
# 开发模式 (自动重启)
npm run dev

# 生产模式
npm start

# 数据迁移
npm run migrate

# 测试
npm test

# 查看PM2状态
pm2 status

# 查看日志
pm2 logs lifeos

# 重启
pm2 restart lifeos

# 停止
pm2 stop lifeos
\`\`\`

## 🔧 常见操作

### 添加照片

\`\`\`bash
# 1. 将照片放入inbox
cp /path/to/photos/* data/photos/inbox/

# 2. 访问图库页面
# 3. 点击"开始整理"按钮

# 或使用API
curl -X POST http://localhost:8080/api/photos/sync
\`\`\`

### 添加旅行攻略

\`\`\`bash
# 1. 在markdown目录创建文件
cat > data/markdown/japan.md << 'EOF'
# 🇯🇵 日本7日游攻略

## Day 1: 东京

...
EOF

# 2. 访问 http://localhost:8080/travel
\`\`\`

### 查看统计

\`\`\`bash
curl http://localhost:8080/api/photos/stats
\`\`\`

## 🐛 快速故障排查

### 端口被占用

\`\`\`bash
lsof -ti:8080 | xargs kill -9
\`\`\`

### 数据库锁定

\`\`\`bash
pm2 stop lifeos
rm data/photos.db-wal data/photos.db-shm
pm2 start lifeos
\`\`\`

### 清理并重启

\`\`\`bash
pm2 delete lifeos
rm -rf node_modules package-lock.json
npm install
pm2 start server.js --name lifeos
\`\`\`

## 📊 健康检查

\`\`\`bash
# 检查服务器是否运行
curl -s http://localhost:8080/ | grep "LifeOS"

# 检查API
curl -s http://localhost:8080/api/photos/stats | jq

# 检查PM2
pm2 status | grep lifeos

# 检查数据库
ls -lh data/photos.db
\`\`\`

## 🔄 更新部署

\`\`\`bash
# 拉取最新代码
git pull

# 安装新依赖
npm install

# 运行迁移
npm run migrate

# 重启服务
pm2 restart lifeos
\`\`\`

## 📦 备份

\`\`\`bash
# 备份数据库
cp data/photos.db data/photos.db.backup.$(date +%Y%m%d)

# 备份所有数据
tar -czf backup-$(date +%Y%m%d).tar.gz data/
\`\`\`

## 🔐 安全检查

\`\`\`bash
# 检查权限
ls -la .env
ls -la data/photos.db

# 应该是:
# -rw------- .env
# -rw-r--r-- data/photos.db

# 修正权限
chmod 600 .env
chmod 644 data/photos.db
\`\`\`

## 📞 获取帮助

- **详细文档**: 查看 README.md
- **部署指南**: 查看 DEPLOYMENT.md
- **变更日志**: 查看 CHANGELOG.md
- **问题反馈**: https://github.com/lnfdxwl/personal-site/issues

## ✅ 部署检查清单

- [ ] Node.js >= 18.0.0 已安装
- [ ] npm install 成功
- [ ] .env 文件已配置
- [ ] data目录已创建
- [ ] npm start 启动成功
- [ ] 可以访问 http://localhost:8080
- [ ] PM2已安装并配置
- [ ] 开机自启已设置
- [ ] Nginx反向代理已配置 (可选)
- [ ] HTTPS证书已配置 (可选)
- [ ] 备份脚本已设置

---

**提示**: 如果遇到问题,请先查看 `pm2 logs lifeos --err` 中的错误信息。
