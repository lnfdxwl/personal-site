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

// 获取本地 skills 列表
router.get('/api/skills', (req, res) => {
  try {
    const skills = [];
    
    if (fs.existsSync(LOCAL_SKILLS_PATH)) {
      const items = fs.readdirSync(LOCAL_SKILLS_PATH, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isFile() && item.name.endsWith('.md')) {
          const filePath = path.join(LOCAL_SKILLS_PATH, item.name);
          const content = fs.readFileSync(filePath, 'utf-8');
          const stat = fs.statSync(filePath);
          
          // 从内容提取标题和描述
          const lines = content.split('\n');
          let title = item.name.replace('.md', '');
          let desc = '';
          
          for (const line of lines) {
            if (line.startsWith('# ') && !title.includes('##')) {
              title = line.replace('# ', '').trim();
            } else if (line.trim() && !line.startsWith('#') && !desc) {
              desc = line.trim();
            }
            if (title && desc) break;
          }
          
          skills.push({
            id: item.name.replace('.md', ''),
            name: title,
            description: desc || '暂无描述',
            filename: item.name,
            path: filePath,
            size: stat.size,
            mtime: stat.mtime
          });
        } else if (item.isDirectory()) {
          const skillPath = path.join(LOCAL_SKILLS_PATH, item.name);
          const skillMdPath = path.join(skillPath, 'SKILL.md');
          const stat = fs.statSync(skillPath);
          
          let content = '';
          if (fs.existsSync(skillMdPath)) {
            content = fs.readFileSync(skillMdPath, 'utf-8');
          }
          
          skills.push({
            id: item.name,
            name: item.name,
            description: content.slice(0, 100) || '暂无描述',
            filename: 'SKILL.md',
            path: skillPath,
            size: stat.size,
            mtime: stat.mtime,
            isDir: true
          });
        }
      }
    }
    
    // 按修改时间倒序
    skills.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
    
    res.json({ success: true, skills, path: LOCAL_SKILLS_PATH });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取单个技能详情
router.get('/api/skills/:id', (req, res) => {
  try {
    let filePath = path.join(LOCAL_SKILLS_PATH, `${req.params.id}.md`);
    let content = '';
    let isDir = false;
    
    // 检查是文件还是目录
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf-8');
    } else {
      filePath = path.join(LOCAL_SKILLS_PATH, req.params.id, 'SKILL.md');
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8');
        isDir = true;
      }
    }
    
    if (!content) {
      return res.json({ success: false, error: '技能不存在' });
    }
    
    const stat = fs.statSync(filePath);
    
    res.json({
      success: true,
      skill: {
        id: req.params.id,
        name: req.params.id,
        content,
        path: filePath,
        size: stat.size,
        mtime: stat.mtime,
        isDir
      }
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 新增技能
router.post('/api/skills', express.json(), (req, res) => {
  try {
    const { name, content } = req.body;
    
    if (!name || !name.trim()) {
      return res.json({ success: false, error: '技能名称不能为空' });
    }
    
    // 安全检查：只允许字母、数字、下划线、横线
    const safeName = name.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(LOCAL_SKILLS_PATH, `${safeName}.md`);
    
    if (fs.existsSync(filePath)) {
      return res.json({ success: false, error: '技能已存在' });
    }
    
    const skillContent = content || `# ${name}\n\n描述这个技能...\n`;
    fs.writeFileSync(filePath, skillContent, 'utf-8');
    
    res.json({ success: true, id: safeName, path: filePath });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 更新技能
router.put('/api/skills/:id', express.json(), (req, res) => {
  try {
    const { content } = req.body;
    let filePath = path.join(LOCAL_SKILLS_PATH, `${req.params.id}.md`);
    
    if (!fs.existsSync(filePath)) {
      filePath = path.join(LOCAL_SKILLS_PATH, req.params.id, 'SKILL.md');
    }
    
    if (!fs.existsSync(filePath)) {
      return res.json({ success: false, error: '技能不存在' });
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 删除技能
router.delete('/api/skills/:id', (req, res) => {
  try {
    let filePath = path.join(LOCAL_SKILLS_PATH, `${req.params.id}.md`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ success: true });
    }
    
    // 检查是否是目录
    filePath = path.join(LOCAL_SKILLS_PATH, req.params.id);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true });
      return res.json({ success: true });
    }
    
    res.json({ success: false, error: '技能不存在' });
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
    
    .skill-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
    .skill-item {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.3s;
      border: 1px solid rgba(255,255,255,0.1);
      display: flex;
      gap: 15px;
    }
    .skill-item:hover {
      border-color: #feca57;
      background: rgba(255,255,255,0.08);
      transform: translateY(-2px);
    }
    .skill-icon { font-size: 24px; }
    .skill-info { flex: 1; }
    .skill-name { font-weight: 600; color: #feca57; margin-bottom: 5px; }
    .skill-desc { font-size: 13px; color: #aaa; margin-bottom: 8px; }
    .skill-meta { font-size: 12px; color: #666; }
    
    .toolbar { margin-bottom: 20px; }
    .btn-primary {
      background: linear-gradient(90deg, #ff6b6b, #feca57);
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      color: #000;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .btn-primary:hover { transform: scale(1.05); }
    .btn-small {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      padding: 6px 12px;
      border-radius: 6px;
      color: #e0e0e0;
      cursor: pointer;
      margin-left: 8px;
    }
    .btn-small:hover { background: rgba(255,255,255,0.2); }
    .btn-danger { border-color: #ff6b6b; }
    .btn-danger:hover { background: rgba(255,107,107,0.2); }
    
    .card-actions { display: flex; gap: 10px; }
    .card-meta { font-size: 12px; color: #666; margin-bottom: 15px; font-family: monospace; }
    
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; margin-bottom: 8px; color: #feca57; }
    .input, .textarea {
      width: 100%;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 12px;
      color: #e0e0e0;
      font-size: 14px;
    }
    .input:focus, .textarea:focus {
      outline: none;
      border-color: #feca57;
    }
    .textarea { font-family: monospace; resize: vertical; }
    
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
      <div class="toolbar">
        <button class="btn-primary" onclick="showCreateSkill()">+ 新增技能</button>
      </div>
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
        el.innerHTML = '<div class="card">暂无本地技能，点击上方按钮新增</div>';
        return;
      }
      
      el.innerHTML = '<div class="skill-grid">' + data.skills.map(s => \`
        <div class="skill-item" onclick="showSkillDetail('\${s.id}')">
          <div class="skill-icon">🔧</div>
          <div class="skill-info">
            <div class="skill-name">\${s.name}</div>
            <div class="skill-desc">\${s.description.slice(0, 50)}\${s.description.length > 50 ? '...' : ''}</div>
            <div class="skill-meta">更新于 \${new Date(s.mtime).toLocaleDateString()}</div>
          </div>
        </div>
      \`).join('') + '</div>';
    }
    
    async function showSkillDetail(id) {
      const res = await fetch('/brain/api/skills/' + id);
      const data = await res.json();
      const el = document.getElementById('skills-list');
      
      if (!data.success) {
        el.innerHTML = '<div class="card">加载失败: ' + data.error + '</div>';
        return;
      }
      
      const s = data.skill;
      el.innerHTML = \`
        <a href="#" class="back-link" onclick="loadSkills(); return false;">← 返回技能列表</a>
        <div class="card">
          <div class="card-header">
            <div class="card-title">🔧 \${s.name}</div>
            <div class="card-actions">
              <button class="btn-small" onclick="editSkill('\${s.id}')">✏️ 编辑</button>
              <button class="btn-small btn-danger" onclick="deleteSkill('\${s.id}')">🗑️ 删除</button>
            </div>
          </div>
          <div class="card-meta">路径: \${s.path}</div>
          <div class="markdown-body">\${marked.parse(s.content)}</div>
        </div>
      \`;
    }
    
    function showCreateSkill() {
      const el = document.getElementById('skills-list');
      el.innerHTML = \`
        <a href="#" class="back-link" onclick="loadSkills(); return false;">← 返回技能列表</a>
        <div class="card">
          <div class="card-title">新增技能</div>
          <div class="form-group">
            <label>技能名称</label>
            <input type="text" id="skill-name" placeholder="例如: my_search" class="input">
          </div>
          <div class="form-group">
            <label>内容 (Markdown)</label>
            <textarea id="skill-content" class="textarea" rows="15" placeholder="# 技能名称&#10;&#10;描述这个技能的用途..."></textarea>
          </div>
          <button class="btn-primary" onclick="createSkill()">创建</button>
        </div>
      \`;
    }
    
    async function createSkill() {
      const name = document.getElementById('skill-name').value.trim();
      const content = document.getElementById('skill-content').value;
      
      if (!name) {
        alert('请输入技能名称');
        return;
      }
      
      const res = await fetch('/brain/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content })
      });
      const data = await res.json();
      
      if (data.success) {
        showSkillDetail(data.id);
      } else {
        alert('创建失败: ' + data.error);
      }
    }
    
    async function editSkill(id) {
      const res = await fetch('/brain/api/skills/' + id);
      const data = await res.json();
      const el = document.getElementById('skills-list');
      
      if (!data.success) {
        alert('加载失败');
        return;
      }
      
      el.innerHTML = \`
        <a href="#" class="back-link" onclick="showSkillDetail('\${id}'); return false;">← 取消</a>
        <div class="card">
          <div class="card-title">编辑技能: \${id}</div>
          <textarea id="skill-edit-content" class="textarea" rows="20">\${data.skill.content}</textarea>
          <button class="btn-primary" onclick="saveSkill('\${id}')">保存</button>
        </div>
      \`;
    }
    
    async function saveSkill(id) {
      const content = document.getElementById('skill-edit-content').value;
      
      const res = await fetch('/brain/api/skills/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      
      if (data.success) {
        showSkillDetail(id);
      } else {
        alert('保存失败: ' + data.error);
      }
    }
    
    async function deleteSkill(id) {
      if (!confirm('确定要删除技能 "' + id + '" 吗？此操作不可恢复！')) {
        return;
      }
      
      const res = await fetch('/brain/api/skills/' + id, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        loadSkills();
      } else {
        alert('删除失败: ' + data.error);
      }
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
