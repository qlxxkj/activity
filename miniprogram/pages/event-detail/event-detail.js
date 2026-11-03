const { getEvent, listSignupsForEvent, deleteEvent } = require('../../utils/data-access')
const { requireSession } = require('../../utils/auth-guard')
const { decorateEvent, dateParts, initial } = require('../../utils/format')

Page({
  data: {
    state: 'loading',
    event: null,
    signups: [],
    isOwner: false,
    error: '',
  },

  onLoad(options) {
    this.id = options.id
    this.restoreOwner()
    this.load()
  },

  restoreOwner() {
    getApp().ensureSession().then(session => {
      const s = session
      return getEvent(this.id).then(res => {
        const ev = res.data
        this.setData({ isOwner: !!(s && s.user && ev && String(ev.owner_id) === String(s.user.id)) })
      })
    }).catch(() => {})
  },

  async load() {
    this.setData({ state: 'loading', error: '' })
    const { data, error } = await getEvent(this.id)
    if (error) {
      this.setData({ state: 'error', error: error.message || '加载失败' })
      return
    }
    const sg = await listSignupsForEvent(this.id)
    const signups = (sg && sg.data ? sg.data : []).map(row => Object.assign({}, row, {
      initial: initial(row.user_name),
      timeText: dateParts(row.created_at).text,
    }))
    this.setData({
      state: 'ready',
      event: decorateEvent(data),
      signups,
    })
  },

  async goSignup() {
    const session = await requireSession('报名前请先完成微信授权登录')
    if (!session || !session.user) return
    wx.navigateTo({ url: '/pages/signup/signup?event_id=' + this.id })
  },

  async confirmDelete() {
    const { removed } = await deleteEvent(this.id)
    if (removed) {
      wx.showToast({ title: '活动已删除', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    } else {
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  },
})
