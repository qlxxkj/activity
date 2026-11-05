/**
 * 地理位置工具：wx.getLocation(wgs84) → 后端 /api/geo/reverse → 腾讯逆地理
 *
 * 用法：
 *   const { getCityByLocation } = require('../utils/geo')
 *   getCityByLocation().then(({ city, district, street }) => { ... })
 *
 * 流程：
 *   1. wx.getLocation({ type: 'wgs84' }) 拿原始坐标
 *   2. 调后端 GET /api/geo/reverse?lat=&lng=（服务端 IP 授权腾讯 LBS）
 *      返回 city / district / street 展示到头部
 *
 * 坐标系：
 *   wx.getLocation 默认返回 wgs84，腾讯 API 接受 wgs84（内部自动偏移），
 *   无需在前端手动转 gcj02。
 *
 * 域名要求（真机 / 体验版 / 正式包）：
 *   只需在 mp.weixin.qq.com 「服务器域名 → request 合法域名」里添加 https://activity.70kj.vip
 *   （不再需要添加 https://apis.map.qq.com，逆地理走后端代理）
 *
 * 隐私要求：
 *   定位需在 app.json 声明 permission.scope.userFuzzyLocation / scope.userLocation
 *   + requiredPrivateInfos: ["getLocation"]
 */

// 后端地址（与 cloud.js 保持一致；geo.js 不引入 cloud.js 避免循环依赖，单独取常量）
const BASE_URL = 'https://activity.70kj.vip'

// 缓存 24h，避免每次冷启动都拉一次定位
const CACHE_TTL = 24 * 60 * 60 * 1000
const CACHE_KEY = 'geo_city_cache'

/**
 * 调后端逆地理接口（服务端调腾讯 LBS，IP 授权）
 * @returns Promise<{ city, district, street, streetNumber, adcode, province }>
 */
function reverseGeocode(lat, lng) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + '/api/geo/reverse?lat=' + encodeURIComponent(lat) + '&lng=' + encodeURIComponent(lng),
      method: 'GET',
      success: (r) => {
        const body = r.data
        if (!body || !body.ok) {
          // 友好提示，不暴露后端地址或技术细节
          return reject(new Error('定位服务暂时不可用，请稍后再试'))
        }
        resolve(body.data)
      },
      fail: () => reject(new Error('定位服务暂时不可用，请稍后再试')),
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
      fail: () => reject(new Error('定位被拒或失败，请授予定位权限后重试')),
    })
  })

  // 3) 后端逆地理
  const geo = await reverseGeocode(pos.latitude, pos.longitude)

  // 4) 写缓存
  const data = { city: geo.city, district: geo.district, street: geo.street, ts: Date.now() }
  try { wx.setStorageSync(CACHE_KEY, data) } catch (e) {}
  return Object.assign({}, geo, { raw: { lat: pos.latitude, lng: pos.longitude } })
}

module.exports = { reverseGeocode, getCityByLocation }
