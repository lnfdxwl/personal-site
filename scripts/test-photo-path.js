const path = require('path');

// 测试路径构建
const LIBRARY_DIR = '/Users/zhaozeyang/.openclaw/workspace/personal-site/data/photos/library';
const requestPath = 'misc/05146061-5678-4acc-9391-ddd740a53023.jpg';
const filePath = path.join(LIBRARY_DIR, requestPath);

console.log('LIBRARY_DIR:', LIBRARY_DIR);
console.log('requestPath:', requestPath);
console.log('filePath:', filePath);
console.log('normalized path:', path.normalize(filePath));
console.log('startsWith?', path.normalize(filePath).startsWith(LIBRARY_DIR));

// 检查文件是否存在
const fs = require('fs');
console.log('File exists?', fs.existsSync(filePath));
