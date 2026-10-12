# PSPO AI 学習ルーム

[日本語](README.md) · [English](README.en.md) · [简体中文](README.zh.md) · [Español](README.es.md)

PSPO-AI Essentials向けの無料学習アプリです。124問の練習問題と選択肢ごとの解説を収録しています。Scrum.org非公式の教材で、実際の試験問題・過去問ではありません。

[アプリを開く](https://yiritani.github.io/pspo_ai/) · [GitHub](https://github.com/yiritani/pspo_ai)

## 使い方

- 1回の練習で最大40問。正解回数の少ない問題を優先します。
- 通常・ハードの2モード。各モードで累計2回正解すると習得済みになります。
- 間違えた問題の復習と、自作問題のJSON読み込み・書き出しに対応しています。
- 学習履歴と言語設定はブラウザ内に保存します。登録不要で、端末間の同期はありません。

## 言語

日本語・英語・中国語（簡体字）・スペイン語に対応しています。学習アプリの言語切り替えではURLを変えません。問題・解説一覧は、検索向けに言語別URLで公開します。

[日本語の問題一覧](https://yiritani.github.io/pspo_ai/questions/) · [English](https://yiritani.github.io/pspo_ai/en/questions/) · [简体中文](https://yiritani.github.io/pspo_ai/zh/questions/) · [Español](https://yiritani.github.io/pspo_ai/es/questions/)

## 開発

React + Viteで構築しています。

```sh
npm install
npm run dev
```

表示されたローカルURLを開いてください。確認とビルドは次のコマンドです。

```sh
npm test
npm run build
```

問題データは `public/questions.json`、ハードモードは `public/questions-hard.json`、画面の文言は `src/messages.js` にあります。問題を変更する場合は、対応する `.en.json`・`.zh.json`・`.es.json` も更新してください。自作・編集した問題は自動翻訳しません。

`main` へのpushで、GitHub Actionsがテスト・ビルドを実行し、GitHub Pagesへ公開します。

## 参加

PR・Issueは、事前確認なしで自由に作成していただいて構いません。問題の修正、翻訳の改善、機能の提案を歓迎します。
