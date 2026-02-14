const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LIBRARY_ROOT = path.resolve(__dirname, '../photos');
const DEST_LIBRARY = path.join(LIBRARY_ROOT, 'library');
const TEMP_AS_PATH = path.join(__dirname, 'temp_scan.scpt');

if (!fs.existsSync(DEST_LIBRARY)) fs.mkdirSync(DEST_LIBRARY, { recursive: true });

// --- 使用 AppleScript (AS) 而不是 JXA ---
// AS 在处理 application 对象集合时通常更符合直觉
const appleScript = `
tell application "Photos"
    set results to {}
    set allMedia to media items
    set totalCount to count of allMedia
    
    -- 只取最后 5 张
    if totalCount > 5 then
        set startIndex to totalCount - 4
    else
        set startIndex to 1
    end if
    
    repeat with i from startIndex to totalCount
        try
            set thisItem to item i of allMedia
            set itemID to id of thisItem
            set itemFilename to filename of thisItem
            set itemDate to date of thisItem
            
            -- 将日期转为 YYYY-MM
            set y to year of itemDate
            set m to month of itemDate as integer
            
            -- 构建简单的 JSON 字符串（AS 处理 JSON 很麻烦，我们手动拼）
            set jsonStr to "{\"id\":\"" & itemID & "\", \"filename\":\"" & itemFilename & "\", \"year\":" & y & ", \"month\":" & m & "}"
            copy jsonStr to end of results
        end try
    end repeat
    
    return results
end tell
`;

fs.writeFileSync(TEMP_AS_PATH, appleScript);

try {
    console.log("🔍 正在扫描 (AppleScript版)...");
    // 这里的输出会是一个类似 "{"{...}", "{...}"}" 的字符串列表，我们需要处理一下
    const output = execSync(`osascript "${TEMP_AS_PATH}"`).toString().trim();
    
    console.log("原始输出:", output);

    // 解析 AppleScript 的列表输出 (逗号分隔的字符串)
    // 这里的解析会比较脆弱，但为了演示先这样
    // 只要有输出，就说明路通了！
    
} catch (err) {
    console.error("❌ 发生错误:", err.message);
    if (err.stderr) console.error(err.stderr.toString());
}
