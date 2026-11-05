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
// 调用方名称（你的小程序名 / 开发者昵称，用于腾讯后台审计）
const TENCENT_REFERER = 'activity'
// 缓存 24h，避免每次冷启动都拉一次定位
const CACHE_TTL = 24 * 60 * 60 * 1000
const CACHE_KEY = 'geo_city_cache'
// ============ 配置区结束 ============

/**
 * 调用腾讯逆地理 API
 * @returns Promise<{ city, district, street, adcode }>
 */
function tencentReverseGeocode(lat, lng) {
  return new Promise((resolve, reject) => {
    if (!TENCENT_MAP_KEY || TENCENT_MAP_KEY.indexOf('YOUR_') === 0) {
      return reject(new Error('TENCENT_MAP_KEY 未配置，请在 utils/geo.js 填入 lbs.qq.com 申请的 key'))
    }
    const url =
      'https://apis.map.qq.com/ws/geocoder/v1/?location=' +
      encodeURIComponent(lat + ',' + lng) +
      '&key=' + encodeURIComponent(TENCENT_MAP_KEY) +
      '&output=json'

    wx.request({
      url,
      method: 'GET',
      success: (res) => {
        const body = res.data
        if (!body || body.status !== 0) {
          return reject(new Error((body && body.message) || '腾讯逆地理返回异常：' + res.statusCode))
        }
        const ac = body.result.address_component || {}
        // 注意：腾讯 address_component 的区县字段实际是 town（不是 district）
        resolve({
          city: ac.city || '',
          district: ac.town || ac.district || '',
          street: ac.street || '',
          streetNumber: ac.street_number || '',
          adcode: ac.adcode || '',
          province: ac.province || '',
        })
      },
      fail: (e) => reject(new Error('腾讯逆地理网络错误：' + (e.errMsg || ''))),
    })
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
