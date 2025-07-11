# Google Cloud Runへのデプロイ手順

このドキュメントでは、このReactアプリケーションをGoogle Cloud Runにデプロイする手順を説明します。

## 1. 前提条件

デプロイを始める前に、以下のツールがインストールされ、設定されていることを確認してください。

*   **Google Cloud SDK (gcloud CLI):** [インストールガイド](https://cloud.google.com/sdk/docs/install)
*   **Docker:** [インストールガイド](https://docs.docker.com/get-docker/)

### Google Cloudの設定

1.  **gcloud CLIの認証:**
    ```bash
    gcloud auth login
    ```

2.  **プロジェクトの設定:**
    ```bash
    gcloud config set project [YOUR_PROJECT_ID]
    ```
    `[YOUR_PROJECT_ID]` は実際のGoogle CloudプロジェクトIDに置き換えてください。

3.  **リージョンの設定:**
    ```bash
    gcloud config set run/region [YOUR_REGION]
    ```
    `[YOUR_REGION]` はデプロイしたいリージョン（例: `asia-northeast1`）に置き換えてください。

## 2. 環境変数の準備

APIキーのような機密情報は、Dockerイメージに直接含めるべきではありません。ここでは、Dockerの`--secret`機能を使用して、ビルド中にのみAPIキーを安全にアプリケーションに渡します。

1.  **シークレットファイルの作成:**
    プロジェクトのルートに `.env.production` という名前のファイルを作成します。このファイルに、アプリケーションで必要な環境変数を記述します。
    
    **`.env.production` の例:**
    `vite.config.ts` の設定に基づき、プレフィックスなしの変数名を使用してください。
    ```
    GEMINI_API_KEY=your_gemini_api_key_here
    OPENAI_API_KEY=your_openai_api_key_here
    ```
    **重要:** `.gitignore` ファイルに `.env.production` を追加して、このファイルがGitリポジトリにコミットされないようにしてください。

2.  **.gitignoreの確認:**
    `.gitignore`ファイルを開き、以下の行が含まれていることを確認します。もしなければ追記してください。
    ```
    .env.*
    ```

## 3. Dockerイメージのビルドとプッシュ

次に、アプリケーションのDockerイメージをビルドし、Google Artifact Registryにプッシュします。

1.  **Artifact Registryリポジトリの作成:**
    （まだリポジトリがない場合）
    ```bash
    gcloud artifacts repositories create [REPOSITORY_NAME] --repository-format=docker --location=[YOUR_REGION]
    ```
    `[REPOSITORY_NAME]` は任意のリポジトリ名（例: `app-repo`）に置き換えてください。

2.  **Dockerの認証設定:**
    ```bash
    gcloud auth configure-docker [YOUR_REGION]-docker.pkg.dev
    ```

3.  **Dockerイメージのビルド:**
    `--secret`フラグを使用するには、DockerのBuildKitを有効にする必要があります。

    **重要:** お使いのOS（ターミナル）に合ったコマンドを正確にコピー＆ペーストしてください。

    **A) Linux / macOS の場合 (bash/zsh):**
    以下のコマンドを一度に実行します。**末尾の `.` (ドット) を忘れないでください。**
    ```bash
    DOCKER_BUILDKIT=1 docker build --secret id=env_file,src=.env.production -t [YOUR_REGION]-docker.pkg.dev/[YOUR_PROJECT_ID]/[REPOSITORY_NAME]/[IMAGE_NAME]:latest .
    ```

    **B) Windows (コマンドプロンプト / cmd) の場合:**
    以下の2つのコマンドを、**1行ずつ順番に**実行してください。
    
    まず、BuildKitを有効にします。
    ```cmd
    set DOCKER_BUILDKIT=1
    ```
    次に、イメージをビルドします。**末尾の `.` (ドット) を忘れないでください。**
    ```cmd
    docker build --secret id=env_file,src=.env.production -t [YOUR_REGION]-docker.pkg.dev/[YOUR_PROJECT_ID]/[REPOSITORY_NAME]/[IMAGE_NAME]:latest .
    ```

    **C) Windows (PowerShell) の場合:**
    以下の2つのコマンドを、**1行ずつ順番に**実行してください。
    
    まず、BuildKitを有効にします。
    ```powershell
    $env:DOCKER_BUILDKIT="1"
    ```
    次に、イメージをビルドします。**末尾の `.` (ドット) を忘れないでください。**
    ```powershell
    docker build --secret id=env_file,src=.env.production -t [YOUR_REGION]-docker.pkg.dev/[YOUR_PROJECT_ID]/[REPOSITORY_NAME]/[IMAGE_NAME]:latest .
    ```
    - `--secret` の引数 `id=env_file,src=.env.production` にはスペースを含めないでください。
    - `id=env_file` は `Dockerfile` 内の `RUN --mount` で指定したIDと一致している必要があります。
    - 各プレースホルダー (`[YOUR_REGION]`, `[YOUR_PROJECT_ID]`, `[REPOSITORY_NAME]`, `[IMAGE_NAME]`) を実際の値に置き換えてください。
    - **末尾の `.` は、現在のディレクトリをビルドコンテキストとして指定する重要な引数です。**

4.  **Dockerイメージのプッシュ:**
    ```bash
    docker push [YOUR_REGION]-docker.pkg.dev/[YOUR_PROJECT_ID]/[REPOSITORY_NAME]/[IMAGE_NAME]:latest
    ```

## 4. Cloud Runへのデプロイ

最後に、プッシュしたDockerイメージをCloud Runにデプロイします。APIキーはすでにイメージに焼きこまれているため、デプロイ時に環境変数を設定する必要はありません。

```bash
gcloud run deploy [SERVICE_NAME] \
  --image [YOUR_REGION]-docker.pkg.dev/[YOUR_PROJECT_ID]/[REPOSITORY_NAME]/[IMAGE_NAME]:latest \
  --platform managed \
  --allow-unauthenticated
```
- `[SERVICE_NAME]` はCloud Runのサービス名に置き換えてください。
- `--allow-unauthenticated` フラグは、誰でもアクセスできる公開サービスを作成します。認証が必要な場合は、このフラグを削除してください。

デプロイが完了すると、サービスのURLが出力されます。

## 5. アプリケーションの更新と再デプロイ

アプリケーションのコードや環境変数を変更した場合は、手順3と4を再度実行してサービスを更新します。
1.  `.env.production` を更新します（必要な場合）。
2.  新しいDockerイメージをビルドします（手順3.3）。
3.  新しいイメージをプッシュします（手順3.4）。
4.  Cloud Runサービスを再デプロイします（手順4）。
