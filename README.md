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
3. `miniprogram/utils/cloud.js` 第 9 行 `BASE_URL` 默认 `http://127.0.0.1:3000`，联调即可

### 关键环境变量（backend/.env）

| 变量 | 必填 | 说明 |
|---|---|---|
| `WX_APPID` | 是 | 小程序 AppID |
| `WX_SECRET` | 是 | 小程序 AppSecret（code2session 必需，勿进前端/git） |
| `JWT_SECRET` | 是 | 会话签名，生产用 `openssl rand -hex 32` |
| `UPLOAD_PUBLIC_BASE` | 是 | 封面图可访问前缀，如 `https://你的域名/uploads` |

> 不配 `WX_SECRET` 也能跑——后端自动降级为 mock openid，方便本地/调试，但登录态是假的，上线前必须配真值。

---

## 域名配置（前后端联调与上线必读）

前后端完全分离，**前端小程序里写死一个 `BASE_URL` 指向后端**；后端部署在哪，就把这个地址改成哪。

### 1. 前端 `BASE_URL`

位置：`miniprogram/utils/cloud.js` 第 9 行

```js
// 本地联调：
const BASE_URL = 'http://127.0.0.1:3000'
// 上线后改成你的服务器域名（必须 HTTPS）：
const BASE_URL = 'https://你的域名.com'
```

- 本地开发 / 真机在开发者工具里调试：保持 `http://127.0.0.1:3000`（后端在本机跑）
- 部署到你自己的服务器：改成 `https://你的域名`（**必须 HTTPS**，小程序不允许 http 请求）

> **真机 / 体验版 / 正式包不能指向 `127.0.0.1`**——`127.0.0.1` 在手机上指向手机自己，连不到你的电脑。真机只能指向可达的服务器域名。

### 2. 微信后台配置合法域名

上线后，在 mp.weixin.qq.com → 「开发管理 → 开发设置 → 服务器域名」里，把后端域名加入 **request 合法域名** 和 **uploadFile 合法域名**（封面上传用 `wx.uploadFile`）：

| 类型 | 填什么 | 用途 |
|---|---|---|
| request 合法域名 | `https://你的域名` | 所有 `/api/*` 接口（登录、事项、参与等） |
| request 合法域名 | `https://apis.map.qq.com` | 腾讯逆地理定位（`wx.getLocation` + 城市选择） |
| uploadFile 合法域名 | `https://你的域名` | 封面图上传 `POST /api/upload/cover` |

要求：
- 域名必须**已备案**（国内服务器）
- 必须 **HTTPS**（443 端口）
- 一个小程序最多 50 个域名

> **定位相关**：小程序首页用 `wx.getLocation(wgs84)` + 腾讯逆地理（`apis.map.qq.com`）做城市定位，并引用腾讯「城市选择器」插件。
> - `app.json` 已声明 `permission.scope.userLocation / scope.userFuzzyLocation` + `requiredPrivateInfos: ["getLocation"]` + `plugins.citySelector`
> - 真机体验前需在 mp 后台「开发管理 → 开发设置」把 `https://apis.map.qq.com` 加进 **request 合法域名**（开发工具勾「不校验合法域名」可临时跳过）
> - 需在 [lbs.qq.com](https://lbs.qq.com) 申请一个 WebService key（绑定本小程序 AppID `wxfe3abdb95bbe4a5d`），填到 `miniprogram/utils/geo.js` 的 `TENCENT_MAP_KEY`；城市选择器组件也需要这个 key（`index.js` 的 `TENCENT_MAP_KEY`）。**未配置 key 时，定位和城市选择器均不生效**（仅能手动选城市 tab）。

### 3. 封面图访问域名

后端通过 `UPLOAD_PUBLIC_BASE` 环境变量返回封面图的**完整 URL**（存进数据库），前端直接用它显示。上线时设成可被小程序访问的封面前缀：

```
UPLOAD_PUBLIC_BASE=https://你的域名/uploads
```

### 4. 开发期偷懒方式（不用配域名）

在微信开发者工具勾选「**不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**」（详情 → 本地设置），即可直连 `127.0.0.1:3000`，无需配微信后台域名。
- 开发者工具里 ✅ 可用
- **真机 / 体验版 / 正式包 ❌ 不可用**（真机一律走上面第 2、3 步的合法域名）

---

## 服务端管理页（发布事项）

小程序端只保留「事项预约」（浏览 + 参与），**事项的新增/删除走服务端管理页**（浏览器访问），不进小程序。

### 管理页是什么

- 单文件 `backend/public/admin.html`（内联 CSS/JS，零依赖）
- 由 Express 在 `GET /admin` 直接 serve
- 登录走 `POST /api/auth/admin`：校验 `.env` 里的 `ADMIN_TOKEN`，通过后签发 30 天 JWT，浏览器拿到后调现有 `/api/*` 写接口

### 启用步骤

1. **配置管理密钥**（`.env` 或环境变量）：
   ```bash
   # 开发期随便填个值
   ADMIN_TOKEN=dev
   # 生产用强随机值（必改）
   openssl rand -hex 16
   ```

2. **起服务**：
   ```bash
   cd backend && npm start   # 默认 :3000
   ```

3. **浏览器打开**：
   - 开发：`http://127.0.0.1:3000/admin`
   - 线上：`https://你的域名/admin`

4. 输入管理密钥登录，即可**发布新事项**、查看列表、软删除。

### 注意事项

- **`ADMIN_TOKEN` 务必上生产前换强随机值**，否则等于无鉴权
- 管理页和 API 同域（`/admin` 走 `:3000`），不需要额外 CORS
- 软删除：`DELETE /api/events/:id` 把 `status` 置为 `archived`，列表查不到但数据库保留
- 管理页签出的 token `sub='admin-operator'`，`requireUser` 中间件已放行（见 `backend/src/middleware/auth.js`）

---

## 腾讯位置服务（LBS）Key 申请

首页的城市定位（`wx.getLocation(wgs84)` + 腾讯逆地理 `apis.map.qq.com`）和城市选择器都需要一个 **WebService API key**，未配置时这两项功能都不生效（只能手动选城市 tab）。

### 申请步骤

1. 打开 [lbs.qq.com](https://lbs.qq.com) → 注册/登录
2. 控制台 → 「应用管理」→「我的应用」→ 新建应用
3. 权限勾选 **WebServiceAPI**
4. 「微信 APP ID」填 `wxfe3abdb95bbe4a5d`（本小程序 AppID，必须填，否则微信端调不通）
5. 创建后拿到 key（形如 `ABCD-XXXXX-XXXXX-XXXXX-XXXXX`），复制下来

### 填到代码

两处需要这个 key（占位符 `YOUR_TENCENT_MAP_KEY`）：

| 文件 | 行/常量 | 说明 |
|---|---|---|
| `miniprogram/utils/geo.js` | `TENCENT_MAP_KEY` | 逆地理编码（`/ws/geocoder/v1/`） |
| `miniprogram/pages/index/index.js` | `TENCENT_MAP_KEY` | 城市选择器插件（接插件时） |

### 微信后台额外配置

- mp.weixin.qq.com →「开发管理 → 开发设置 → 服务器域名」
- **request 合法域名** 加 `https://apis.map.qq.com`（逆地理走这里）
- 如需使用官方城市选择器插件：「第三方设置 → 插件管理」搜索「腾讯位置服务城市选择器」添加并授权

### 降级行为

- 没配 key → `wx.getLocation` 仍会定位到城市，但**区县/街道不显示**（只有城市名）
- 用户拒绝定位授权 → 头部显示「正在定位…」，城市筛选仍可用
- 开发工具勾「不校验合法域名」可临时跳过 `apis.map.qq.com` 的合法域名要求

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
| POST | `/api/auth/admin` | 校验 ADMIN_TOKEN | `{token}` → `{token, user}`（管理页登录） |
| GET | `/api/events` | 无 | 事项列表（`?city=` 筛选） |
| GET | `/api/events/cities` | 无 | 城市列表 |
| GET | `/api/events/mine` | 需 | 我登记的 |
| GET | `/api/events/:id` | 无 | 事项详情 |
| POST | `/api/events` | 需 | 登记事项 |
| PUT | `/api/events/:id` | 需 | 更新（仅本人） |
| DELETE | `/api/events/:id` | 需 | 删除（仅本人，软删除） |
| GET | `/api/events/:id/signups` | 本人 | 参与明细 |
| GET | `/api/events/:id/signup-count` | 无 | 参与人数 |
| GET | `/api/signups/mine` | 需 | 我的参与 |
| POST | `/api/signups` | 需 | 提交参与 |
| DELETE | `/api/signups/:id` | 需 | 取消参与 |
| POST | `/api/upload/cover` | 需 | 封面上传（multipart，字段 `cover`） |
| GET | `/admin` | 需 ADMIN_TOKEN | 服务端管理页（发布事项） |

---

## 技术栈

- **前端**：微信原生小程序，无第三方 UI 库；纯 CSS 图标；`wx.request` 直连后端
- **后端**：Node 20、Express 4、better-sqlite3（同步、零外部数据库依赖）、multer（文件上传）、JWT（自签，不引 auth 库）
- **部署**：systemd / Docker，Nginx 反代 + certbot HTTPS
