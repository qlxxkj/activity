/**
 * 鉴权中间件。
 * - requireUser: 必须带有效 Bearer token，且 users 表里有对应记录，注入 req.user
 * - optionalUser: 匿名可访问（浏览活动/报名记录），有 token 则注入 req.user
 */
const { verifyToken } = require('../services/wechat')

function loadUser(db, payload) {
  if (!payload) return null
  return db.prepare('SELECT * FROM users WHERE openid = ?').get(payload.sub) || null
}

function requireUser(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const payload = verifyToken(token)
  const user = loadUser(req.app.get('db'), payload)
  if (!user) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '请先登录后再操作' } })
  }
  req.user = user
  next()
}

function optionalUser(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  req.user = loadUser(req.app.get('db'), verifyToken(token))
  next()
}

module.exports = { requireUser, optionalUser }
