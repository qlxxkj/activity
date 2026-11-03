const { listEventsByOwner } = require('../../utils/data-access')
const { decorateEvent, dateParts } = require('../../utils/format')

Page({
  data: {
    state: 'loading',
    events: [],
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
    const { data, error } = await listEventsByOwner(session.user.id)
    if (error) {
      this.setData({ state: 'error', error: error.message || '加载失败' })
      return
    }
    const rows = (data || []).map(ev => Object.assign(decorateEvent(ev), {
      created_date: dateParts(ev.created_at).text.replace(/\s?周./, ''),
    }))
    this.setData({ state: rows.length ? 'ready' : 'empty', events: rows })
  },

  retry() {
    this.refresh()
  },

  goPublish() {
    wx.switchTab({ url: '/pages/publish/publish' })
  },

  viewEvent(e) {
    const eventId = e.currentTarget.dataset.eventId
    if (eventId) {
      wx.navigateTo({ url: '/pages/event-detail/event-detail?id=' + eventId })
    }
  },
})
