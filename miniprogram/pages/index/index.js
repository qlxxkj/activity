const { listEvents, listCities } = require('../../utils/data-access')
const { decorateEvent } = require('../../utils/format')

Page({
  data: {
    state: 'loading',
    events: [],
    error: '',
    // 自定义导航栏尺寸
    statusBarHeight: 20,
    navBarHeight: 44,
    capsuleSpace: 96,
    // 城市筛选
    cityTabs: [],      // ['ALL', '上海', '北京', ...]
    activeCity: 'ALL',
    activeCityIndex: 0,
  },

  onLoad() {
    // 不再用 wx.getSystemInfoSync / getMenuButtonBoundingClientRect 动态算高度。
    // 该同步调用在部分真机基础库下会抛错导致 onLoad 中断、整页塌陷，
    // 改用固定安全值，导航栏由自定义导航栏 + padding 占位即可。
    this.setData({ statusBarHeight: 44, navBarHeight: 44, capsuleSpace: 96 })
  },

  onShow() {
    this.refresh()
  },

  onPullDownRefresh() {
    this.refresh().then(() => wx.stopPullDownRefresh())
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

    // 2. 活动列表（按当前城市筛选）
    const { data, error } = await listEvents(this.data.activeCity)
    if (error) {
      this.setData({ state: 'error', error: error.message || '加载失败，请重试' })
      return
    }
    const rows = data || []
    this.setData({ state: rows.length ? 'ready' : 'empty', events: rows })
  },

  onCityPickerChange(e) {
    const idx = Number(e.detail.value)
    const city = this.data.cityTabs[idx]
    if (!city || city === this.data.activeCity) return
    this.setData({ activeCity: city, activeCityIndex: idx })
    this.reloadEvents()
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

  goPublish() {
    wx.switchTab({ url: '/pages/publish/publish' })
  },

  goMySignups() {
    wx.switchTab({ url: '/pages/my/my' })
  },
})
