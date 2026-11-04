const { listEvents, listCities } = require('../../utils/data-access')
const { decorateEvent } = require('../../utils/format')
const { getCityByLocation } = require('../../utils/geo')

Page({
  data: {
    state: 'loading',
    events: [],
    error: '',
    // 城市筛选
    cityTabs: [],      // ['ALL', '上海', '北京', ...]
    activeCity: 'ALL',
    activeCityIndex: 0,
    // 定位
    locText: '',
    locDetail: '',
    locError: '',
    // 城市选择器
    showCityPicker: false,
  },

  onLoad() {
    this.autoLocate()
  },

  onShow() {
    this.refresh()
  },

  onPullDownRefresh() {
    this.refresh().then(() => wx.stopPullDownRefresh())
  },

  // 自动定位：wx.getLocation(wgs84) + 腾讯逆地理 → 头部 district + street
  async autoLocate() {
    try {
      const geo = await getCityByLocation()
      const detail = [geo.district, geo.street].filter(Boolean).join(' · ')
      const city = geo.city || ''
      this.setData({
        locText: city || (detail ? detail : '已定位'),
        locDetail: detail,
        locError: '',
      })
      // 定位到的城市自动选中
      if (city) this.applyCityFilter(city)
    } catch (e) {
      this.setData({ locError: e.message || '定位失败', locText: '' })
    }
  },

  applyCityFilter(city) {
    const tabs = this.data.cityTabs
    if (tabs.length && tabs.indexOf(city) === -1) return
    this.setData({
      activeCity: city,
      activeCityIndex: tabs.length ? tabs.indexOf(city) : 0,
    })
  },

  // 点击头部城市胶囊 → 打开城市选择弹层
  onOpenCityPicker() {
    this.setData({ showCityPicker: true })
  },

  closeCityPicker() {
    this.setData({ showCityPicker: false })
  },

  noop() {},

  // 弹层里点选城市
  pickCityFromSheet(e) {
    const city = e.currentTarget.dataset.city
    this.setData({ showCityPicker: false })
    if (city === this.data.activeCity) return
    const idx = this.data.cityTabs.indexOf(city)
    this.setData({ activeCity: city, activeCityIndex: idx })
    this.reloadEvents()
  },

  onSelectAll() {
    this.setData({ activeCity: 'ALL', activeCityIndex: 0, showCityPicker: false })
    this.reloadEvents()
  },

  async refresh() {
    this.setData({ state: 'loading', error: '' })

    // 1. 城市标签
    const cities = await listCities()
    const tabs = ['ALL'].concat(cities.data || [])
    // 若当前选中城市已不存在，回退到 ALL
    if (!this.data.activeCity || tabs.indexOf(this.data.activeCity) === -1) {
      this.setData({ activeCity: 'ALL', activeCityIndex: 0 })
    }
    this.setData({ cityTabs: tabs })

    // 2. 事项列表（按当前城市筛选）
    const { data, error } = await listEvents(this.data.activeCity)
    if (error) {
      this.setData({ state: 'error', error: error.message || '加载失败，请重试' })
      return
    }
    const rows = data || []
    this.setData({ state: rows.length ? 'ready' : 'empty', events: rows })
  },

  selectCity(e) {
    const city = e.currentTarget.dataset.city
    if (city === this.data.activeCity) return
    const idx = this.data.cityTabs.indexOf(city)
    this.setData({ activeCity: city, activeCityIndex: idx })
    this.reloadEvents()
  },

  async reloadEvents() {
    this.setData({ state: 'loading', error: '' })
    const { data, error } = await listEvents(this.data.activeCity)
    if (error) {
      this.setData({ state: 'error', error: error.message || '加载失败，请重试' })
      return
    }
    const rows = (data || []).map(decorateEvent)
    this.setData({ state: rows.length ? 'ready' : 'empty', events: rows })
  },

  retry() {
    this.refresh()
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/event-detail/event-detail?id=' + e.currentTarget.dataset.id })
  },

  goMySignups() {
    wx.switchTab({ url: '/pages/my/my' })
  },
})
