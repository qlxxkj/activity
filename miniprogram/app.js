const { cloud } = require('./utils/cloud')

App({
  globalData: {
    appName: '活动报名',
  },

  async ensureSession() {
    if (!this.sessionPromise) {
      this.sessionPromise = cloud.auth.getSession().then(res => res.data)
    }
    return this.sessionPromise
  },

  resetSession() {
    this.sessionPromise = null
  },

  async wechatLogin() {
    const result = await new Promise((resolve, reject) => {
      wx.login({
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      })
    })
    const { data: session, error } = await cloud.auth.signInWithWechat(result.code)
    if (error) throw error
    this.resetSession()
    return session
  },

  async signOut() {
    await cloud.auth.signOut()
    this.resetSession()
  },
})
