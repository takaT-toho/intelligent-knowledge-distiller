#!/bin/sh

# Cloud Runから提供されるPORT環境変数をNginx用に設定
export PORT=${PORT:-8080}
# プロキシサーバーは内部的に3001ポートで動かす
export PROXY_PORT=3001

# Nginxの設定ファイルを生成
# /etc/nginx/conf.d/default.conf に書き込むことで、メインのnginx.confから自動で読み込まれる
envsubst '${PORT}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

# プロキシサーバーをバックグラウンドで起動
# server.jsは/appディレクトリにある想定
node /app/server.js &

# Nginxをフォアグラウンドで起動 (デフォルトの設定ファイルを読み込む)
exec nginx -g 'daemon off;'
