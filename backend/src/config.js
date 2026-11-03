/**
 * 后端运行配置。敏感值全部走环境变量，代码里不写死。
 * 本地开发可用 .env（在 .env.example 基础上复制）；
 * 服务器部署直接 export 或写进 systemd / Docker 即可。
 */
const path = require('path')

// 读取 .env（存在才读，不依赖 dotenv 包）
function loadDotEnv() {
  const file = path.join(__dirname, '..', '..', '.env')
  try {
    const fs = require('fs')
    if (!fs.existsSync(file)) return
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (!m) continue
      const key = m[1]
      let val = m[2].trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = val
    }
  } catch (e) {
    // 忽略 .env 读取失败，走已有环境变量
  }
}
loadDotEnv()

const BASE = process.env
const PORT = Number(process.env.PORT || 3000)

// 微信登录：code2session 需要 AppID + AppSecret（放服务器环境变量，别进前端/别提交 git）
const WX_APPID = process.env.WX_APPID || ''
const WX_SECRET = process.env.WX_SECRET || ''

// 数据与文件存储目录（相对 backend/ 工程根）
const ROOT = path.join(__dirname, '..')
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data')
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.env.PROJECT_ROOT || process.cwd(), 'uploads')
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.db')

// 前端允许访问的 host（CORS 白名单，逗号分隔；* 表示全开，仅开发期用）
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim())

// 封面文件 URL 前缀（浏览器可达地址），如 https://your-domain.com/uploads
const UPLOAD_PUBLIC_BASE = process.env.UPLOAD_PUBLIC_BASE || ''

module.exports = {
  PORT,
  WX_APPID,
  WX_SECRET,
  DB_PATH,
  DATA_DIR,
  UPLOAD_DIR,
  UPLOAD_PUBLIC_BASE,
  CORS_ORIGINS,
}
