const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function parseDate(value) {
  if (!value) return null
  let s = String(value)
  const t = s.indexOf('T')
  if (t > 0) s = s.slice(0, t)
  const d = new Date(s.replace(/-/g, '/').replace(/\./g, '/'))
  return isNaN(d.getTime()) ? null : d
}

// 返回卡片日期徽标需要的最小信息
function dateParts(value) {
  const d = parseDate(value)
  if (!d) {
    return { month: '', day: '', weekday: '', text: '时间待定' }
  }
  const m = d.getMonth() + 1
  const day = d.getDate()
  const dd = day < 10 ? '0' + day : String(day)
  return {
    month: m + '月',
    day: dd,
    weekday: WEEK[d.getDay()],
    text: m + '月' + day + '日 ' + WEEK[d.getDay()],
  }
}

function timeRange(start, end) {
  const s = dateParts(start)
  if (!end) return s.text
  const e = parseDate(end)
  if (!e) return s.text
  const sd = parseDate(start)
  if (sd && sd.getMonth() === e.getMonth() && sd.getDate() === e.getDate()) {
    return s.text
  }
  return s.text + ' - ' + dateParts(end).text
}

function initial(text) {
  const t = (text || '').trim()
  return t ? t.slice(0, 1) : '活'
}

function capacityText(capacity) {
  const n = Number(capacity) || 0
  return n > 0 ? '限 ' + n + ' 人' : '不限人数'
}

// 列表卡片统一视图模型
function decorateEvent(ev) {
  const d = dateParts(ev.start_time)
  const owner = ev.owner_name || '我'
  return Object.assign({}, ev, {
    cover: ev.cover_image_url || '',
    initial: initial(ev.title),
    hostInitial: initial(owner),
    monthText: d.month,
    dayText: d.day,
    weekdayText: d.weekday,
    timeText: d.text,
    capacityText: capacityText(ev.capacity),
  })
}

module.exports = { parseDate, dateParts, timeRange, initial, capacityText, decorateEvent }
