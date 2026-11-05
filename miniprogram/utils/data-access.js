/**
 * 数据访问层（切到自研后端 API）。
 * 对外签名与旧版保持一致，页面无需改动。
 * 上传封面走 cloud.api.uploadCover（multipart 到后端本地存储）。
 */
const { cloud, friendlyError } = require('./cloud')

async function listEvents(city) {
  const { data, error } = await cloud.api.listEvents(city)
  return { data, error }
}

async function listCities() {
  const { data, error } = await cloud.api.listCities()
  return { data, error }
}

async function listEventsByOwner() {
  const { data, error } = await cloud.api.listEventsByOwner()
  return { data, error }
}

async function getEvent(id) {
  const { data, error } = await cloud.api.getEvent(id)
  return { data, error }
}

async function createEvent(payload) {
  const { data, error } = await cloud.api.createEvent(payload)
  return { data, error }
}

async function updateEvent(id, payload) {
  const { data, error } = await cloud.api.updateEvent(id, payload)
  return { data, error }
}

async function deleteEvent(id) {
  const { data, error } = await cloud.api.deleteEvent(id)
  return { data, error }
}

async function listSignupsByOwner() {
  const { data, error } = await cloud.api.listSignupsByOwner()
  return { data, error }
}

async function listSignupsForEvent(eventId) {
  const { data, error } = await cloud.api.listSignupsForEvent(eventId)
  return { data, error }
}

async function getSignupCount(eventId) {
  const { data, error } = await cloud.api.getSignupCount(eventId)
  return { data, error }
}

async function createSignup(payload) {
  const { data, error } = await cloud.api.createSignup(payload)
  return { data, error }
}

async function deleteSignup(id) {
  const { data, error } = await cloud.api.deleteSignup(id)
  return { data, error }
}

async function uploadEventCover(tempFilePath) {
  try {
    const { data, error } = await cloud.api.uploadCover(tempFilePath)
    return { data, error }
  } catch (e) {
    return { data: null, error: e }
  }
}

module.exports = {
  listEvents, listCities, listEventsByOwner, getEvent, createEvent, updateEvent, deleteEvent,
  listSignupsByOwner, listSignupsForEvent, getSignupCount, createSignup, deleteSignup,
  uploadEventCover, friendlyError,
}
