const { listSignupsByOwner } = require('../../utils/data-access')
const { initial } = require('../../utils/format')

const APP_VERSION = '1.0.0'

Page({
  data: {
    logged: false,
    avatar: '',
    nickname: '',
    avatarChar: '我',
    signedUpCount: 0,
    loading: false,
    showAuthSheet: false,
    authLoading: false,
    appVersion: APP_VERSION,
  },

  onShow() {
    this.load()
  },

  async load() {
    this.setData({ loading: true })
    const session = await getApp().ensureSession().catch(() => null)
    const user = (session && session.user) || {}
    const name = user.name || user.email || ''
    this.setData({
      logged: !!user.id,
      avatar: user.avatar_url || '',
      nickname: name,
      avatarChar: initial(name || '我'),
      loading: false,
    })

    if (user.id) {
      const su = await listSignupsByOwner()
      this.setData({ signedUpCount: (su.data || []).length })
    }
  },

  goSignups() {
    if (!this.data.logged) {
      this.openAuthSheet()
      return
    }
    wx.navigateTo({ url: '/pages/my-signups/my-signups' })
  },

  openAuthSheet() {
    this.setData({ showAuthSheet: true })
  },

  closeAuthSheet() {
    if (this.data.authLoading) return
    this.setData({ showAuthSheet: false })
  },

  noop() {},

  async confirmAuth() {
    if (this.data.authLoading) return
    this.setData({ authLoading: true })
    try {
      await getApp().wechatLogin()
      wx.showToast({ title: '登录成功', icon: 'success' })
      this.setData({ showAuthSheet: false })
    } catch (err) {
      wx.showToast({ title: '微信授权登录失败，请重试', icon: 'none' })
    } finally {
      this.setData({ authLoading: false })
      this.load()
    }
  },

  goAbout() {
    wx.showModal({
      title: '事项预约',
      content: '版本 ' + APP_VERSION,
      confirmText: '知道了',
      showCancel: false,
    })
  },

  async logout() {
    try {
      await getApp().signOut()
      this.setData({
        logged: false,
        avatar: '',
        nickname: '',
        avatarChar: '我',
        signedUpCount: 0,
      })
      wx.showToast({ title: '已退出登录', icon: 'none' })
    } catch (err) {}
  },
})
