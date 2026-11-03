FROM node:20-alpine

# better-sqlite3 需要原生编译工具
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 先装依赖（利用缓存）
COPY backend/package*.json ./
RUN npm install --omit=dev && npm rebuild better-sqlite3

COPY backend/ ./

# 数据与上传目录持久化
VOLUME ["/app/data", "/app/uploads"]

EXPOSE 3000

ENV DATA_DIR=/app/data \
    UPLOAD_DIR=/app/uploads \
    PORT=3000

CMD ["node", "src/server.js"]
