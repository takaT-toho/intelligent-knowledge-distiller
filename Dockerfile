# syntax=docker/dockerfile:1

# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# --secret を使って渡されたAPIキーを .env ファイルに書き込む
# この .env ファイルはViteのビルド時に読み込まれる
RUN --mount=type=secret,id=env_file,dst=.env \
    echo "Using .env from secret"

# アプリケーションをビルド
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Nginxとgettextをインストール
RUN apk add --no-cache nginx gettext

# ビルドステージから必要なファイルをコピー
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json .
COPY --from=build /app/server.js .

# Nginx設定テンプレートと起動スクリプトをコピー
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
