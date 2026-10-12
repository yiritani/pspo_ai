# PSPO AI Study Room

[日本語](README.ja.md) · [English](README.en.md) · [简体中文](README.zh.md) · [Español](README.es.md)

A free study app for PSPO-AI Essentials, with 124 practice questions and explanations for each option. This is an unofficial resource, unaffiliated with Scrum.org. It does not contain actual or past exam questions.

[Open the app](https://yiritani.github.io/pspo_ai/) · [GitHub](https://github.com/yiritani/pspo_ai)

## Features

- Up to 40 questions per session, prioritizing questions with fewer correct answers.
- Normal and hard modes. Two correct answers mark a question as mastered in that mode.
- Review incorrect answers and import or export custom questions as JSON.
- Progress and language preferences stay in your browser. No account required; no syncing across devices.

## Languages

Japanese, English, Simplified Chinese, and Spanish are supported. Switching the app language keeps the same URL. Static question and explanation pages have separate URLs for each language.

[日本語](https://yiritani.github.io/pspo_ai/questions/) · [English questions](https://yiritani.github.io/pspo_ai/en/questions/) · [简体中文](https://yiritani.github.io/pspo_ai/zh/questions/) · [Español](https://yiritani.github.io/pspo_ai/es/questions/)

## Development

Built with React and Vite.

```sh
npm install
npm run dev
```

Open the local URL shown in the terminal. To check and build:

```sh
npm test
npm run build
```

Question data lives in `public/questions.json`, hard-mode options in `public/questions-hard.json`, and UI text in `src/messages.js`. When changing questions, update the matching `.en.json`, `.zh.json`, and `.es.json` files too. Custom or edited questions are not translated automatically.

Pushing to `main` runs tests and builds through GitHub Actions, then deploys to GitHub Pages.

## Contributing

Feel free to open pull requests and issues without asking first. Question corrections, translation improvements, and feature suggestions are welcome.
