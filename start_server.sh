#!/bin/bash
cd "$(dirname "$0")"

echo "🚀 启动 OpenClaw 个人小站..."

while true; do
    echo "Using node: $(which node)"
    node server.js
    
    EXIT_CODE=$?
    echo "⚠️ 服务异常退出 (Code: $EXIT_CODE)，1秒后重启..."
    sleep 1
done
