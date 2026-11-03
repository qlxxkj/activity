const { listSignupsByOwner, deleteSignup } = require('../../utils/data-access')
const { dateParts } = require('../../utils/format')

Page({
  data: {
    state: 'loading',
    signups: [],
    logged: false,
    error: '',
  },

  onShow() {
    this.refresh()
  },

  async refresh() {
    this.setData({ state: 'loading', error: '' })
    const session = await getApp().ensureSession().catch(() => null)
    this.setData({ logged: !!(session && session.user) })
    if (!session || !session.user) {
      this.setData({ state: 'empty' })
      return
    }
    const { data, error } = await listSignupsByOwner()
    if (error) {
      this.setData({ state: 'error', error: error.message || '加载失败' })
      return
    }
    const rows = (data || []).map(row => Object.assign({}, row, {
      created_date: dateParts(row.created_at).text.replace(/\s?周./, ''),
    }))
    this.setData({ state: rows.length ? 'ready' : 'empty', signups: rows })
  },

  retry() {
    this.refresh()
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  viewEvent(e) {
    const eventId = e.currentTarget.dataset.eventId
    if (eventId) {
      wx.navigateTo({ url: '/pages/event-detail/event-detail?id=' + eventId })
    }
  },

  async removeSignup(e) {
    const id = e.currentTarget.dataset.id
    const res = await new Promise(resolve => {
      wx.showModal({
        title: '取消报名',
        content: '确定要取消这条报名吗？',
        confirmText: '取消报名',
        cancelText: '再想想',
        success: r => resolve(r.confirm),
      })
    })
    if (!res) return
    const { error } = await deleteSignup(id)
    if (error) {
      wx.showToast({ title: error.message || '操作失败', icon: 'none' })
      return
    }
    wx.showToast({ title: '已取消报名', icon: 'success' })
    this.refresh()
  },
})
