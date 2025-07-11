# Google Cloud Runデプロイの技術解説

このドキュメントでは、`DEPLOY_TO_GCR.md` に記載された各ステップが、技術的に何を行っているのかを詳しく解説します。

## 1. 全体像：なぜDockerコンテナにしてCloud Runで動かすのか？

このプロジェクトは、ユーザーのブラウザ上で動作するReactアプリケーション（静的ファイル群）をビルドします。しかし、これらのファイル（HTML, CSS, JavaScript）をユーザーに届けるためには、Webサーバーが必要です。

今回のデプロイプロセスでは、以下のことを行っています。

1.  Reactアプリケーションをビルドして、静的なWebサイトのファイル群（`dist` ディレクトリ）を生成する。
2.  これらのファイルを配信するための軽量なWebサーバー **Nginx** を用意する。
3.  アプリケーションのファイル群とNginxをひとまとめにした **Dockerイメージ** という「パッケージ」を作成する。
4.  このDockerイメージをGoogle Cloudの **Artifact Registry** という倉庫に保管する。
5.  **Cloud Run** に「Artifact Registryにあるあのパッケージを使って、Webサイトを公開してください」とお願いする。

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
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
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

このステージの目的は、ステージ1の成果物（`dist` ディレクトリ）を、Cloud Runの要件に合わせたWebサーバー環境に設置することです。

-   `FROM nginx:stable-alpine`: Nginxがインストールされた軽量なOSイメージを土台にします。
-   `RUN apk add --no-cache gettext`: `envsubst` というコマンドをインストールします。これは、環境変数の値をテンプレートファイルに埋め込むために使います。
-   `COPY nginx.conf.template ...`: Nginxの設定「テンプレート」をコピーします。ポート番号が `${PORT}` というプレースホルダーになっています。
-   `COPY entrypoint.sh ...`: コンテナ起動時に最初に実行されるスクリプトをコピーし、実行権限を与えます。
-   `COPY --from=build /app/dist ...`: ステージ1から成果物である `dist` ディレクトリだけをコピーします。
-   `ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]`: コンテナが起動したときに、`CMD` の代わりにこのスクリプトを実行するように指定します。

この結果、最終的なDockerイメージは、Cloud Runの動的なポート割り当てに対応できる、柔軟な構成になります。

---

## 3. `entrypoint.sh` と `nginx.conf.template` の役割

Cloud Runでのデプロイで発生したポートのエラーを解決するため、この新しい仕組みが導入されました。

**問題点:** Cloud Runは、起動するコンテナに対して「今回は8080番ポートで通信を受け付けてください」のように、動的にポート番号を指定します。しかし、以前の `nginx.conf` は「80番ポート」で待ち受けるように固定されていたため、Cloud Runはコンテナが正常に起動したことを確認できず、エラーとなっていました。

**解決策:** コンテナが起動する瞬間に、Cloud Runから指定されたポート番号を使って、Nginxの設定ファイルを動的に生成します。

### `entrypoint.sh` (起動スクリプト)
```sh
#!/bin/sh
export PORT=${PORT:-8080}
envsubst '${PORT}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
```
1.  Cloud Runが設定する `PORT` 環境変数を読み込みます。（もし設定されていなければ、デフォルトで8080を使います）
2.  `envsubst` コマンドが、`nginx.conf.template` 内の `${PORT}` という文字列を、実際のポート番号（例: `8080`）に置換し、最終的な設定ファイル `/etc/nginx/conf.d/default.conf` を生成します。
3.  生成された設定ファイルを使って、Nginxサーバーを起動します。

### `nginx.conf.template` (設定テンプレート)
```nginx
server {
  listen ${PORT}; # ここが動的に変わる
  # ...
}
```
この仕組みにより、コンテナはCloud Runが期待するポートで正しく待ち受けることができるようになります。

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
