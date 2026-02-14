# 部署指南

本文档为AI代理或其他开发者提供详细的部署步骤。

## 📋 部署前检查清单

- [ ] 服务器已安装 Node.js >= 18.0.0
- [ ] 服务器已安装 npm >= 9.0.0
- [ ] 服务器已安装 Git
- [ ] 服务器有足够的磁盘空间 (建议 >= 10GB)
- [ ] 服务器防火墙已开放目标端口 (默认8080)

## 🚀 部署步骤

### 步骤1: 克隆项目

\`\`\`bash
# 克隆仓库
git clone https://github.com/lnfdxwl/personal-site.git
cd personal-site

# 或者如果已经有代码,直接进入目录
cd /path/to/personal-site
\`\`\`

### 步骤2: 安装依赖

\`\`\`bash
npm install
\`\`\`

**可能遇到的问题**:

**问题1**: `better-sqlite3` 编译失败

**解决方案**:
\`\`\`bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt-get install build-essential python3

# CentOS/RHEL
sudo yum groupinstall "Development Tools"
sudo yum install python3

# 然后重新安装
rm -rf node_modules package-lock.json
npm install
\`\`\`

**问题2**: Node版本过低

**解决方案**:
\`\`\`bash
# 使用nvm安装新版本
nvm install 18
nvm use 18

# 或者使用n
npm install -g n
n 18
\`\`\`

### 步骤3: 配置环境变量

\`\`\`bash
# 复制示例配置
cp .env.example .env

# 编辑配置文件
nano .env  # 或使用 vim, vi 等编辑器
\`\`\`

**重要配置项**:

\`\`\`env
# 生产环境必须设置
NODE_ENV=production

# 端口配置 (根据实际情况调整)
PORT=8080
HOST=0.0.0.0

# 数据库路径 (确保目录有写权限)
DB_PATH=./data/photos.db

# 照片处理并发数 (根据服务器性能调整)
ORGANIZE_CONCURRENCY=5

# 截图识别模式 (根据需要添加)
SCREENSHOT_PATTERNS=screenshot,screen,屏幕快照,SCR
\`\`\`

### 步骤4: 创建必要的目录

\`\`\`bash
# 创建数据目录
mkdir -p data/photos/{inbox,library,trash,thumbnails}
mkdir -p data/markdown
mkdir -p data/db
mkdir -p logs

# 设置权限
chmod 755 data
chmod 755 data/photos
chmod 755 data/photos/inbox
\`\`\`

### 步骤5: 数据迁移 (如果从旧版本升级)

\`\`\`bash
# 运行迁移脚本
npm run migrate
\`\`\`

**预期输出**:
\`\`\`
🚀 开始数据迁移...
✅ 数据库已初始化: /path/to/data/photos.db
📦 找到 X 条哈希记录
📸 找到 Y 张照片
🔄 正在计算哈希并导入数据库...
   进度: Y/Y (100%)
💾 旧数据库已备份至: ...
✅ 迁移完成!
\`\`\`

### 步骤6: 测试启动

\`\`\`bash
# 测试启动
npm start
\`\`\`

**预期输出**:
\`\`\`
✅ 数据库已初始化: /path/to/data/photos.db
🚀 LifeOS v3.0 运行于 http://0.0.0.0:8080/
📊 环境: production
\`\`\`

**测试访问**:
\`\`\`bash
# 在另一个终端测试
curl http://localhost:8080/

# 应该返回HTML页面
\`\`\`

按 `Ctrl+C` 停止测试服务器。

### 步骤7: 使用PM2进行进程管理

#### 7.1 安装PM2

\`\`\`bash
npm install -g pm2
\`\`\`

#### 7.2 创建PM2配置文件

\`\`\`bash
# 创建 ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'lifeos',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF
\`\`\`

#### 7.3 启动应用

\`\`\`bash
# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs lifeos

# 停止应用
pm2 stop lifeos

# 重启应用
pm2 restart lifeos

# 删除应用
pm2 delete lifeos
\`\`\`

#### 7.4 设置开机自启

\`\`\`bash
# 生成启动脚本
pm2 startup

# 按照输出的命令执行 (通常是一个sudo命令)

# 保存当前进程列表
pm2 save
\`\`\`

### 步骤8: 配置Nginx反向代理 (可选)

#### 8.1 安装Nginx

\`\`\`bash
# Ubuntu/Debian
sudo apt-get install nginx

# CentOS/RHEL
sudo yum install nginx
\`\`\`

#### 8.2 创建Nginx配置

\`\`\`bash
# 创建配置文件
sudo nano /etc/nginx/sites-available/lifeos
\`\`\`

**配置内容**:
\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    # 访问日志
    access_log /var/log/nginx/lifeos-access.log;
    error_log /var/log/nginx/lifeos-error.log;

    # 客户端最大上传大小
    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时设置 (用于照片同步等长时间操作)
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
\`\`\`

#### 8.3 启用配置

\`\`\`bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/lifeos /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
\`\`\`

#### 8.4 配置HTTPS (使用Let's Encrypt)

\`\`\`bash
# 安装certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书并自动配置Nginx
sudo certbot --nginx -d your-domain.com

# 测试自动续期
sudo certbot renew --dry-run
\`\`\`

### 步骤9: 配置防火墙

\`\`\`bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp  # 如果需要直接访问
sudo ufw enable

# firewalld (CentOS)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
\`\`\`

### 步骤10: 验证部署

\`\`\`bash
# 检查PM2状态
pm2 status

# 检查应用日志
pm2 logs lifeos --lines 50

# 检查Nginx状态
sudo systemctl status nginx

# 测试访问
curl http://localhost:8080/
curl http://your-domain.com/  # 如果配置了Nginx

# 测试API
curl http://localhost:8080/api/photos/stats
\`\`\`

## 🔄 更新部署

### 更新代码

\`\`\`bash
# 拉取最新代码
git pull origin main

# 安装新依赖
npm install

# 运行数据库迁移 (如果有新迁移)
npm run migrate

# 重启应用
pm2 restart lifeos
\`\`\`

### 回滚部署

\`\`\`bash
# 查看提交历史
git log --oneline -10

# 回滚到指定版本
git reset --hard <commit-hash>

# 重新安装依赖
npm install

# 重启应用
pm2 restart lifeos
\`\`\`

## 📊 监控与维护

### 查看日志

\`\`\`bash
# PM2日志
pm2 logs lifeos

# 应用日志 (如果配置了文件日志)
tail -f logs/app.log

# Nginx日志
sudo tail -f /var/log/nginx/lifeos-access.log
sudo tail -f /var/log/nginx/lifeos-error.log
\`\`\`

### 性能监控

\`\`\`bash
# PM2监控
pm2 monit

# 查看资源使用
pm2 show lifeos
\`\`\`

### 数据库维护

\`\`\`bash
# 备份数据库
cp data/photos.db data/photos.db.backup.$(date +%Y%m%d)

# 压缩备份
tar -czf data-backup-$(date +%Y%m%d).tar.gz data/

# 清理WAL文件 (如果数据库锁定)
pm2 stop lifeos
rm data/photos.db-wal data/photos.db-shm
pm2 start lifeos
\`\`\`

### 日志轮转

\`\`\`bash
# PM2日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
\`\`\`

## 🐛 故障排查

### 问题1: 应用无法启动

**检查步骤**:
\`\`\`bash
# 1. 查看PM2日志
pm2 logs lifeos --err

# 2. 检查端口占用
lsof -i:8080

# 3. 检查权限
ls -la data/
ls -la data/photos/

# 4. 手动启动测试
npm start
\`\`\`

### 问题2: 数据库锁定

**解决方案**:
\`\`\`bash
# 停止所有进程
pm2 stop lifeos

# 删除WAL文件
rm data/photos.db-wal data/photos.db-shm

# 重启
pm2 start lifeos
\`\`\`

### 问题3: 照片同步失败

**检查步骤**:
\`\`\`bash
# 1. 检查inbox目录权限
ls -la data/photos/inbox/

# 2. 检查磁盘空间
df -h

# 3. 查看错误日志
pm2 logs lifeos --err --lines 100

# 4. 手动测试同步
curl -X POST http://localhost:8080/api/photos/sync
\`\`\`

### 问题4: 内存占用过高

**解决方案**:
\`\`\`bash
# 1. 降低并发数
# 编辑 .env
ORGANIZE_CONCURRENCY=3

# 2. 限制PM2内存
# 编辑 ecosystem.config.js
max_memory_restart: '500M'

# 3. 重启应用
pm2 restart lifeos
\`\`\`

## 🔐 安全建议

### 1. 文件权限

\`\`\`bash
# 限制敏感文件权限
chmod 600 .env
chmod 600 data/photos.db

# 限制目录权限
chmod 755 data
chmod 755 data/photos
\`\`\`

### 2. 环境变量

不要在代码中硬编码敏感信息,全部使用环境变量。

### 3. 定期备份

\`\`\`bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/lifeos"

mkdir -p $BACKUP_DIR

# 备份数据库
cp data/photos.db $BACKUP_DIR/photos_$DATE.db

# 备份照片
tar -czf $BACKUP_DIR/photos_$DATE.tar.gz data/photos/library

# 备份Markdown
tar -czf $BACKUP_DIR/markdown_$DATE.tar.gz data/markdown

# 清理30天前的备份
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x backup.sh

# 添加到crontab (每天凌晨3点备份)
crontab -e
# 添加: 0 3 * * * /path/to/backup.sh >> /path/to/backup.log 2>&1
\`\`\`

### 4. 更新依赖

\`\`\`bash
# 定期检查安全漏洞
npm audit

# 修复漏洞
npm audit fix

# 更新依赖
npm update
\`\`\`

## 📞 支持

如有问题,请查看:
- README.md - 使用指南
- GitHub Issues - https://github.com/lnfdxwl/personal-site/issues

---

**最后更新**: 2026-02-14
