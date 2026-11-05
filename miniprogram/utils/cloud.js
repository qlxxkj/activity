/**
 * 前端后端 API 客户端
 * 把原 WorkBuddy 云 SDK 替换为自研后端（Node + Express + SQLite）。
 * 所有请求走统一的 base 域名，带 Bearer token（若有会话）。
 *
 * 后端部署在哪，就把 BASE_URL 改成哪：
 *   本地联调  → http://127.0.0.1:3000
 *   你自己的服务器 → https://你的域名
 */
// 后端地址：本地联调用 http://127.0.0.1:3000；部署到自己服务器后改成 https://你的域名
const BASE_URL = 'https://activity.70kj.vip'

// 会话存取（token + user），与旧 app.js 的 ensureSession 语义对齐
const TOKEN_KEY = 'ep_token'
const USER_KEY = 'ep_user'

function getStored() {
  try {
    const token = wx.getStorageSync(TOKEN_KEY)
    const user = wx.getStorageSync(USER_KEY)
    return { token: token || '', user: user || null }
  } catch (e) {
    return { token: '', user: null }
  }
}

function setStored(token, user) {
  try {
    if (token) wx.setStorageSync(TOKEN_KEY, token)
    else wx.removeStorageSync(TOKEN_KEY)
    if (user) wx.setStorageSync(USER_KEY, user)
    else wx.removeStorageSync(USER_KEY)
  } catch (e) {}
}

// 用户可见错误消息映射：把内部技术细节替换为友好提示，不暴露服务器地址
function friendlyError(e) {
  if (!e) return '加载失败，请稍后重试'
  const msg = e.message || ''
  if (msg.indexOf('无法连接') !== -1 || msg.indexOf('网络错误') !== -1 || msg.indexOf('request:fail') !== -1) {
    return '网络不稳定，请检查网络连接后重试'
  }
  if (e.status === 401 || e.code === 'UNAUTHORIZED' || msg.indexOf('登录') !== -1) {
    return '请先登录后再试'
  }
  if (e.status === 403 || e.code === 'FORBIDDEN') {
    return '暂无权限查看该内容'
  }
  if (e.status === 404 || e.code === 'NOT_FOUND') {
    return '内容不存在或已删除'
  }
  if (e.status >= 500 || e.code === 'INTERNAL') {
    return '服务器开小差了，请稍后再试'
  }
  // 后端自定义 message 可展示（通常是业务语义，非技术细节）
  if (msg && msg !== '请求失败') return msg
  return '加载失败，请稍后重试'
}

function request(method, path, { body, auth = true, raw = false } = {}) {
  return new Promise((resolve, reject) => {
    const { token } = getStored()
    const header = { 'Content-Type': 'application/json' }
    if (auth && token) header.Authorization = 'Bearer ' + token
    wx.request({
      url: BASE_URL.replace(/\/$/, '') + path,
      method,
      data: body,
      header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(raw ? res.data : res.data)
          return
        }
        const err = (res.data && res.data.error) || { message: 'HTTP ' + res.statusCode }
        const e = new Error(err.message || '请求失败')
        e.code = err.code
        e.status = res.statusCode
        reject(e)
      },
      fail: (e) => {
        reject(new Error('无法连接服务器'))
      },
    })
  })
}

const cloud = {
  auth: {
    // 等价旧 getSession：返回 { data: { user } }，未登录 user 为 null
    async getSession() {
      const { token, user } = getStored()
      if (!user) return { data: { user: null } }
      // 校验 token 是否仍有效
      try {
        const res = await request('GET', '/api/auth/me', { auth: !!token })
        return { data: { user: res.user } }
      } catch (e) {
        setStored('', null)
        return { data: { user: null } }
      }
    },
    // 等价旧 signInWithWechat：传 wx.login 的 code，换会话
    async signInWithWechat(code) {
      const res = await request('POST', '/api/auth/login', { body: { code }, auth: false })
      setStored(res.token, res.user)
      return { data: { user: res.user } }
    },
    async signOut() {
      setStored('', null)
      return { data: {} }
    },
  },
  database: null, // 旧接口占位，data-access 已切到下方 api
  // 供 data-access 调用的 API 封装（统一返回 { data, error }）
  api: {
    async listEvents(city) {
      const q = city && city !== 'ALL' ? '?city=' + encodeURIComponent(city) : ''
      try {
        const res = await request('GET', '/api/events' + q)
        return { data: res.data || [], error: null }
      } catch (e) {
        return { data: [], error: e }
      }
    },
    async listCities() {
      try {
        const res = await request('GET', '/api/events/cities')
        return { data: res.data || [], error: null }
      } catch (e) {
        return { data: [], error: e }
      }
    },
    async listEventsByOwner() {
      try {
        const res = await request('GET', '/api/events/mine')
        return { data: res.data || [], error: null }
      } catch (e) {
        return { data: [], error: e }
      }
    },
    async getEvent(id) {
      try {
        const res = await request('GET', '/api/events/' + id)
        return { data: res.data, error: null }
      } catch (e) {
        return { data: null, error: e }
      }
    },
    async createEvent(payload) {
      try {
        const res = await request('POST', '/api/events', { body: payload })
        return { data: res.data, error: null }
      } catch (e) {
        return { data: null, error: e }
      }
    },
    async updateEvent(id, payload) {
      try {
        const res = await request('PUT', '/api/events/' + id, { body: payload })
        return { data: res.data, error: null }
      } catch (e) {
        return { data: null, error: e }
      }
    },
    async deleteEvent(id) {
      try {
        const res = await request('DELETE', '/api/events/' + id)
        return { data: res.data, error: null }
      } catch (e) {
        return { data: null, error: e }
      }
    },
    async listSignupsForEvent(eventId) {
      try {
        const res = await request('GET', '/api/events/' + eventId + '/signups')
        return { data: res.data || [], error: null }
      } catch (e) {
        return { data: [], error: e }
      }
    },
    async getSignupCount(eventId) {
      try {
        const res = await request('GET', '/api/events/' + eventId + '/signup-count', { auth: false })
        return { data: res.data || 0, error: null }
      } catch (e) {
        return { data: 0, error: e }
      }
    },
    async listSignupsByOwner() {
      try {
        const res = await request('GET', '/api/signups/mine')
        return { data: res.data || [], error: null }
      } catch (e) {
        return { data: [], error: e }
      }
    },
    async createSignup(payload) {
      try {
        const res = await request('POST', '/api/signups', { body: payload })
        return { data: res.data, error: null }
      } catch (e) {
        return { data: null, error: e }
      }
    },
    async deleteSignup(id) {
      try {
        const res = await request('DELETE', '/api/signups/' + id)
        return { data: res.data, error: null }
      } catch (e) {
        return { data: null, error: e }
      }
    },
    // 封面图上传（multipart）
    async uploadCover(tempFilePath) {
      return new Promise((resolve, reject) => {
        const { token } = getStored()
        if (!token) return reject(new Error('请先登录再上传图片'))
        wx.uploadFile({
          url: BASE_URL.replace(/\/$/, '') + '/api/upload/cover',
          filePath: tempFilePath,
          name: 'cover',
          header: { Authorization: 'Bearer ' + token },
          success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const json = JSON.parse(res.data)
              return resolve({ data: json.data, error: null })
            }
            const json = JSON.parse(res.data)
            return reject(json.error || new Error('上传失败'))
          },
          fail: (e) => reject(e),
        })
      })
    },
    async health() {
      try {
        const res = await request('GET', '/api/health', { auth: false })
        return { data: res, error: null }
      } catch (e) {
        return { data: null, error: e }
      }
    },
  },
}

module.exports = { cloud, BASE_URL, friendlyError }
