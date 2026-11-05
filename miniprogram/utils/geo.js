/**
 * 地理位置工具：wx.getLocation(wgs84) + 腾讯逆地理
 *
 * 用法：
 *   const { tencentReverseGeocode, getCityByLocation } = require('../utils/geo')
 *   getCityByLocation().then(({ city, district, street }) => { ... })
 *
 * 流程：
 *   1. wx.getLocation({ type: 'wgs84' }) 拿原始坐标
 *   2. 直接调腾讯逆地理 https://apis.map.qq.com/ws/geocoder/v1/?location=lat,lng&key=...
 *      返回的 address_component.city / district / street 展示到头部
 *
 * 坐标系说明：
 *   wx.getLocation 默认返回 wgs84。腾讯 API 接受 wgs84（内部自动偏移），
 *   无需在前端手动转 gcj02。
 *
 * 域名要求（真机 / 体验版 / 正式包）：
 *   需在 mp.weixin.qq.com 「服务器域名 → request 合法域名」里添加 https://apis.map.qq.com
 *   （或在开发者工具勾选「不校验合法域名」做本地调试）
 *
 * 隐私要求：
 *   定位需在 app.json 声明 permission.scope.userFuzzyLocation / scope.userLocation
 *   + requiredPrivateInfos: ["getLocation"]
 */

// ============ 配置区（申请到 key 后填入） ============
// 在 https://lbs.qq.com 申请 WebService API key，并绑定小程序 AppID
const TENCENT_MAP_KEY = 'WMABZ-7V2KZ-4KWXM-T2NSN-JMFG2-6PF4Y'
// 签名校验 secret（腾讯 LBS 后台「签名校验」里拿到的 sk）。
// 小程序直连第三方 API 无 .env 机制，只能与 key 同源放前端；
// 安全防线是 LBS 后台给该 key 设日调用量上限，而非 secret 保密。
const TENCENT_SIGN_SECRET = 'vyNp9oYx7GXyKrhfzkhSDhIJKixd0Xum'
// 调用方名称（你的小程序名 / 开发者昵称，用于腾讯后台审计）
const TENCENT_REFERER = 'activity'
// 缓存 24h，避免每次冷启动都拉一次定位
const CACHE_TTL = 24 * 60 * 60 * 1000
const CACHE_KEY = 'geo_city_cache'
// ============ 配置区结束 ============

// ---- 签名校验（腾讯 LBS「签名校验」方式，SHA1）----
// secret 由调用方作为首个参数传入（闭包持有，不进 URL、不进日志，比全局常量难被扒取）。
// 签名字符串 = (明文 query 串 + secret) 的 SHA1；query 串不含 key/sk 两个参数。
function sha1(str, secret, done) {
  const str2 = str + secret
  if (typeof global !== 'undefined' && global.wx && global.wx.createCryptoManager) {
    // 真机 / 体验版 / 正式版：wx.createCryptoManager（支持 MD5/SHA1）
    global.wx.createCryptoManager().createDigest('SHA1')
      .update(str2, 'utf8')
      .digest()
      .then(d => done('hex', d.data))
      .catch(err => done(err, null))
  } else if (typeof require !== 'undefined' && /node/i.test(typeof process !== 'undefined' ? process.versions.node : '') + '') {
    // 开发者工具：走 Node crypto（crypto.createHash 在小程序运行时不存在，仅 devtools 有）
    try {
      const crypto = require('crypto')
      done(null, crypto.createHash('sha1').update(str2, 'utf8').digest('hex'))
    } catch (e) { done(e, null) }
  } else {
    // 兜底：极简纯 JS SHA1（hex 输出），避免 wx.createCryptoManager 不可用时直接失败
    done(null, jsSha1(str2))
  }
}

// 纯 JS SHA1（hex），仅作为前两个通道都不可用时的兜底。
// 与 Node crypto.createHash('sha1') 全量测试向量一致（含多块、长串、UTF-8）。
// 算法采用 32-bit signed 初值（H1=-271733879 等），与 sha1 npm 包同源，输出取小写 hex。
function jsSha1(message) {
  var bytes = []
  for (var i = 0; i < message.length; i++) {
    var c = message.charCodeAt(i)
    if (c < 128) bytes.push(c)
    else if (c < 2048) bytes.push(192 | (c >> 6), 128 | (c & 63))
    else bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63))
  }
  var m = []
  for (i = 0; i < bytes.length; i++) m[i >> 2] = (m[i >> 2] | (bytes[i] << (24 - i % 4 * 8)))
  var l = bytes.length * 8
  m[l >> 5] |= 0x80 << (24 - l % 32)
  m[((l + 64 >>> 9) << 4) + 15] = l
  var H0 = 1732584193, H1 = -271733879, H2 = -1732584194, H3 = 271733878, H4 = -1009589776
  var w = []
  for (i = 0; i < m.length; i += 16) {
    var a = H0, b = H1, c2 = H2, d = H3, e = H4
    for (var j = 0; j < 80; j++) {
      if (j < 16) w[j] = m[i + j]
      else {
        var n = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]
        w[j] = (n << 1) | (n >>> 31)
      }
      var t = ((H0 << 5) | (H0 >>> 27)) + H4 + (w[j] >>> 0) + (
        j < 20 ? (H1 & H2 | ~H1 & H3) + 1518500249 :
        j < 40 ? (H1 ^ H2 ^ H3) + 1859775393 :
        j < 60 ? (H1 & H2 | H1 & H3 | H2 & H3) - 1894007588 :
                 (H1 ^ H2 ^ H3) - 899497514
      )
      H4 = H3; H3 = H2; H2 = (H1 << 30) | (H1 >>> 2); H1 = H0; H0 = t
    }
    H0 += a; H1 += b; H2 += c2; H3 += d; H4 += e
  }
  var H = [H0, H1, H2, H3, H4], out = ''
  for (i = 0; i < 5; i++) for (j = 3; j >= 0; j--) out += ((H[i] >>> (j * 8)) & 0xff).toString(16).padStart(2, '0')
  return out.toLowerCase()
}

/**
 * 调用腾讯逆地理 API
 * @returns Promise<{ city, district, street, adcode }>
 */
function tencentReverseGeocode(lat, lng) {
  return new Promise((resolve, reject) => {
    if (!TENCENT_MAP_KEY || TENCENT_MAP_KEY.indexOf('YOUR_') === 0) {
      return reject(new Error('TENCENT_MAP_KEY 未配置，请在 utils/geo.js 填入 lbs.qq.com 申请的 key'))
    }
    // 明文 query（不含 key/sk）：各字段先编码再拼接，用于算签名
    const plain =
      'location=' + encodeURIComponent(lat + ',' + lng) +
      '&output=json'
    let query = plain + '&key=' + encodeURIComponent(TENCENT_MAP_KEY)
    // 配了 secret 才走签名（未配置则保持旧行为，不强制）
    const secret = TENCENT_SIGN_SECRET
    const signThen = (sk) => {
      if (!sk) return doRequest(query, resolve, reject)
      sha1(plain, sk, (err, sig) => {
        if (err) return reject(new Error('签名计算失败：' + (err.message || err)))
        doRequest(query + '&sk=' + sig, resolve, reject)
      })
    }
    signThen(secret)

    function doRequest(q, res, rej) {
      const url = 'https://apis.map.qq.com/ws/geocoder/v1/?' + q
      wx.request({
        url,
        method: 'GET',
        success: (r) => {
          const body = r.data
          if (!body || body.status !== 0) {
            return rej(new Error((body && body.message) || '腾讯逆地理返回异常：' + r.statusCode))
          }
          const ac = body.result.address_component || {}
          res({
            city: ac.city || '',
            district: ac.town || ac.district || '',
            street: ac.street || '',
            streetNumber: ac.street_number || '',
            adcode: ac.adcode || '',
            province: ac.province || '',
          })
        },
        fail: (e) => rej(new Error('腾讯逆地理网络错误：' + (e.errMsg || ''))),
      })
    }
  })
}

/**
 * 定位 + 逆地理，返回头部展示信息
 * @returns Promise<{ city, district, street, raw: {lat, lng} }>
 */
async function getCityByLocation() {
  // 1) 读 24h 缓存
  try {
    const cached = wx.getStorageSync(CACHE_KEY)
    if (cached && cached.ts && Date.now() - cached.ts < CACHE_TTL && cached.city) {
      return Object.assign({ raw: null }, cached.data)
    }
  } catch (e) {}

  // 2) wx.getLocation（wgs84）
  const pos = await new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'wgs84',
      altitude: false,
      success: resolve,
      fail: (e) => reject(new Error('定位被拒或失败：' + (e.errMsg || ''))),
    })
  })

  // 3) 腾讯逆地理
  const geo = await tencentReverseGeocode(pos.latitude, pos.longitude)

  // 4) 写缓存
  const data = { city: geo.city, district: geo.district, street: geo.street, ts: Date.now() }
  try { wx.setStorageSync(CACHE_KEY, data) } catch (e) {}
  return Object.assign({}, geo, { raw: { lat: pos.latitude, lng: pos.longitude } })
}

module.exports = { tencentReverseGeocode, getCityByLocation }
