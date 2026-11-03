/**
 * 封面图存储路由（本地磁盘）
 * POST /api/upload/cover  需登录，multipart 字段名 cover，返回 { url }
 * 文件落地到 uploads/，由 server 里的静态路由 /uploads/* 对外提供只读访问
 */
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { UPLOAD_DIR, UPLOAD_PUBLIC_BASE } = require('../config')
const { requireUser } = require('../middleware/auth')

function coverUploadRoute() {
  return (req, res) => {
    const file = req.file
    if (!file) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: '未收到图片文件（字段名 cover）' } })
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase()
    const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`
    const target = path.join(UPLOAD_DIR, filename)
    fs.renameSync(file.path, target) // multer 临时文件移入 uploads
    const url = UPLOAD_PUBLIC_BASE ? `${UPLOAD_PUBLIC_BASE.replace(/\/$/, '')}/${filename}` : `/uploads/${filename}`
    res.status(201).json({ data: url })
  }
}

module.exports = { coverUploadRoute }
