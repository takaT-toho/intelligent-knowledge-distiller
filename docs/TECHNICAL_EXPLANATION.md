# Google Cloud Runデプロイの技術解説

このドキュメントでは、`DEPLOY_TO_GCR.md` に記載された各ステップが、技術的に何を行っているのかを詳しく解説します。

## 1. 全体像：なぜDockerコンテナにしてCloud Runで動かすのか？

このプロジェクトは、ユーザーのブラウザ上で動作するReactアプリケーション（静的ファイル群）をビルドします。しかし、これらのファイル（HTML, CSS, JavaScript）をユーザーに届けるためには、Webサーバーが必要です。

今回のデプロイプロセスでは、以下のことを行っています。

1.  Reactアプリケーションをビルドして、静的なWebサイトのファイル群（`dist` ディレクトリ）を生成する。
2.  これらのファイルを配信するためのWebサーバー **Nginx** を用意する。
3.  外部APIと通信する際のCORSエラーを回避するための **APIプロキシサーバー (Node.js)** を用意する。
4.  アプリケーションのファイル群、Nginx、APIプロキシサーバーをひとまとめにした **Dockerイメージ** という「パッケージ」を作成する。
5.  このDockerイメージをGoogle Cloudの **Artifact Registry** という倉庫に保管する。
6.  **Cloud Run** に「Artifact Registryにあるあのパッケージを使って、Webサイトを公開してください」とお願いする。

これにより、自分のPCで動かしていたアプリケーションが、Googleの堅牢なインフラ上で24時間365日、世界中に公開されるようになります。

---

## 2. `Dockerfile` の詳細解説

`Dockerfile` は、Dockerイメージというパッケージを作成するための設計図です。このファイルは「マルチステージビルド」という効率的な手法を用いています。

```dockerfile
# syntax=docker/dockerfile:1

# --- ステージ1: ビルド環境 ---
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# ▼ ここが重要 ▼
RUN --mount=type=secret,id=env_file,dst=.env \
    echo "Using .env from secret"

RUN npm run build

# --- ステージ2: 本番環境 ---
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
```

### ステージ1: ビルド環境 (`AS build`)

このステージの目的は、Reactのソースコードから、ブラウザが解釈できる静的ファイル（HTML, CSS, JS）を生成することだけです。

-   `FROM node:18-alpine`: Node.jsがインストールされた軽量なOSイメージを土台として使います。
-   `RUN npm install`: `package.json` を元に必要なライブラリをインストールします。
-   `RUN --mount=type=secret...`: ここがAPIキーを安全に扱うための核心部分です。
    -   `docker build` コマンドで `--secret` オプションを使って渡された `.env.production` ファイルを、ビルド中だけ `/app/.env` としてマウント（一時的に配置）します。
    -   この方法は、Dockerイメージのレイヤー（履歴）にAPIキーのファイルが記録されないため、イメージを分解してもキーが漏洩する心配がありません。
-   `RUN npm run build`: Viteを実行し、`.env` ファイルのAPIキーを読み込みながら、本番用の静的ファイルを `dist` ディレクトリに生成します。

このステージが終わると、`dist` ディレクトリと、ビルドに使った巨大な `node_modules` などが残ります。

### ステージ2: 本番環境 (Cloud Run対応)

このステージの目的は、ステージ1の成果物とAPIプロキシサーバーを、単一のコンテナで効率的に実行する環境を構築することです。

-   `FROM node:18-alpine AS production`: Node.jsがインストールされた軽量なイメージを土台にします。これにより、APIプロキシ (`server.js`) を実行できます。
-   `RUN apk add --no-cache nginx gettext`: Node.js環境に、Nginxと `envsubst` コマンドを追加でインストールします。
-   `COPY --from=build ...`: ステージ1から必要なファイルをコピーします。
    -   `/app/dist`: ビルドされたReactアプリの静的ファイル。Nginxがこれを配信します。
    -   `/app/node_modules`, `package.json`, `server.js`: Node.jsで書かれたAPIプロキシサーバーを実行するために必要なファイル群です。
-   `COPY nginx.conf.template ...`, `COPY entrypoint.sh ...`: Nginxの設定テンプレートと、コンテナ起動時に実行されるスクリプトをコピーします。
-   `ENTRYPOINT [...]`: コンテナ起動時に `entrypoint.sh` を実行するよう指定します。

このステージにより、最終的なDockerイメージは「Reactアプリの静的ファイル」「Nginx」「Node.jsプロキシサーバー」を含む、自己完結したパッケージになります。

---

## 3. `entrypoint.sh` と `nginx.conf.template` の役割

Cloud Runでのデプロイで発生したポートのエラーを解決するため、この新しい仕組みが導入されました。

**問題点:** Cloud Runは、起動するコンテナに対して「今回は8080番ポートで通信を受け付けてください」のように、`PORT` 環境変数で動的にポート番号を指定します。コンテナ内のアプリケーションは、この指定されたポートでリッスン（待ち受け）する必要があります。以前の構成では、APIプロキシサーバーが起動しておらず、ポートの待ち受け設定も不十分だったため、デプロイに失敗していました。

**解決策:** コンテナ起動時に、NginxとNode.jsプロキシサーバーの両方を起動し、ポート設定を動的に行います。

### `entrypoint.sh` (起動スクリプト)
```sh
#!/bin/sh
# Cloud Runから提供されるPORT環境変数をNginx用に設定
export PORT=${PORT:-8080}
# プロキシサーバーは内部的に3001ポートで動かす
export PROXY_PORT=3001

# Nginxの設定ファイルを生成
envsubst '${PORT}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf

# プロキシサーバーをバックグラウンドで起動
node /app/server.js &

# Nginxをフォアグラウンドで起動
exec nginx -c /etc/nginx/nginx.conf -g 'daemon off;'
```
1.  Cloud Runが設定する `PORT` 環境変数を読み込み、Nginxがリッスンするポートとして設定します。
2.  `envsubst` コマンドが、`nginx.conf.template` 内の `${PORT}` を実際のポート番号に置換し、最終的な設定ファイル `/etc/nginx/nginx.conf` を生成します。
3.  `node /app/server.js &`: Node.jsで書かれたAPIプロキシサーバーを **バックグラウンドで** 起動します。末尾の `&` がバックグラウンド実行の指示です。
4.  `exec nginx ...`: Nginxサーバーを **フォアグラウンドで** 起動します。Cloud Runは、このフォアグラウンドプロセスが動き続けている限り、コンテナが正常だと判断します。

### `nginx.conf.template` (設定テンプレート)
```nginx
server {
    listen ${PORT}; # ここが動的に変わる

    location / {
        # ... Reactアプリの配信設定 ...
    }

    location /api/ {
        proxy_pass http://localhost:3001; # APIリクエストをプロキシへ転送
        # ...
    }
}
```
-   NginxはCloud Runから指定されたポート (`${PORT}`) でリクエストを待ち受けます。
-   `/api/` で始まるパスへのリクエストは、バックグラウンドで動いているNode.jsプロキシサーバー（ポート3001）に転送（`proxy_pass`）されます。
-   それ以外のリクエストは、Reactアプリケーションの静的ファイルとして処理されます。

この仕組みにより、単一のコンテナでWebサーバーとAPIプロキシの2つの役割をこなし、Cloud Runの要件を満たすことができます。

---

## 4. デプロイコマンドの解説

-   `set DOCKER_BUILDKIT=1` (Windows) / `DOCKER_BUILDKIT=1 ...` (Mac/Linux)
    -   Dockerの新しいビルドエンジンであるBuildKitを有効にします。`--secret` のような高度な機能を使うために必要です。

-   `docker build --secret ... -t ... .`
    -   `--secret id=env_file,src=.env.production`: ローカルの `.env.production` ファイルを、ビルド中に `env_file` というIDで参照できるようにします。
    -   `-t [イメージ名:タグ]`: 作成するDockerイメージに名前とタグ（バージョン）を付けます。
    -   `.`: ビルドの基準となるディレクトリ（カレントディレクトリ）を指定します。`Dockerfile` はこの場所から探されます。

-   `docker push [イメージ名:タグ]`
    -   ローカルに作成したDockerイメージを、Google Artifact Registryのリモートリポジトリにアップロードします。

-   `gcloud run deploy ... --image ...`
    -   Cloud Runに対して、デプロイ（または更新）を指示するコマンドです。
    -   `--image [イメージ名:タグ]`: 「このイメージを使ってサービスを動かしてください」と、Artifact Registry上のイメージを指定します。
    -   `--platform managed`: サーバーの管理をすべてGoogleにおまかせするモードです。
    -   `--allow-unauthenticated`: 作成したサービスに、誰でも（認証なしで）アクセスできるように許可します。

以上のプロセスを経て、ローカルのコードがビルド、パッケージ化され、安全にクラウド上で公開されます。
