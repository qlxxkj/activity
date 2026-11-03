# 活动广场 · 前后端部署说明

工程结构：

```
.
├─ app.js / app.json / app.wxss      # 小程序前端（原生）
├─ pages/ components/ utils/ images/ # 前端页面、组件、工具
├─ backend/                          # 后端服务（Node + Express + SQLite）
│  ├─ src/server.js                  # 入口
│  ├─ src/routes/                   # 路由（auth / events / signups / storage）
│  ├─ src/services/wechat.js         # code2session + JWT
│  ├─ src/db/                        # SQLite（自动建表）
│  └─ .env.example                  # 环境变量模板
├─ uploads/                          # 封面图落地目录（运行期生成）
├─ Dockerfile                        # 可选：容器部署
└─ .gitignore                        # 忽略 .env / data / uploads / node_modules
```

## 一、本地跑通（先验证）

```bash
cd backend
cp .env.example .env        # 填入 WX_SECRET、JWT_SECRET
npm install
node src/seed.js            # 灌 5 条演示活动（可选）
npm start                   # 起在 :3000
```

前端在 `utils/cloud.js` 第 8 行，`BASE_URL` 默认 `http://127.0.0.1:3000`。
用微信开发者工具导入工程、勾选「不校验合法域名」（开发期），即可联调。

## 二、上传 GitHub（前端 + 后端一起推）

```bash
git init
git add .
git commit -m "event-plaza: miniprogram + node backend"
# 推到你自己的仓库，记得 backend/.env 不会被推（已在 .gitignore）
git remote add origin git@github.com:<你>.event-plaza.git
git push -u origin main
```

`backend/.env`（含 AppSecret、JWT_SECRET）**绝不要提交**。`backend/data/`、`uploads/` 也忽略。

## 三、服务器部署（你自己的 VPS / 云主机）

假设服务器地址 `SERVER_IP`，后端部署在 `/opt/event-plaza`。

### 1. 拉代码并装依赖

```bash
sudo git clone git@github.com:<你>.event-plaza.git /opt/event-plaza
cd /opt/event-plaza/backend
npm install --omit=dev
```

### 2. 配置环境变量（敏感值只写在这，不进代码）

```bash
cat > /opt/event-plaza/backend/.env <<'EOF'
PORT=3000
WX_APPID=wxfe3abdb95bbe4a5d
WX_SECRET=<你的小程序AppSecret>
JWT_SECRET=<openssl rand -hex 32 生成>
UPLOAD_PUBLIC_BASE=https://你的域名.com/uploads
CORS_ORIGINS=*
EOF
chmod 600 /opt/event-plaza/backend/.env
```

### 3. 用 systemd 常驻（推荐）或 Docker

**systemd：**

```bash
sudo tee /etc/systemd/system/event-plaza.service >/dev/null <<'EOF'
[Unit]
Description=Event Plaza Backend
After=network.target

[Service]
WorkingDirectory=/opt/event-plaza/backend
EnvironmentFile=/opt/event-plaza/backend/.env
ExecStart=/usr/bin/node src/server.js
Restart=always
User=nodejs

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now event-plaza
sudo systemctl status event-plaza
```

**Docker（二选一即可，别同时上）：**

```bash
cd /opt/event-plaza
docker build -t event-plaza .
docker run -d --name event-plaza \
  -p 3000:3000 \
  -v /opt/event-plaza/backend/.env:/app/.env \
  -v event-data:/app/data -v event-uploads:/app/uploads \
  event-plaza
```

### 4. Nginx 反代 + HTTPS（把 `/uploads` 也代理过去）

```nginx
server {
    listen 443 ssl http2;
    server_name 你的域名.com;
    ssl_certificate     /etc/letsencrypt/live/你的域名.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/你的域名.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

证书用 `certbot --nginx -d 你的域名.com` 一键签。

## 四、前端小程序侧要改的唯一一行

你的后端部署好后，打开 `utils/cloud.js` 第 8 行：

```js
const BASE_URL = 'https://你的域名.com'   // 改成你的域名（必须 HTTPS）
```

然后微信开发者工具「构建 npm」→ 上传体验版。

**同时**在 mp.weixin.qq.com「开发管理 → 服务器域名 → request 合法域名」加上：

```
https://你的域名.com
```

（你之前加的 `mp-api.app.workbuddy.host` 这条，切到自己的后端后就不需要了，可删。）

## 五、关键环境变量速查

| 变量 | 必填 | 说明 |
|---|---|---|
| `WX_APPID` | 是 | 小程序 AppID（`wxfe3abdb95bbe4a5d`） |
| `WX_SECRET` | 是 | 小程序 AppSecret（code2session 必需，别进前端/git） |
| `JWT_SECRET` | 是 | 会话签名，生产必须 `openssl rand -hex 32` |
| `UPLOAD_PUBLIC_BASE` | 是 | 封面图可访问的完整前缀，如 `https://你的域名.com/uploads` |
| `CORS_ORIGINS` | 开发 | `*`；生产可收紧（小程序端其实走 wx.request，CORS 主要给 Web 调试用） |
| `PORT` | 否 | 默认 3000 |

## 六、上线前 checklist

- [ ] `WX_SECRET` / `JWT_SECRET` 已配，且 `.env` 在 `.gitignore` 里
- [ ] `https://你的域名.com/api/health` 返回 `{"ok":true}`
- [ ] 小程序后台 request 合法域名已加 `https://你的域名.com`
- [ ] `utils/cloud.js` 的 `BASE_URL` 已改到你的域名
- [ ] 真机扫体验版，首页能出活动列表（不再空白）
- [ ] 发布活动能上传封面、报名能提交
