#!/bin/bash
# 进入脚本所在目录的上级目录 (即 personal-site)
cd "$(dirname "$0")/.."

# 确保 Python 虚拟环境存在
if [ ! -d ".venv" ]; then
    echo "❌ 找不到 Python 虚拟环境 (.venv)，请先创建。"
    exit 1
fi

# 激活环境
source .venv/bin/activate

echo "🚀 开始同步照片..."
echo "📂 跳过自动导出 (工具未安装)，直接开始整理 Inbox..."

# --- 跳过 osxphotos ---
# osxphotos export ./photos/inbox --update --download-missing --retry 3

echo "📂 智能整理与归档..."

# 调用 node 脚本整理
node ./scripts/organize_photos.js

echo "🎉 整理完成！"
