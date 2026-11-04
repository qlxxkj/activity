#!/usr/bin/env bash
# activity 后端域名接入（activity.70kj.vip）剩余步骤。
# 代码与 .env 已在 /home/hawk/activity 部署；本脚本做 systemd 安装、
# TLS 证书签发、edge vhost 安装。需要 root，请用 sudo 运行。
#
# 前置（已完成的，可跳过）：
#   - /home/hawk/activity 已 clone，npm install 完成，better-sqlite3 OK
#   - /home/hawk/activity/backend/.env 已生成（含 JWT_SECRET / ADMIN_TOKEN）
#   - 后端已在 :3351 跑通 /api/health

set -euo pipefail

ROOT=/home/hawk/activity
DOMAIN=activity.70kj.vip

echo '== 1. 安装 systemd unit =='
cp "$ROOT/deploy/activity.service" /etc/systemd/system/activity.service
systemctl daemon-reload
systemctl enable --now activity
systemctl --no-pager status activity | head -n 5

echo '== 2. 签发 TLS 证书（Cloudflare DNS 验证，需 /root/cf.ini） =='
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  certbot certonly --dns-cloudflare --dns-credentials /root/cf.ini \
    -d "$DOMAIN" -n --non-interactive --agree-tos -m "hawk@70kj.vip"
else
  echo "证书已存在，跳过"
fi
echo "   证书：/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

echo '== 3. 安装 openship edge legacy vhost =='
cp "$ROOT/deploy/legacy-activity.conf" /var/lib/openship/edge/sites-enabled/legacy-activity.conf
docker exec openship-edge nginx -t
docker exec openship-edge kill -HUP 1
echo "   edge 已 reload"

echo '== 4. 冒烟测试 =='
sleep 1
curl -fsS "https://$DOMAIN/api/health" && echo
echo "完成。后端：$DOMAIN（admin 页面：$DOMAIN/admin，用 .env 里的 ADMIN_TOKEN）"
