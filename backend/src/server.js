/**
 * 活动广场 · 后端服务入口
 * Node.js + Express + SQLite（better-sqlite3）
 *
 * 环境变量（见 src/config.js）：
 *   PORT              默认 3000
 *   WX_APPID          小程序 AppID
 *   WX_SECRET         小程序 AppSecret（code2session 必需，勿进前端/git）
 *   JWT_SECRET        会话签名密钥（生产必须替换）
 *   DATA_DIR          SQLite 文件目录，默认 backend/data
 *   UPLOAD_DIR        封面图目录，默认 工程根/uploads
 *   UPLOAD_PUBLIC_BASE 封面 URL 前缀（如 https://你的域名/uploads）
 *   CORS_ORIGINS      允许来源，逗号分隔，* 为全开
 */
const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const multer = require('multer')

const { open } = require('./db')
const { PORT, UPLOAD_DIR, CORS_ORIGINS } = require('./config')
const { register: registerEvents } = require('./routes/events')
const { register: registerSignups } = require('./routes/signups')
const { loginRoute, meRoute, profileRoute, adminLoginRoute } = require('./routes/auth')
const { coverUploadRoute } = require('./routes/storage')
const { requireUser, optionalUser } = require('./middleware/auth')

const app = express()
const db = open()
app.set('db', db)

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

// 信任反向代理（部署在 Nginx/Cloudflare 后面时取真实 IP）
app.set('trust proxy', true)
app.use(cors({
  origin: CORS_ORIGINS.includes('*') ? true : CORS_ORIGINS,
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))

// 封面图：本地磁盘存储，只读静态服务
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }))

// 服务端管理页（发布事项）：GET /admin → public/admin.html
const ADMIN_DIR = path.join(__dirname, '..', 'public')
app.get('/admin', (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'admin.html'))
})
app.get('/', (req, res) => {
  res.json({ ok: true, name: 'event-plaza-backend', docs: '/admin' })
})

// 上传（multer 临时落地 → 路由内改名移入 uploads/）
const upload = multer({ dest: path.join(UPLOAD_DIR, '.tmp') })
fs.mkdirSync(path.join(UPLOAD_DIR, '.tmp'), { recursive: true })
app.post('/api/upload/cover', requireUser, upload.single('cover'), coverUploadRoute())

// 认证
app.post('/api/auth/login', loginRoute(db))
app.get('/api/auth/me', optionalUser, meRoute(db))
app.put('/api/auth/profile', requireUser, profileRoute(db))
app.post('/api/auth/admin', adminLoginRoute(db)) // 服务端管理页登录（校验 ADMIN_TOKEN）

// 活动 + 报名
registerEvents(app, db)
registerSignups(app, db)

// 健康检查（部署探活用）
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() })
})

// 统一错误兜底
app.use((err, req, res, next) => {
  console.error('[server]', err.message)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: { code: 'TOO_LARGE', message: '文件过大' } })
  }
  res.status(500).json({ error: { code: 'INTERNAL', message: '服务器内部错误' } })
})

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[event-plaza] listening on :${PORT}`)
    console.log(`[event-plaza] sqlite: ${require('./config').DB_PATH}`)
    console.log(`[event-plaza] uploads: ${UPLOAD_DIR}`)
  })
}

module.exports = app
