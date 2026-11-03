/**
 * SQLite 数据库层（better-sqlite3，同步 API，简单可靠）。
 * - 首次启动自动建表 + 建索引
 * - 表：events / signups / users
 * - 权限语义对齐 WorkBuddy 云端的 RLS：
 *   读全开（活动/报名可匿名读），写操作必须登录（owner_id = 当前用户）
 */
const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')
const { DB_PATH } = require('../config')

function ensureDirs() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
}

function open() {
  ensureDirs()
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openid TEXT UNIQUE NOT NULL,
      unionid TEXT,
      nickname TEXT,
      avatar_url TEXT,
      phone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      owner_name TEXT,
      title TEXT NOT NULL,
      description TEXT,
      city TEXT,
      location TEXT,
      start_time TEXT,
      end_time TEXT,
      capacity INTEGER DEFAULT 0,
      cover_image_url TEXT,
      status TEXT NOT NULL DEFAULT 'published',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
    CREATE INDEX IF NOT EXISTS idx_events_owner ON events(owner_id);
    CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);

    CREATE TABLE IF NOT EXISTS signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      user_id INTEGER,
      user_name TEXT,
      user_phone TEXT,
      user_note TEXT,
      status TEXT NOT NULL DEFAULT 'signed',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_signups_event ON signups(event_id);
    CREATE INDEX IF NOT EXISTS idx_signups_user ON signups(user_id);
  `)
}

module.exports = { open, migrate }
