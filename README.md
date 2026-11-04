# 事项预约 · 微信小程序

一个个人使用的事项预约与登记工具：用于记录你本人要参与的事项（骑行、读书会、晨跑、手作等），按城市/日期管理，登记参与信息，并查看自己已登记的参与记录。

> 本工具定位为个人生活管理用途，不涉及经营性活动组织、不面向公众招募、不收费。

- **前端**：微信原生小程序（WXML / WXSS / JS，不依赖框架）
- **后端**：Node.js + Express + SQLite（可自部署到自己的服务器，也可 Docker 化）
- **数据**：SQLite（事项 / 参与 / 用户三表）+ 本地磁盘存储事项封面图
- **登录**：真·微信授权（`code2session` 换 openid + JWT 会话），未登录也能浏览事项列表

---

## 功能一览

| 页面 | 说明 |
|---|---|
| 事项列表（首页） | 系统标题栏 + 城市胶囊选择器 + 城市横向标签 + 事项卡片列表，按城市筛选，未登录可看 |
| 事项详情 | 全幅封面 + 悬浮信息卡 + 参与记录 + 底部「我要参与」，本人可删除 |
| 登记参与 | 事项摘要条 + 表单，提交前校验登录 |
| 登记事项 | 分区表单（封面/基本/时间地点/名额设置）+ 底部提交条 |
| 我的 | 头像/昵称（未登录点击弹授权面板）、我的参与/登记入口、版本号、退出 |
| 我的参与 / 我登记的事项 | 列表卡，可取消参与 / 查看 |

设计：暖纸底色 + 绿色主色（`#2BA84A`），层级靠字重与留白，统一线性图标、无 Emoji。

---

## 工程结构

```
.
├─ miniprogram/                     # 前端：微信小程序
│  ├─ app.js                        # App 入口（会话 ensureSession / wechatLogin / signOut）
│  ├─ app.json                      # 页面注册 + tabBar + 窗口配置
│  ├─ app.wxss                      # 全局样式 / 设计系统（色彩 token 在这）
│  ├─ sitemap.json                  # 搜索索引
│  ├─ pages/                        # 7 个页面
│  │  ├─ index/                     #   事项列表（首页 tab）
│  │  ├─ publish/                  #   登记事项（tab）
│  │  ├─ my/                       #   我的（tab）
│  │  ├─ event-detail/             #   事项详情
│  │  ├─ signup/                   #   登记参与
│  │  ├─ my-signups/               #   我的参与记录
│  │  └─ my-published/             #   我登记的事项
│  ├─ components/
│  │  └─ wb-icon/                  #   纯 CSS 线性图标组件（统一风格）
│  ├─ utils/
│  │  ├─ cloud.js                  # 后端 API 客户端（REST，token 存 wx.storage）
│  │  ├─ data-access.js            # 数据访问层（事项/参与 CRUD，页面调它）
│  │  ├─ auth-guard.js             # 授权守卫（requireSession / loginHint）
│  │  └─ format.js                 # 日期徽标、周几、名额等文案收口
│  └─ images/                       # tabBar 图标（指南针/加号/人像）
│
├─ backend/                         # 后端：Node + Express + SQLite
│  ├─ src/
│  │  ├─ server.js                 # 入口（路由装配、CORS、静态、错误兜底）
│  │  ├─ config.js                 # 环境变量 + 目录配置
│  │  ├─ db/index.js               # SQLite 建表（users / events / signups）
│  │  ├─ middleware/auth.js        # JWT 鉴权（requireUser / optionalUser）
│  │  ├─ services/wechat.js        # code2session + JWT 签发校验
│  │  ├─ routes/
│  │  │  ├─ auth.js               # 登录 / me / 完善资料
│  │  │  ├─ events.js             # 事项 CRUD（匿名可读，写需登录）
│  │  │  ├─ signups.js            # 参与登记（明细仅本人可见）
│  │  │  └─ storage.js            # 封面图上传（本地磁盘）
│  │  └─ seed.js                   # 灌 5 条演示事项
│  ├─ .env.example                 # 环境变量模板（复制为 .env 填写）
│  └─ package.json
│
├─ scripts/
│  └─ upload.js                    # miniprogram-ci 上传脚本（CI 发版用）
├─ ci/                             # 微信代码上传密钥（.key，已 gitignore）
├─ uploads/                        # 封面图运行期落地目录（已 gitignore）
├─ project.config.json             # 小程序工程配置（miniprogramRoot=miniprogram/）
├─ package.json                    # 根级依赖（miniprogram-ci 等）
├─ DEPLOY.md                       # 服务器部署 / GitHub 推送 / Nginx / systemd 详细步骤
├─ Dockerfile                      # 后端容器化
└─ .gitignore
```

---

## 快速开始

### 后端

```bash
cd backend
cp .env.example .env          # 填入 WX_SECRET、JWT_SECRET（见下方说明）
npm install
node src/seed.js              # 可选：灌演示数据
npm start                     # 起在 :3000
```

冒烟测试：`curl http://127.0.0.1:3000/api/health` 应返回 `{"ok":true}`。

### 前端

1. 微信开发者工具导入本目录（AppID `wxfe3abdb95bbe4a5d`）
2. 开发期勾选「不校验合法域名」（后端在本地）
3. `miniprogram/utils/cloud.js` 第 8 行 `BASE_URL` 默认 `http://127.0.0.1:3000`，联调即可

### 关键环境变量（backend/.env）

| 变量 | 必填 | 说明 |
|---|---|---|
| `WX_APPID` | 是 | 小程序 AppID |
| `WX_SECRET` | 是 | 小程序 AppSecret（code2session 必需，勿进前端/git） |
| `JWT_SECRET` | 是 | 会话签名，生产用 `openssl rand -hex 32` |
| `UPLOAD_PUBLIC_BASE` | 是 | 封面图可访问前缀，如 `https://你的域名/uploads` |

> 不配 `WX_SECRET` 也能跑——后端自动降级为 mock openid，方便本地/调试，但登录态是假的，上线前必须配真值。

---

## 部署到自己服务器

完整步骤见 [DEPLOY.md](./DEPLOY.md)，包含：

- GitHub 推送（`.env`/`data`/`uploads` 已 gitignore）
- systemd 常驻 / Docker 部署
- Nginx 反代 + HTTPS
- 小程序后台 request 合法域名配置
- 上线前 checklist

---

## 上传体验版 / 正式版

```bash
# 前置：ci/private.<AppID>.key 放好、后台 IP 白名单/关闭
npm run upload -- --ver 1.0.0 --desc "首个体验版"
```

上传后到 mp.weixin.qq.com「版本管理 → 开发版本」设体验版或提审。

---

## 接口速查（后端）

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/health` | 无 | 探活 |
| POST | `/api/auth/login` | 无 | `{code}` → `{token, user}` |
| GET | `/api/auth/me` | 可选 | 当前用户 |
| PUT | `/api/auth/profile` | 需 | 完善昵称/头像 |
| GET | `/api/events` | 无 | 事项列表（`?city=` 筛选） |
| GET | `/api/events/cities` | 无 | 城市列表 |
| GET | `/api/events/mine` | 需 | 我登记的 |
| GET | `/api/events/:id` | 无 | 事项详情 |
| POST | `/api/events` | 需 | 登记事项 |
| PUT | `/api/events/:id` | 需 | 更新（仅本人） |
| DELETE | `/api/events/:id` | 需 | 删除（仅本人） |
| GET | `/api/events/:id/signups` | 本人 | 参与明细 |
| GET | `/api/events/:id/signup-count` | 无 | 参与人数 |
| GET | `/api/signups/mine` | 需 | 我的参与 |
| POST | `/api/signups` | 需 | 提交参与 |
| DELETE | `/api/signups/:id` | 需 | 取消参与 |
| POST | `/api/upload/cover` | 需 | 封面上传（multipart，字段 `cover`） |

---

## 技术栈

- **前端**：微信原生小程序，无第三方 UI 库；纯 CSS 图标；`wx.request` 直连后端
- **后端**：Node 20、Express 4、better-sqlite3（同步、零外部数据库依赖）、multer（文件上传）、JWT（自签，不引 auth 库）
- **部署**：systemd / Docker，Nginx 反代 + certbot HTTPS
