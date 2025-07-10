# チケット整形プログラムの実行方法

このドキュメントは、`format_tickets.py` を実行して、JSON形式のチケットデータを整形する方法について説明します。

## 前提条件

- Python 3.x がインストールされていること。

## 必要なファイル

プログラムを実行するには、同じディレクトリに以下の2つのファイルが必要です。

1.  `dummy_azure_tickets.json`: 整形対象のチケットデータが格納されたJSONファイル。
2.  `format_tickets.py`: 実行するPythonスクリプト。

## 実行手順

1.  ターミナル（コマンドプロンプトやPowerShellなど）を開きます。
2.  上記のファイルが保存されているディレクトリに移動します。
3.  以下のコマンドを実行します。

```bash
python format_tickets.py
```

## 実行結果

コマンドを実行すると、`Successfully formatted tickets and saved to formatted_tickets.txt` というメッセージがコンソールに表示されます。

同時に、同じディレクトリに `formatted_tickets.txt` という新しいファイルが生成されます。このファイルには、`dummy_azure_tickets.json` の各チケットが `--- TICKET BREAK ---` という区切り文字で区切られて保存されています。
