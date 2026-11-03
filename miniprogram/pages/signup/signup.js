const { createSignup, getEvent } = require('../../utils/data-access')
const { requireSession } = require('../../utils/auth-guard')
const { decorateEvent } = require('../../utils/format')

Page({
  data: {
    event: null,
    userName: '',
    userPhone: '',
    userNote: '',
    submitting: false,
    fieldError: '',
    submitError: '',
  },

  onLoad(options) {
    this.eventId = options.event_id
    this.getEventDetail()
    this.prefillFromSession()
  },

  async getEventDetail() {
    const { data } = await getEvent(this.eventId)
    if (data) this.setData({ event: decorateEvent(data) })
  },

  async prefillFromSession() {
    const session = await getApp().ensureSession().catch(() => null)
    if (session && session.user && session.user.name) {
      this.setData({ userName: session.user.name })
    }
  },

  onNameInput(e) {
    this.setData({ userName: e.detail.value, fieldError: '' })
  },

  onPhoneInput(e) {
    this.setData({ userPhone: e.detail.value, fieldError: '' })
  },

  onNoteInput(e) {
    this.setData({ userNote: e.detail.value })
  },

  async submit() {
    const { userName, userPhone, userNote, submitting } = this.data
    if (submitting) return
    const name = (userName || '').trim()
    const phone = (userPhone || '').trim()
    if (!name) {
      this.setData({ fieldError: '请填写姓名' })
      return
    }
    if (!/^1\d{10}$/.test(phone)) {
      this.setData({ fieldError: '请填写正确的 11 位手机号' })
      return
    }

    const session = await requireSession('报名前请先完成微信授权登录')
    if (!session || !session.user) return
    this.prefillFromSession()

    this.setData({ submitting: true, submitError: '', fieldError: '' })
    const { error } = await createSignup({
      event_id: Number(this.eventId),
      user_name: name,
      user_phone: phone,
      user_note: (userNote || '').trim() || null,
    })
    this.setData({ submitting: false })

    if (error) {
      this.setData({ submitError: error.message || '报名失败，请重试' })
      return
    }
    wx.showToast({ title: '报名成功', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 800)
  },
})
