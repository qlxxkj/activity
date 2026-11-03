const { createEvent, uploadEventCover } = require('../../utils/data-access')
const { requireSession } = require('../../utils/auth-guard')

Page({
  data: {
    title: '',
    description: '',
    city: '',
    location: '',
    startTime: '',
    endTime: '',
    capacity: '',
    coverPath: '',
    submitting: false,
    fieldError: '',
    submitError: '',
  },

  onLoad() {
    // 时间选择默认值
    const now = new Date()
    this.setData({
      startTime: this.toInputDate(now),
      endTime: this.toInputDate(this.addDays(now, 1)),
    })
  },

  toInputDate(d) {
    const p = n => (n < 10 ? '0' + n : '' + n)
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  },

  addDays(d, n) {
    const x = new Date(d)
    x.setDate(x.getDate() + n)
    return x
  },

  onTitle(e) { this.setData({ title: e.detail.value, fieldError: '' }) },
  onDesc(e) { this.setData({ description: e.detail.value }) },
  onCity(e) { this.setData({ city: e.detail.value, fieldError: '' }) },
  onLocation(e) { this.setData({ location: e.detail.value, fieldError: '' }) },
  onStartTime(e) { this.setData({ startTime: e.detail.value }) },
  onEndTime(e) { this.setData({ endTime: e.detail.value }) },
  onCapacity(e) { this.setData({ capacity: e.detail.value, fieldError: '' }) },

  chooseCover() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: (res) => {
        this.setData({ coverPath: res.tempFilePaths[0] })
      },
    })
  },

  removeCover() {
    this.setData({ coverPath: '' })
  },

  async submit() {
    const { title, description, city, location, startTime, endTime, capacity, coverPath, submitting } = this.data
    if (submitting) return

    const t = (title || '').trim()
    if (!t) { this.setData({ fieldError: '请填写活动名称' }); return }
    const c = (city || '').trim()
    if (!c) { this.setData({ fieldError: '请填写活动所在城市' }); return }
    const cap = capacity === '' ? 0 : Number(capacity)
    if (capacity !== '' && (isNaN(cap) || cap < 0)) {
      this.setData({ fieldError: '请填写正确的人数上限（留空表示不限）' })
      return
    }

    // 登录校验
    const session = await requireSession('发布活动前请先完成微信授权登录')
    if (!session || !session.user) return

    this.setData({ submitting: true, submitError: '', fieldError: '' })

    // 若有封面图，先上传到云端存储
    let coverUrl = null
    if (coverPath) {
      const up = await uploadEventCover(coverPath)
      if (up.error) {
        this.setData({ submitting: false, submitError: '封面图片上传失败：' + (up.error.message || '请重试') })
        return
      }
      coverUrl = up.data
    }

    const { error } = await createEvent({
      title: t,
      description: (description || '').trim() || null,
      city: (city || '').trim() || null,
      location: (location || '').trim() || null,
      start_time: startTime || null,
      end_time: endTime || null,
      capacity: cap,
      cover_image_url: coverUrl,
      status: 'published',
    })

    this.setData({ submitting: false })
    if (error) {
      this.setData({ submitError: error.message || '发布失败，请重试' })
      return
    }

    wx.showToast({ title: '活动发布成功', icon: 'success' })
    setTimeout(() => {
      wx.switchTab({ url: '/pages/index/index' })
    }, 800)
  },
})
