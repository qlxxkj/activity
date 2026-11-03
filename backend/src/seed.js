/**
 * 种子数据：建一个演示用户 + 5 场活动，便于首启即有内容。
 * 运行：node src/seed.js
 */
const { open } = require('./db')
const { code2Session, newToken } = require('./services/wechat')

function run() {
  const db = open()

  // 演示用户（mock openid，上线前可换成真实用户）
  let user = db.prepare('SELECT * FROM users WHERE openid = ?').get('demo-seed-owner')
  if (!user) {
    const info = db.prepare(
      "INSERT INTO users (openid, nickname, created_at) VALUES ('demo-seed-owner', '演示主办方', datetime('now')) RETURNING *"
    ).get()
    user = info
  }

  const events = [
    { title: '苏州河夜骑 · 城市灯光线', city: '上海', location: '静安区·苏州河畔集合点', start_time: '2026-11-08', capacity: 24, description: '沿苏州河骑行 12 公里，途经外白渡桥与四行仓库，配备领骑与收队。' },
    { title: '胡同里的下午茶读书会', city: '北京', location: '东城区·南锣鼓巷 32 号', start_time: '2026-11-09', capacity: 16, description: '本期共读《城记》，一起聊聊老北京的街巷变迁。' },
    { title: '人才公园晨跑 5 公里', city: '深圳', location: '南山区·人才公园东门', start_time: '2026-11-07', capacity: 30, description: '每周固定晨跑，配速 6 分左右，跑后一起拉伸与早餐。' },
    { title: '西湖晨雾摄影散步', city: '杭州', location: '西湖区·北山街断桥', start_time: '2026-11-10', capacity: 12, description: '清晨沿北山街拍摄晨雾与残荷，边走边拍。' },
    { title: '周末陶艺体验课', city: '上海', location: '徐汇区·永嘉路手作空间', start_time: '2026-11-15', capacity: 10, description: '从拉坯到上釉，两小时完成一件自己的杯子。' },
  ]

  const exists = db.prepare('SELECT COUNT(*) AS n FROM events').get().n
  if (exists > 0) {
    console.log('[seed] events 已有数据，跳过')
  } else {
    const ins = db.prepare(`
      INSERT INTO events (owner_id, owner_name, title, description, city, location, start_time, capacity, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published')
    `)
    for (const e of events) {
      ins.run(user.id, user.nickname, e.title, e.description, e.city, e.location, e.start_time, e.capacity)
    }
    console.log(`[seed] 插入 ${events.length} 场活动`)
  }
  console.log('[seed] 完成')
}

run()
