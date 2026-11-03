/**
 * 活动路由（events）
 * 读：匿名可访问（浏览活动广场）
 * 写：需登录，owner_id = 当前用户
 */
const { optionalUser, requireUser } = require('../middleware/auth')

function publicRow(r) {
  return {
    id: r.id,
    owner_id: r.owner_id,
    owner_name: r.owner_name,
    title: r.title,
    description: r.description,
    city: r.city,
    location: r.location,
    start_time: r.start_time,
    end_time: r.end_time,
    capacity: r.capacity,
    cover_image_url: r.cover_image_url,
    status: r.status,
    created_at: r.created_at,
  }
}

function listEventsRoute(db) {
  return (req, res) => {
    const { city } = req.query
    let sql = 'SELECT * FROM events WHERE status = \'published\''
    const params = []
    if (city && city !== 'ALL') {
      sql += ' AND city = ?'
      params.push(city)
    }
    sql += ' ORDER BY created_at DESC'
    const rows = db.prepare(sql).all(...params).map(publicRow)
    res.json({ data: rows })
  }
}

function listCitiesRoute(db) {
  return (req, res) => {
    const rows = db.prepare(`
      SELECT city, COUNT(*) AS n FROM events
      WHERE status = 'published' AND city IS NOT NULL AND TRIM(city) <> ''
      GROUP BY city ORDER BY n DESC
    `).all()
    res.json({ data: rows.map(r => r.city) })
  }
}

function listByOwnerRoute(db) {
  return (req, res) => {
    const rows = db.prepare('SELECT * FROM events WHERE owner_id = ? ORDER BY created_at DESC').all(req.user.id).map(publicRow)
    res.json({ data: rows })
  }
}

function getEventRoute(db) {
  return (req, res) => {
    const row = db.prepare('SELECT * FROM events WHERE id = ? AND status = ?').get(req.params.id, 'published')
    if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: '活动不存在' } })
    res.json({ data: publicRow(row) })
  }
}

function createEventRoute(db) {
  return (req, res) => {
    const b = req.body || {}
    const title = (b.title || '').trim()
    if (!title) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: '活动名称不能为空' } })
    const info = db.prepare(`
      INSERT INTO events (owner_id, owner_name, title, description, city, location, start_time, end_time, capacity, cover_image_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
    `).run(
      req.user.id,
      req.user.nickname || '主办方',
      title,
      (b.description || '').trim() || null,
      (b.city || '').trim() || null,
      (b.location || '').trim() || null,
      b.start_time || null,
      b.end_time || null,
      b.capacity === '' || b.capacity == null ? 0 : Number(b.capacity),
      b.cover_image_url || null,
    )
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(info.lastInsertRowid)
    res.status(201).json({ data: publicRow(row) })
  }
}

function updateEventRoute(db) {
  return (req, res) => {
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: '活动不存在' } })
    if (String(row.owner_id) !== String(req.user.id)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '只能修改自己发布的活动' } })
    }
    const b = req.body || {}
    db.prepare(`
      UPDATE events SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        city = COALESCE(?, city),
        location = COALESCE(?, location),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        capacity = COALESCE(?, capacity),
        cover_image_url = COALESCE(?, cover_image_url),
        status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      b.title ?? null,
      b.description ?? null,
      b.city ?? null,
      b.location ?? null,
      b.start_time ?? null,
      b.end_time ?? null,
      b.capacity != null ? Number(b.capacity) : null,
      b.cover_image_url ?? null,
      b.status ?? null,
      req.params.id,
    )
    res.json({ data: publicRow(db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id)) })
  }
}

function deleteEventRoute(db) {
  return (req, res) => {
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: '活动不存在' } })
    if (String(row.owner_id) !== String(req.user.id)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '只能删除自己发布的活动' } })
    }
    const info = db.prepare("UPDATE events SET status = 'archived' WHERE id = ?").run(req.params.id)
    res.json({ data: { removed: info.changes > 0 } })
  }
}

function register(router, db) {
  router.get('/api/events', listEventsRoute(db))
  router.get('/api/events/cities', listCitiesRoute(db))
  router.get('/api/events/mine', optionalUser, listByOwnerRoute(db))
  router.get('/api/events/:id', getEventRoute(db))
  router.post('/api/events', requireUser, createEventRoute(db))
  router.put('/api/events/:id', requireUser, updateEventRoute(db))
  router.delete('/api/events/:id', requireUser, deleteEventRoute(db))
}

module.exports = { register }
