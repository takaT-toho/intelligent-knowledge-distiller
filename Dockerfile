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
FROM nginx:stable-alpine
# envsubstコマンドをインストール
RUN apk add --no-cache gettext

# Nginx設定テンプレートと起動スクリプトをコピー
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# ビルド成果物をコピー
COPY --from=build /app/dist /usr/share/nginx/html

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
# EXPOSEはENTRYPOINTで動的に設定されるため、ここでは不要
