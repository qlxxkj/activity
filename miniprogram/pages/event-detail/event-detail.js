const { getEvent, listSignupsForEvent, getSignupCount, deleteEvent } = require('../../utils/data-access')
const { requireSession } = require('../../utils/auth-guard')
const { decorateEvent, dateParts, initial } = require('../../utils/format')

Page({
  data: {
    state: 'loading',
    event: null,
    signups: [],
    signupCount: 0,
    isOwner: false,
    error: '',
  },

  onLoad(options) {
    this.id = options.id
    this.restoreOwner()
    this.load()
  },

  onShow() {
    // 从报名页返回后刷新人数（onShow 比 onLoad 触发更可靠）
    if (this.id && this.data.state === 'ready') this.load()
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
    // 公开人数（所有人可见，不依赖登录）
    const { data: count } = await getSignupCount(this.id)
    // 报名明细仅主办方可见；非主办方 signups 保持空数组，但 signupCount 正确
    let signups = []
    if (this.data.isOwner) {
      const sg = await listSignupsForEvent(this.id)
      signups = (sg && sg.data ? sg.data : []).map(row => Object.assign({}, row, {
        initial: initial(row.user_name),
        timeText: dateParts(row.created_at).text,
      }))
    }
    this.setData({
      state: 'ready',
      event: decorateEvent(data),
      signups,
      signupCount: count || 0,
    })
  },

  async goSignup() {
    const session = await requireSession('参与前请先完成微信授权登录')
    if (!session || !session.user) return
    wx.navigateTo({ url: '/pages/signup/signup?event_id=' + this.id })
  },

  async confirmDelete() {
    const { removed } = await deleteEvent(this.id)
    if (removed) {
      wx.showToast({ title: '事项已删除', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    } else {
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  },
})
