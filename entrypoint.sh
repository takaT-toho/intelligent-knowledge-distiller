#!/bin/sh

# PORT環境変数が設定されていなければ、デフォルトで8080を使用
export PORT=${PORT:-8080}

# テンプレートから環境変数を展開して、最終的な設定ファイルを生成
envsubst '${PORT}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Nginxをフォアグラウンドで起動
exec nginx -g 'daemon off;'
