# ファイル構造の説明

このドキュメントは、`intelligent-knowledge-distiller` プロジェクトのファイルとディレクトリの構造について説明します。

## ルートディレクトリ

- **`.gitignore`**: Gitが追跡しないファイルやディレクトリを指定します。
- **`App.tsx`**: アプリケーションのメインReactコンポーネントです。UIの主要なレイアウトを定義します。
- **`constants.ts`**: アプリケーション全体で使われる定数を定義します。
- **`index.html`**: アプリケーションのエントリーポイントとなるHTMLファイルです。
- **`index.tsx`**: ReactアプリケーションをDOMにマウントするエントリーポイントです。
- **`package.json`**: プロジェクトのメタデータ、依存関係、スクリプトを定義します。
- **`README.md` / `README_JP.md`**: プロジェクトの概要、セットアップ方法、使い方などを記述したドキュメントです。
- **`tsconfig.json`**: TypeScriptコンパイラのオプションを設定します。
- **`vite.config.ts`**: Viteのビルド設定を記述します。

## `src`

アプリケーションの主要なソースコードが格納されています。

- **`i18n.ts`**: 国際化（i18n）の設定ファイルです。`react-i18next` を使用しています。

## `components`

再利用可能なReactコンポーネントが格納されています。

- **`Header.tsx`**: アプリケーションのヘッダー部分です。
- **`InputSection.tsx`**: ユーザーがテキストを入力するセクションです。
- **`OutputSection.tsx`**: LLMからの出力を表示するセクションです。
- **`OrchestratorSection.tsx`**: 複数のLLMを連携させるための設定を行うセクションです。
- **`MarkdownRenderer.tsx`**: Markdown形式のテキストをレンダリングするコンポーネントです。
- **`SettingsModal.tsx`**: アプリケーションの設定を行うモーダルウィンドウです。
- **`ui/`**: ボタンやインプットなど、基本的なUIパーツが含まれています。
- **`icons/`**: アプリケーション内で使用されるアイコンコンポーネントが含まれています。

## `services`

外部サービスとの連携を担当するモジュールが格納されています。

- **`llmService.ts`**: 大規模言語モデル（LLM）との通信を抽象化するインターフェースです。
- **`openaiService.ts`**: OpenAI APIとの通信を処理します。
- **`geminiService.ts`**: Google Gemini APIとの通信を処理します。
- **`index.ts`**: サービスモジュールをエクスポートします。

## `public`

ビルドプロセスで処理されない静的ファイルが格納されています。

- **`locales/`**: 翻訳ファイルが言語ごとに格納されています。（例: `en/translation.json`, `ja/translation.json`）

## `dummy_data`

開発やテストに使用するダミーデータが格納されています。

- **`*.json`**: チケット情報などのダミーデータです。
- **`*.py`**: データを整形するためのPythonスクリプトです。
