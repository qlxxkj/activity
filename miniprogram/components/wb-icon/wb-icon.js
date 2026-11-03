// 统一线性图标组件：微信原生不支持内联 SVG，改用纯 CSS（view + 伪元素）绘制线条图标。
// 提供统一尺寸、统一线宽与配色的图标集，跨页面风格一致，不使用 Emoji。
// props: name, size(默认40rpx), color(默认#5b6b8a 或主题色), bg(容器底色, 可空)
Component({
  properties: {
    name: { type: String, value: 'error' },
    size: { type: Number, value: 40 },
    color: { type: String, value: '' },
    bg: { type: String, value: '' },
  },
  data: {},
})
