/**
 * 微信登录服务：小程序 wx.login() 拿到 code → 调 code2session 换 openid → 本地建/找用户 → 签 JWT 会话。
 * 无 AppSecret 时降级为 mock openid（开发期可用，上线必须配）。
 */
const crypto = require('crypto')
const { WX_APPID, WX_SECRET } = require('../config')

const SESSION_TTL_SEC = 30 * 24 * 3600 // 30 天
// 生产部署请替换为强随机值（openssl rand -hex 32），开发期允许省略
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-prod'

function nowTs() {
  return Math.floor(Date.now() / 1000)
}

function signJws(payload, secret) {
  const base64url = s => Buffer.from(s).toString('base64url')
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload))
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

async function code2Session(code) {
  // 真微信接口
  if (WX_APPID && WX_SECRET) {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(WX_APPID)}&secret=${encodeURIComponent(WX_SECRET)}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
    const res = await fetch(url)
    const json = await res.json()
    if (json.errcode) {
      const err = new Error(`code2session errcode ${json.errcode}: ${json.errmsg}`)
      err.code = json.errcode
      throw err
    }
    return { openid: json.openid, unionid: json.unionid, sessionKey: json.session_key }
  }
  // 降级：无 AppSecret 时用 code 派生稳定 mock openid（开发期跑通页面用，上线前必须配置真实 AppSecret）
  const mockOpenid = 'mock_' + crypto.createHash('sha1').update(code || 'anon').digest('hex').slice(0, 24)
  return { openid: mockOpenid, unionid: null, sessionKey: null }
}

function newToken(openid) {
  return signJws({ sub: openid, exp: nowTs() + SESSION_TTL_SEC }, JWT_SECRET)
}

function verifyToken(token) {
  if (!token) return null
  const [h, b, s] = String(token).split('.')
  if (!h || !b || !s) return null
  const expect = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url')
  if (expect !== s) return null
  const payload = JSON.parse(Buffer.from(b, 'base64url').toString('utf8'))
  if (payload.exp && payload.exp < nowTs()) return null
  return payload
}

module.exports = { code2Session, newToken, verifyToken, JWT_SECRET }
