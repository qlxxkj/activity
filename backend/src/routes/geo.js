/**
 * 地理位置逆地理路由
 * GET /api/geo/reverse?lat=31.23&lng=121.47
 *
 * 服务端调用腾讯 LBS（IP 授权模式），前端无需域名白名单 / 签名校验。
 * 需在腾讯 LBS 控制台把服务器出口 IP（207.211.161.100）加入 key 的「授权 IP」。
 *
 * 环境变量：
 *   TENCENT_MAP_KEY        LBS WebService key（必填）
 *   TENCENT_SIGN_SECRET    LBS 签名校验 secret（可选，填了则带 sk 参数）
 */

// Node 18+ 内置 fetch；服务器 Node 版本已支持
const TENCENT_MAP_KEY = process.env.TENCENT_MAP_KEY || ''
const TENCENT_SIGN_SECRET = process.env.TENCENT_SIGN_SECRET || ''

function sha1(str) {
  const crypto = require('crypto')
  return crypto.createHash('sha1').update(str, 'utf8').digest('hex')
}

function buildUrl(lat, lng) {
  const plain =
    'location=' + encodeURIComponent(lat + ',' + lng) +
    '&output=json'
  let url = 'https://apis.map.qq.com/ws/geocoder/v1/?' + plain +
    '&key=' + encodeURIComponent(TENCENT_MAP_KEY)
  if (TENCENT_SIGN_SECRET) {
    url += '&sk=' + sha1(plain + TENCENT_SIGN_SECRET)
  }
  return url
}

async function reverseGeocode(lat, lng) {
  if (!TENCENT_MAP_KEY) {
    return { ok: false, code: 'NO_KEY', message: 'TENCENT_MAP_KEY 未配置' }
  }
  try {
    const url = buildUrl(lat, lng)
    const resp = await fetch(url, {
      headers: { 'Referer': 'https://activity.70kj.vip/' },
    })
    const body = await resp.json()
    if (body.status !== 0) {
      return {
        ok: false,
        code: 'TENCENT_ERROR',
        message: body.message || ('腾讯返回 status=' + body.status),
        status: body.status,
      }
    }
    const ac = body.result && body.result.address_component || {}
    return {
      ok: true,
      data: {
        city: ac.city || '',
        district: ac.town || ac.district || '',
        street: ac.street || '',
        streetNumber: ac.street_number || '',
        adcode: ac.adcode || '',
        province: ac.province || '',
      },
    }
  } catch (e) {
    return { ok: false, code: 'NETWORK_ERROR', message: e.message }
  }
}

module.exports = { reverseGeocode }
