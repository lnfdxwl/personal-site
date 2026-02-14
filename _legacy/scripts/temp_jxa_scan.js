
var app = Application("Photos");
var results = [];

// 获取所有媒体项的引用
var allMedia = app.mediaItems;

// 这是一个极其耗时的操作，如果库很大。
// 为了测试，我们用 "lastItem" 属性。
// JXA 不支持 negative index slice。
// 我们获取总数（可能会卡一下）
var count = allMedia.length; 
var limit = 5; // 先取 5 张！确保能跑通！
var start = Math.max(0, count - limit);

for (var i = start; i < count; i++) {
    var item = allMedia[i]; // 按索引访问
    try {
        var date = item.date();
        var year = date.getFullYear();
        var month = ("0" + (date.getMonth() + 1)).slice(-2);
        
        results.push({
            id: item.id(),
            filename: item.filename(),
            favorite: item.favorite(),
            mediaType: item.mediaType(),
            date: date.toISOString(),
            year: year,
            month: month
        });
    } catch(e) {
        // 忽略单张错误
    }
}

JSON.stringify(results);
