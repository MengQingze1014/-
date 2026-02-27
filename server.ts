import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import Database from "better-sqlite3";

dotenv.config();

// Initialize SQLite Database for multi-user support
const db = new Database('app.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    avatar TEXT
  );
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT,
    url TEXT,
    type TEXT,
    category TEXT,
    content TEXT
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // OAuth Endpoints for Xiaohongshu
  app.get("/api/auth/url", (req, res) => {
    // Redirect to our simulated Xiaohongshu User Client login page
    const authUrl = `${process.env.APP_URL}/simulate-xhs-login`;
    res.json({ url: authUrl });
  });

  // Simulated Xiaohongshu User Client Login Page
  app.get("/simulate-xhs-login", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>小红书 - 标记我的生活</title>
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8f8f8; display: flex; justify-content: center; align-items: center; height: 100vh; }
          .login-container { background: white; width: 400px; border-radius: 20px; padding: 40px; box-shadow: 0 8px 24px rgba(0,0,0,0.05); text-align: center; position: relative; }
          .logo { color: #ff2442; font-size: 24px; font-weight: bold; margin-bottom: 30px; letter-spacing: 1px; }
          .qr-wrapper { width: 200px; height: 200px; margin: 0 auto 20px; border: 1px solid #eee; border-radius: 12px; padding: 10px; position: relative; cursor: pointer; overflow: hidden; }
          .qr-code { width: 100%; height: 100%; background: url('https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=xiaohongshu-login-simulation') center/cover; }
          .hint { font-size: 16px; color: #333; font-weight: 500; margin-bottom: 8px; }
          .sub-hint { font-size: 14px; color: #999; }
          .agreement { margin-top: 30px; font-size: 12px; color: #999; }
          .agreement a { color: #1f649e; text-decoration: none; }
          .scan-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.9); display: flex; flex-direction: column; justify-content: center; align-items: center; opacity: 0; transition: opacity 0.3s; }
          .qr-wrapper:hover .scan-overlay { opacity: 1; }
          .scan-btn { background: #ff2442; color: white; border: none; padding: 8px 20px; border-radius: 20px; font-size: 14px; cursor: pointer; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="login-container">
          <div class="logo">小红书</div>
          <div class="qr-wrapper" onclick="simulateScan()">
            <div class="qr-code"></div>
            <div class="scan-overlay">
              <button class="scan-btn" id="actionBtn">点击模拟扫码</button>
            </div>
          </div>
          <div class="hint">打开小红书App扫码登录</div>
          <div class="sub-hint">「别躺了」请求获取您的公开信息及收藏夹</div>
          <div class="agreement">
            登录即代表同意 <a href="#">用户协议</a> 和 <a href="#">隐私政策</a>
          </div>
        </div>
        <script>
          function simulateScan() {
            const btn = document.getElementById('actionBtn');
            btn.innerText = '扫码成功，登录中...';
            btn.style.background = '#52c41a';
            setTimeout(() => {
              window.location.href = '/auth/callback?code=mock_user_client_code_123';
            }, 800);
          }
        </script>
      </body>
      </html>
    `);
  });

  app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
    const { code } = req.query;
    
    // Simulate exchanging code for access token and fetching user profile
    // For the MVP, we create a mock user profile for the current user
    const mockUser = {
      id: 'u_' + Math.random().toString(36).substr(2, 9),
      name: 'Clarie',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Clarie&backgroundColor=f9f9f9'
    };

    // Upsert user into DB (Multi-user architecture foundation)
    const stmt = db.prepare('INSERT OR REPLACE INTO users (id, name, avatar) VALUES (?, ?, ?)');
    stmt.run(mockUser.id, mockUser.name, mockUser.avatar);
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>授权成功</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f9f9f9; }
            .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: center; }
            .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #000; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <p>授权成功，正在返回应用...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                user: ${JSON.stringify(mockUser)} 
              }, '*');
              setTimeout(() => window.close(), 1000);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  });

  // API to fetch favorites for a specific user
  app.get("/api/xhs/favorites", async (req, res) => {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    // Check if user has notes, if not, seed them with realistic mock data
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ?');
    const { count } = countStmt.get(userId) as { count: number };

    if (count === 0) {
      const mockNotes = [
        { id: 'n1', title: '一周减脂餐食谱，亲测有效！', url: 'https://xiaohongshu.com/explore/1', type: 'text', category: '健身减脂', content: '周一：燕麦粥+水煮蛋。周二：全麦面包+鸡胸肉。周三：紫薯+牛肉沙拉。重点是少油少盐，多吃高蛋白。' },
        { id: 'n2', title: '新手无氧运动指南', url: 'https://xiaohongshu.com/explore/2', type: 'video', category: '健身减脂', content: '深蹲、硬拉、卧推的基础动作要领。深蹲注意膝盖不要内扣，硬拉注意背部挺直。' },
        { id: 'n3', title: '广州必吃的三家老字号早茶', url: 'https://xiaohongshu.com/explore/3', type: 'image', category: '美食菜谱', content: '点都德、广州酒家、陶陶居的必点菜品推荐：虾饺、凤爪、红米肠。去广州酒家一定要点虾饺皇。' },
        { id: 'n4', title: 'OOTD | 秋季微胖女孩穿搭', url: 'https://xiaohongshu.com/explore/4', type: 'image', category: '穿搭灵感', content: 'A字裙遮肉，V领毛衣显瘦，搭配马丁靴拉长腿型。颜色推荐大地色系，高级又显白。' },
        { id: 'n5', title: 'React Hooks 核心原理解析', url: 'https://xiaohongshu.com/explore/5', type: 'text', category: '学习干货', content: 'useState和useEffect的底层闭包陷阱及依赖数组的最佳实践。记得在useEffect中清理副作用。' },
        { id: 'n6', title: '川西自驾游7天详细攻略', url: 'https://xiaohongshu.com/explore/6', type: 'text', category: '旅行攻略', content: '成都出发-康定-新都桥-理塘-稻城亚丁。注意高反，带好氧气瓶和厚衣服。' }
      ];
      const insertStmt = db.prepare('INSERT INTO notes (id, user_id, title, url, type, category, content) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const insertMany = db.transaction((notes) => {
        for (const note of notes) {
          insertStmt.run(note.id + '_' + userId, userId, note.title, note.url, note.type, note.category, note.content);
        }
      });
      insertMany(mockNotes);
    }

    const categoriesStmt = db.prepare('SELECT category as name, COUNT(*) as count FROM notes WHERE user_id = ? GROUP BY category');
    const categories = categoriesStmt.all(userId);
    const totalStmt = db.prepare('SELECT COUNT(*) as total FROM notes WHERE user_id = ?');
    const { total } = totalStmt.get(userId) as { total: number };

    res.json({ 
      success: true, 
      data: {
        total,
        categories
      } 
    });
  });

  // API to fetch all notes content for AI context
  app.get("/api/xhs/notes", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const notesStmt = db.prepare('SELECT * FROM notes WHERE user_id = ?');
    const notes = notesStmt.all(userId);
    res.json({ success: true, data: notes });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
