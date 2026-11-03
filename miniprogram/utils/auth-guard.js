function loginHint(message) {
  wx.showModal({
    title: '微信授权登录',
    content: message,
    confirmText: '去登录',
    cancelText: '暂不',
    success: (res) => {
      if (res.confirm) {
        getApp().wechatLogin()
          .then(() => {
            wx.showToast({ title: '登录成功', icon: 'success' })
          })
          .catch(() => {
            wx.showToast({ title: '登录失败，请重试', icon: 'none' })
          })
      }
    },
  })
}

function requireSession(message) {
  const app = getApp()
  return app
    .ensureSession()
    .then(session => {
      if (session && session.user) return session
      loginHint(message)
      return null
    })
    .catch(() => {
      loginHint(message)
      return null
    })
}

module.exports = { loginHint, requireSession }
