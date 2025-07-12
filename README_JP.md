# Intelligent Knowledge Distiller (インテリジェント知識蒸留器)

このプロジェクトは、研究論文 **「From Unstructured Communication to Intelligent RAG: Multi-Agent Automation for Supply Chain Knowledge Bases」** ([arXiv:2506.17484](https://arxiv.org/abs/2506.17484)) で提案された、マルチエージェントによる知識ベース構築システムの実装です。

サポートチケットのような非構造化テキストデータを、大規模言語モデル（LLM）を用いて、構造化され、要約された知識ベースへと変換します。このアプリケーションは、プロセスを制御するためのユーザーインターフェースを提供し、GeminiとOpenAIの両モデルに対応しています。

## 特徴

- **自動ナレッジベース構築**: 生のテキストを、カテゴリ分類され、要約されたナレッジ記事へと変換します。
- **動的カテゴリ分類**: データからカテゴリとサブカテゴリを自動的に発見します。
- **階層的処理**: アイテム数が多いカテゴリに対しては、サブカテゴリを作成して処理することで、より深い分析を行い、詳細が失われるのを防ぎます。
- **LLMの柔軟性**: GoogleのGeminiとOpenAIのモデルの両方をサポートしています。
- **カスタマイズ可能な処理**:
    - **ドメイン指定**: ユーザーはビジネスドメイン（例：「サプライチェーン」）を指定して、AIの理解を調整できます。
    - **処理モード**:
        - **シンプルモード**: 事前定義されたプロンプトを使用して処理します。
        - **ダイナミックモード**: 指定されたドメインに基づいてプロンプトを最適化し、より高品質な結果を目指します。
- **多言語対応**: ユーザーインターフェースは日本語と英語の両方で利用可能です。
- **柔軟なエンドポイント設定**: OpenAIおよびAzure OpenAI (AOAI) などの互換APIに対応するため、APIキー、ベースURL、モデル名（デプロイメント名）をUIから柔軟に設定できます。

## アーキテクチャの概要

このアプリケーションは、フロントエンドとバックエンドが一体となった、シンプルなNode.jsアプリケーションとして構成されています。

- **フロントエンド**: React, TypeScript, Viteで構築された最新のUI。
- **バックエンド**: Expressで構築された軽量なNode.jsサーバー (`server.js`)。このサーバーは以下の2つの重要な役割を担います。
    1.  **Webサーバー**: ビルドされたReactアプリケーションの静的ファイル（HTML, CSS, JS）を配信します。
    2.  **APIプロキシ**: ブラウザから外部API（Azure OpenAIなど）へ直接リクエストする際に発生するCORSエラーを回避するため、APIリクエストを安全に中継します。

この一体型構成により、ローカルでの開発と本番環境へのデプロイの両方が、シンプルかつ堅牢になっています。

## 設定

右上の歯車アイコンをクリックすると、設定モーダルが開きます。

### AIモデルプロバイダー

使用するLLMプロバイダーを選択します。

- **GEMINI**: GoogleのGeminiモデルを使用します。APIキーは `.env` ファイルで設定する必要があります。
    - **モデルの変更**:
        現在、使用されるGeminiモデルはソースコード内で直接指定されています。モデルを変更するには、`services/geminiService.ts` ファイル内の `generateContent` メソッドにある `model` の値を、希望するモデル名（例: `'gemini-2.5-flash-preview-04-17'`）に書き換えてください。
- **OPENAI**: OpenAIのモデル、または互換API（Azure OpenAIなど）を使用します。

### OpenAI / Azure OpenAI (AOAI) の設定

プロバイダーとして `OPENAI` を選択すると、以下の項目が設定可能になります。

- **OpenAI API Key**:
  - APIキーを入力します。
  - ここで入力したキーは、環境変数（`.env.local` ファイル）に設定されたキーよりも優先されます。
- **OpenAI API Base URL**:
  - APIのエンドポイントURLを指定します。
  - **Azure OpenAI (AOAI) を使用する場合**: 完全なエンドポイントURLをそのまま貼り付けることができます。アプリケーションが自動的に処理します。
    - 例: `https://example-aoai.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT_ID/chat/completions?api-version=2024-02-01`

- **OpenAI Model (任意)**:
  - モデル名を指定します。Azure OpenAI (AOAI) を使用する場合は、ここに **デプロイメント名** を入力します。

## ローカルでの実行方法

**前提条件:** Node.js

1.  リポジトリをクローンします。
2.  依存関係をインストールします:
    ```bash
    npm install
    ```
3.  ルートディレクトリに `.env.local` ファイルを作成し、APIキーを設定します。
    ```
    # Geminiを使用する場合に必要
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

    # OpenAIを使用する場合 (UIで設定しない場合)
    OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
    ```
    **注**: OpenAIのAPIキーは、UIの設定画面から直接入力することも可能です。UIで入力したキーは、この `.env.local` ファイルの設定よりも優先されます。
4.  開発サーバーを実行します:
    ```bash
    npm run dev
    ```
    このコマンドは、Vite開発サーバー（ホットリロード機能を提供）と、APIプロキシ用のNode.jsサーバーを同時に起動します。
5.  ブラウザで `http://localhost:5173` を開きます。

## Cloud Runへのデプロイ

詳細は `docs/DEPLOY_TO_GCR.md` を参照してください。
