# Google Cloud Runデプロイの技術解説

このドキュメントでは、`DEPLOY_TO_GCR.md` に記載されたデプロイ手順の背景にある技術的な要素を詳しく解説します。

## 1. アーキテクチャ：なぜNode.jsサーバーなのか？

このプロジェクトは、最終的に**単一のNode.jsサーバー**として動作するように設計されています。このサーバーは、Expressフレームワークで構築された `server.js` であり、以下の2つの重要な役割を担います。

1.  **Webサーバー**: `npm run build` によって生成された、最適化済みのReactアプリケーション（HTML, CSS, JavaScriptなどの静的ファイル）をユーザーのブラウザに配信します。
2.  **APIプロキシ**: ブラウザから外部のAPI（例えばAzure OpenAI Service）へ直接リクエストを送信すると、通常はCORS（Cross-Origin Resource Sharing）というセキュリティ制約によりエラーが発生します。このサーバーは、フロントエンドからのAPIリクエストを一旦受け取り、サーバーサイドから目的のAPIへ安全に転送することで、このCORS問題を解決します。

この「フロントエンドとバックエンドが一体となった」構成は、以下の利点をもたらします。
-   **シンプルさ**: 複雑な起動スクリプトや、Nginxのような追加のWebサーバーが不要になり、構成が非常にシンプルになります。
-   **堅牢性**: 構成要素が少ないため、デプロイ時のエラー発生箇所が限定され、信頼性が向上します。
-   **一貫性**: ローカル開発環境と本番環境で、同じ `server.js` をベースとしたアーキテクチャを共有できます。

---

## 2. `Dockerfile` の詳細解説

`Dockerfile` は、このアプリケーションをCloud Runで実行するための「パッケージ」（Dockerイメージ）を作成する設計図です。「マルチステージビルド」という効率的な手法を用いて、最終的なイメージサイズを最小限に抑えています。

```dockerfile
# Stage 1: Build the application using a "builder" stage
FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Securely mount the secret file and use it during the build.
RUN --mount=type=secret,id=env_file,dst=.env \
    echo "Using .env from secret"

# Build the application
RUN npm run build

# Stage 2: Create the final, lean production image
FROM node:18-alpine
WORKDIR /app

# Set the environment to production
# This ensures that server.js runs in production mode
ENV NODE_ENV=production

# Copy production dependencies and package.json
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

# Copy the enhanced server and the built application
COPY --from=build /app/server.js .
COPY --from=build /app/dist ./dist

# Expose the port the app runs on.
EXPOSE 8080

# The command to start the server
CMD ["node", "server.js"]
```

### ステージ1: ビルド環境 (`AS build`)

このステージの目的は、Reactのソースコードから、ブラウザが解釈できる静的ファイル群（`dist` ディレクトリ）を生成することだけです。

-   `COPY . .`: ローカルのソースコードをすべてコンテナにコピーします。
-   `RUN --mount=type=secret...`: APIキーのような機密情報を、安全にビルドプロセスに組み込むための重要なステップです。
    -   `docker build` コマンドで渡されたシークレットファイル (`.env.production`) を、ビルド中だけコンテナ内にマウントします。
    -   この方法は、最終的なDockerイメージに機密情報がファイルとして残らないため、非常に安全です。
-   `RUN npm run build`: Viteを実行し、APIキーを読み込みながら本番用の静的ファイルを `dist` ディレクトリに生成します。

### ステージ2: 本番環境 (`production`)

このステージの目的は、ステージ1の成果物（`dist` ディレクトリ）と、それを配信するための `server.js` を含む、軽量でセキュアな本番用イメージを作成することです。

-   `ENV NODE_ENV=production`: コンテナ内の環境変数を設定します。これにより、`server.js` は静的ファイル配信を含む「本番モード」で動作します。
-   `COPY --from=build ...`: ステージ1から、本番環境の実行に**必要最小限なファイルだけ**をコピーします。ソースコードや開発用のライブラリは含まれないため、イメージが軽量になります。
    -   `package.json`, `node_modules`: サーバーの実行に必要なライブラリ。
    -   `server.js`: アプリケーションサーバー本体。
    -   `dist`: ビルドされたフロントエンドの静的ファイル。
-   `EXPOSE 8080`: このコンテナが8080番ポートで通信を待ち受けることを示します。Cloud Runはこの情報を元に、コンテナへトラフィックをルーティングします。
-   `CMD ["node", "server.js"]`: コンテナが起動したときに実行される、唯一かつメインのコマンドです。これにより、`server.js` が起動し、アプリケーションがサービスを開始します。

---

## 3. ローカル開発と本番環境の違い

この構成の優れた点は、ローカル開発の体験を損なわないことです。

-   **ローカル開発時 (`npm run dev`)**:
    -   **Vite開発サーバー**が、高速なホットリロード（コード変更時の自動リロード）を提供します。
    -   `server.js` は、APIプロキシの役割に専念します。
    -   これらが `concurrently` によって並行して動作することで、最高の開発体験が実現されます。

-   **本番環境 (Docker/Cloud Run)**:
    -   `server.js` が、ビルド済みの静的ファイル配信とAPIプロキシの両方を担当します。
    -   `NODE_ENV=production` 環境変数によって、この動作の切り替えが自動的に行われます。

この設計により、開発者はローカルで効率的に開発を進め、本番環境には最適化された堅牢なアプリケーションを、自信を持ってデプロイすることができます。
