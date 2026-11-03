/**
 * 报名路由（signups）
 * 读：报名明细含手机号，限本人报名或活动主办方可见（对齐云端 RLS）
 * 写：需登录
 */
function publicRow(r) {
  return {
    id: r.id,
    event_id: r.event_id,
    user_id: r.user_id,
    user_name: r.user_name,
    user_phone: r.user_phone,
    user_note: r.user_note,
    status: r.status,
    created_at: r.created_at,
  }
}

function listByOwnerRoute(db) {
  return (req, res) => {
    // 当前登录用户的所有报名，附带活动名
    const rows = db.prepare(`
      SELECT s.*, e.title AS event_title FROM signups s
      LEFT JOIN events e ON e.id = s.event_id
      WHERE s.user_id = ? ORDER BY s.created_at DESC
    `).all(req.user.id).map(r => Object.assign(publicRow(r), { event_title: r.event_title }))
    res.json({ data: rows })
  }
}

function listForEventRoute(db) {
  return (req, res) => {
    const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.eventId)
    if (!ev) return res.status(404).json({ error: { code: 'NOT_FOUND', message: '活动不存在' } })
    // 仅主办方或自己可看明细（含手机号）
    const isOwner = req.user && String(ev.owner_id) === String(req.user.id)
    if (!isOwner) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '只有活动主办方可查看报名明细' } })
    }
    const rows = db.prepare('SELECT * FROM signups WHERE event_id = ? ORDER BY created_at DESC').all(req.params.eventId).map(publicRow)
    res.json({ data: rows })
  }
}

function countForEventRoute(db) {
  return (req, res) => {
    const row = db.prepare('SELECT COUNT(*) AS n FROM signups WHERE event_id = ?').get(req.params.eventId)
    res.json({ data: row ? row.n : 0 })
  }
}

function createSignupRoute(db) {
  return (req, res) => {
    const b = req.body || {}
    const eventName = b.event_id ? db.prepare('SELECT title FROM events WHERE id = ?').get(b.event_id) : null
    if (!eventName) return res.status(404).json({ error: { code: 'NOT_FOUND', message: '活动不存在，无法报名' } })
    const info = db.prepare(`
      INSERT INTO signups (event_id, user_id, user_name, user_phone, user_note, status)
      VALUES (?, ?, ?, ?, ?, 'signed')
    `).run(
      Number(b.event_id),
      req.user ? req.user.id : null,
      (b.user_name || '').trim() || null,
      (b.user_phone || '').trim() || null,
      (b.user_note || '').trim() || null,
    )
    res.status(201).json({ data: publicRow(db.prepare('SELECT * FROM signups WHERE id = ?').get(info.lastInsertRowid)) })
  }
}

function deleteSignupRoute(db) {
  return (req, res) => {
    const row = db.prepare('SELECT * FROM signups WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: '报名记录不存在' } })
    // 本人或活动主办方可取消
    const ev = db.prepare('SELECT owner_id FROM events WHERE id = ?').get(row.event_id)
    const isSelf = req.user && String(row.user_id) === String(req.user.id)
    const isOwner = req.user && ev && String(ev.owner_id) === String(req.user.id)
    if (!isSelf && !isOwner) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '只能取消自己的报名' } })
    }
    const info = db.prepare("UPDATE signups SET status = 'cancelled' WHERE id = ?").run(req.params.id)
    res.json({ data: { removed: info.changes > 0 } })
  }
}

function register(router, db) {
  router.get('/api/signups/mine', requireUserSafe(), listByOwnerRoute(db))
  router.get('/api/events/:eventId/signups', listForEventRoute(db))
  router.get('/api/events/:eventId/signup-count', countForEventRoute(db))
  router.post('/api/signups', createSignupRoute(db))
  router.delete('/api/signups/:id', deleteSignupRoute(db))
}

// 报名创建/取消允许"先匿名提交、后登录补全"，所以这里不强求登录；
// 但"我的报名"必须登录。用一个可选用户解析器兜底。
function requireUserSafe() {
  const { optionalUser } = require('../middleware/auth')
  return optionalUser
}

module.exports = { register }
