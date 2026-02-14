const crypto = require('crypto');
const { createReadStream } = require('fs');

/**
 * 使用流式计算文件哈希 (避免大文件阻塞)
 * @param {string} filePath - 文件路径
 * @param {string} algorithm - 哈希算法 (默认sha256)
 * @returns {Promise<string>} 哈希值
 */
function getFileHash(filePath, algorithm = 'sha256') {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash(algorithm);
        const stream = createReadStream(filePath, {
            highWaterMark: 64 * 1024 // 64KB chunks,平衡性能和内存
        });

        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

module.exports = { getFileHash };
