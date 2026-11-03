/**
 * 微信登录路由：POST /api/auth/login
 * 入参 { code }（wx.login 的 code）→ 换 openid → upsert users → 返回 { token, user }
 * Express 4 要求 handler 是普通函数；用 next 接管异步错误。
 */
const { code2Session, newToken } = require('../services/wechat')

function loginRoute(db) {
  return (req, res, next) => {
    (async () => {
      const { code } = req.body || {}
      if (!code) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: '缺少 code' } })
      }
      let session
      try {
        session = await code2Session(code)
      } catch (e) {
        return res.status(401).json({ error: { code: 'WX_LOGIN_FAILED', message: e.message || '微信授权失败' } })
      }
      const now = new Date().toISOString()
      const info = db.prepare(`
        INSERT INTO users (openid, unionid, nickname, created_at)
        VALUES (?, ?, '微信用户', ?)
        ON CONFLICT(openid) DO UPDATE SET
          unionid = COALESCE(excluded.unionid, users.unionid),
          nickname = COALESCE(users.nickname, '微信用户')
        RETURNING *
      `).get(session.openid, session.unionid, now)
      const token = newToken(session.openid)
      const user = {
        id: info.id,
        name: info.nickname,
        avatar_url: info.avatar_url,
        openid: info.openid,
      }
      res.json({ token, user })
    })().catch(next)
  }
}

function meRoute(db) {
  return (req, res) => {
    if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '未登录' } })
    res.json({
      user: {
        id: req.user.id,
        name: req.user.nickname,
        avatar_url: req.user.avatar_url,
        openid: req.user.openid,
      },
    })
  }
}

function profileRoute(db) {
  return (req, res) => {
    const { nickname, avatar_url } = req.body || {}
    if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '未登录' } })
    const fields = []
    const params = []
    if (typeof nickname === 'string' && nickname.trim()) {
      fields.push('nickname = ?')
      params.push(nickname.trim().slice(0, 30))
    }
    if (typeof avatar_url === 'string') {
      fields.push('avatar_url = ?')
      params.push(avatar_url)
    }
    if (fields.length) {
      db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params, req.user.id)
    }
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
    res.json({ user: { id: row.id, name: row.nickname, avatar_url: row.avatar_url } })
  }
}

module.exports = { loginRoute, meRoute, profileRoute }
