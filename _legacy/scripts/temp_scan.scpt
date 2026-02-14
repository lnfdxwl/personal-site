
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
            set jsonStr to "{"id":"" & itemID & "", "filename":"" & itemFilename & "", "year":" & y & ", "month":" & m & "}"
            copy jsonStr to end of results
        end try
    end repeat
    
    return results
end tell
