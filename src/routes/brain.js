const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();

// Paths
const WORKSPACE_PATH = '/Users/zhaozeyang/.openclaw/workspace';
const MEMORY_PATH = path.join(WORKSPACE_PATH, 'memory');
const LOCAL_SKILLS_PATH = path.join(WORKSPACE_PATH, 'local_skills');
const MEMORY_FILE = path.join(WORKSPACE_PATH, 'MEMORY.md');

// 获取日记列表
router.get('/api/diary', (req, res) => {
  try {
    const files = fs.readdirSync(MEMORY_PATH)
      .filter(f => f.endsWith('.md') && f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
      .sort((a, b) => b.localeCompare(a)); // 按日期倒序
    
    const diaries = files.map(file => {
      const filePath = path.join(MEMORY_PATH, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const date = file.replace('.md', '');
      return {
        date,
        filename: file,
        content,
        preview: content.slice(0, 200) + (content.length > 200 ? '...' : '')
      };
    });
    
    res.json({ success: true, diaries });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取单个日记
router.get('/api/diary/:date', (req, res) => {
  try {
    const filePath = path.join(MEMORY_PATH, `${req.params.date}.md`);
    if (!fs.existsSync(filePath)) {
      return res.json({ success: false, error: '日记不存在' });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ success: true, date: req.params.date, content });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取 MEMORY.md
router.get('/api/memory', (req, res) => {
  try {
    if (!fs.existsSync(MEMORY_FILE)) {
      return res.json({ success: false, error: 'MEMORY.md 不存在' });
    }
    const content = fs.readFileSync(MEMORY_FILE, 'utf-8');
    res.json({ success: true, content });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取本地 skills
router.get('/api/skills', (req, res) => {
  try {
    const skills = [];
    
    // 检查本地 skills 目录
    if (fs.existsSync(LOCAL_SKILLS_PATH)) {
      const items = fs.readdirSync(LOCAL_SKILLS_PATH, { withFileTypes: true });
      
      for (const item of items) {
        // 支持 .md 文件和目录两种形式
        if (item.isFile() && item.name.endsWith('.md')) {
          const filePath = path.join(LOCAL_SKILLS_PATH, item.name);
          const content = fs.readFileSync(filePath, 'utf-8');
          
          skills.push({
            name: item.name.replace('.md', ''),
            path: filePath,
            description: content.slice(0, 500) + (content.length > 500 ? '...' : ''),
            fullDescription: content
          });
        } else if (item.isDirectory()) {
          const skillPath = path.join(LOCAL_SKILLS_PATH, item.name);
          const skillMdPath = path.join(skillPath, 'SKILL.md');
          
          let description = '';
          if (fs.existsSync(skillMdPath)) {
            description = fs.readFileSync(skillMdPath, 'utf-8');
          }
          
          skills.push({
            name: item.name,
            path: skillPath,
            description: description.slice(0, 500) + (description.length > 500 ? '...' : ''),
            fullDescription: description
          });
        }
      }
    }
    
    res.json({ success: true, skills, path: LOCAL_SKILLS_PATH });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取 identity info
router.get('/api/identity', (req, res) => {
  try {
    const identity = {
      soul: '',
      user: '',
      identity: '',
      tools: ''
    };
    
    const soulPath = path.join(WORKSPACE_PATH, 'SOUL.md');
    const userPath = path.join(WORKSPACE_PATH, 'USER.md');
    const identityPath = path.join(WORKSPACE_PATH, 'IDENTITY.md');
    const toolsPath = path.join(WORKSPACE_PATH, 'TOOLS.md');
    
    if (fs.existsSync(soulPath)) identity.soul = fs.readFileSync(soulPath, 'utf-8');
    if (fs.existsSync(userPath)) identity.user = fs.readFileSync(userPath, 'utf-8');
    if (fs.existsSync(identityPath)) identity.identity = fs.readFileSync(identityPath, 'utf-8');
    if (fs.existsSync(toolsPath)) identity.tools = fs.readFileSync(toolsPath, 'utf-8');
    
    res.json({ success: true, identity });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Brain 主页面
router.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🐱 棉子的脑子</title>
  <link href="https://cdn.jsdelivr.net/npm/github-markdown-css@5/github-markdown.min.css" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      color: #e0e0e0;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { 
      text-align: center; 
      padding: 30px 0; 
      font-size: 2.5em;
      background: linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .tabs {
      display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;
    }
    .tab {
      padding: 12px 24px; background: rgba(255,255,255,0.1); 
      border: none; border-radius: 8px; cursor: pointer;
      color: #e0e0e0; font-size: 16px; transition: all 0.3s;
    }
    .tab:hover { background: rgba(255,255,255,0.2); }
    .tab.active { background: #ff6b6b; color: white; }
    
    .panel { display: none; }
    .panel.active { display: block; }
    
    .card {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 15px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .card-title { font-size: 18px; font-weight: 600; color: #48dbfb; }
    .card-date { font-size: 14px; color: #888; }
    
    .markdown-body { 
      background: transparent !important; 
      color: #e0e0e0 !important;
    }
    .markdown-body h1, .markdown-body h2, .markdown-body h3 {
      color: #feca57 !important;
      border-bottom-color: rgba(255,255,255,0.1) !important;
    }
    .markdown-body a { color: #48dbfb !important; }
    .markdown-body code { background: rgba(255,255,255,0.1) !important; }
    
    .diary-list { max-height: 80vh; overflow-y: auto; }
    .diary-item {
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.3s;
      border: 1px solid transparent;
    }
    .diary-item:hover { 
      border-color: #ff6b6b;
      background: rgba(255,255,255,0.08);
    }
    .diary-date { font-weight: 600; color: #48dbfb; margin-bottom: 8px; }
    .diary-preview { font-size: 14px; color: #aaa; }
    
    .skill-card {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 15px;
      border-left: 4px solid #feca57;
    }
    .skill-name { font-size: 18px; font-weight: 600; color: #feca57; margin-bottom: 10px; }
    .skill-path { font-size: 12px; color: #666; margin-bottom: 10px; font-family: monospace; }
    
    .identity-section {
      margin-bottom: 30px;
    }
    .identity-title {
      font-size: 20px;
      color: #feca57;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid rgba(255,255,255,0.1);
    }
    
    .back-link {
      display: inline-block;
      margin-bottom: 20px;
      color: #48dbfb;
      text-decoration: none;
    }
    .back-link:hover { text-decoration: underline; }
    
    pre { 
      white-space: pre-wrap; 
      word-wrap: break-word;
      background: rgba(0,0,0,0.3);
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
    }
    
    .loading { text-align: center; padding: 40px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🐱 棉子的脑子</h1>
    
    <div class="tabs">
      <button class="tab active" onclick="showPanel('diary')">📔 日记</button>
      <button class="tab" onclick="showPanel('memory')">🧠 长期记忆</button>
      <button class="tab" onclick="showPanel('skills')">🔧 技能</button>
      <button class="tab" onclick="showPanel('identity')">🐱 我是谁</button>
    </div>
    
    <div id="diary" class="panel active">
      <div class="diary-list" id="diary-list">
        <div class="loading">加载中...</div>
      </div>
    </div>
    
    <div id="memory" class="panel">
      <div id="memory-content" class="markdown-body"><div class="loading">加载中...</div></div>
    </div>
    
    <div id="skills" class="panel">
      <div id="skills-list"><div class="loading">加载中...</div></div>
    </div>
    
    <div id="identity" class="panel">
      <div id="identity-content"><div class="loading">加载中...</div></div>
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script>
    function showPanel(name) {
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById(name).classList.add('active');
      event.target.classList.add('active');
    }
    
    async function loadDiaries() {
      const res = await fetch('/brain/api/diary');
      const data = await res.json();
      const list = document.getElementById('diary-list');
      
      if (!data.success) {
        list.innerHTML = '<div class="card">加载失败: ' + data.error + '</div>';
        return;
      }
      
      list.innerHTML = data.diaries.map(d => \`
        <div class="diary-item" onclick="showDiary('\${d.date}')">
          <div class="diary-date">📅 \${d.date}</div>
          <div class="diary-preview">\${d.preview || '(空日记)'}</div>
        </div>
      \`).join('');
    }
    
    async function showDiary(date) {
      const res = await fetch('/brain/api/diary/' + date);
      const data = await res.json();
      
      const list = document.getElementById('diary-list');
      if (data.success) {
        list.innerHTML = \`
          <a href="#" class="back-link" onclick="loadDiaries(); return false;">← 返回日记列表</a>
          <div class="card">
            <div class="card-header">
              <div class="card-title">📅 \${data.date}</div>
            </div>
            <div class="markdown-body">\${marked.parse(data.content || '(空)')}</div>
          </div>
        \`;
      }
    }
    
    async function loadMemory() {
      const res = await fetch('/brain/api/memory');
      const data = await res.json();
      const el = document.getElementById('memory-content');
      
      if (data.success) {
        el.innerHTML = marked.parse(data.content);
      } else {
        el.innerHTML = '<div class="card">加载失败: ' + data.error + '</div>';
      }
    }
    
    async function loadSkills() {
      const res = await fetch('/brain/api/skills');
      const data = await res.json();
      const el = document.getElementById('skills-list');
      
      if (!data.success) {
        el.innerHTML = '<div class="card">加载失败: ' + data.error + '</div>';
        return;
      }
      
      if (data.skills.length === 0) {
        el.innerHTML = '<div class="card">暂无本地技能</div>';
        return;
      }
      
      el.innerHTML = data.skills.map(s => \`
        <div class="skill-card">
          <div class="skill-name">🔧 \${s.name}</div>
          <div class="skill-path">\${s.path}</div>
          <div class="markdown-body">\${marked.parse(s.description || '暂无描述')}</div>
        </div>
      \`).join('');
    }
    
    async function loadIdentity() {
      const res = await fetch('/brain/api/identity');
      const data = await res.json();
      const el = document.getElementById('identity-content');
      
      if (!data.success) {
        el.innerHTML = '<div class="card">加载失败: ' + data.error + '</div>';
        return;
      }
      
      const id = data.identity;
      el.innerHTML = \`
        <div class="identity-section">
          <div class="identity-title">🐱 身份</div>
          <div class="markdown-body">\${marked.parse(id.identity)}</div>
        </div>
        <div class="identity-section">
          <div class="identity-title">👤 主人</div>
          <div class="markdown-body">\${marked.parse(id.user)}</div>
        </div>
        <div class="identity-section">
          <div class="identity-title">💝 灵魂</div>
          <div class="markdown-body">\${marked.parse(id.soul)}</div>
        </div>
        <div class="identity-section">
          <div class="identity-title">🔧 工具配置</div>
          <div class="markdown-body">\${marked.parse(id.tools)}</div>
        </div>
      \`;
    }
    
    // 初始化加载
    loadDiaries();
    loadMemory();
    loadSkills();
    loadIdentity();
  </script>
</body>
</html>
  `);
});

module.exports = router;
