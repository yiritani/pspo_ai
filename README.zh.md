# PSPO AI 学习室

[日本語](README.ja.md) · [English](README.en.md) · [简体中文](README.zh.md) · [Español](README.es.md)

面向 PSPO-AI Essentials 的免费学习应用，收录 124 道练习题及各选项的解析。本项目为非官方学习资料，与 Scrum.org 无关，不包含真实考题或历年试题。

[打开应用](https://yiritani.github.io/pspo_ai/) · [GitHub](https://github.com/yiritani/pspo_ai)

## 功能

- 每次练习最多 40 题，优先出答对次数较少的题目。
- 普通和困难两种模式。每种模式下累计答对两次，即视为已掌握。
- 支持错题复习，以及通过 JSON 导入、导出自定义题目。
- 学习进度和语言设置保存在浏览器中。无需注册，不支持跨设备同步。

## 语言

支持日语、英语、简体中文和西班牙语。切换应用语言不会改变 URL。题目与解析以各语言独立的静态页面公开，方便搜索引擎收录。

[日本語](https://yiritani.github.io/pspo_ai/questions/) · [English](https://yiritani.github.io/pspo_ai/en/questions/) · [中文题目](https://yiritani.github.io/pspo_ai/zh/questions/) · [Español](https://yiritani.github.io/pspo_ai/es/questions/)

## 开发

使用 React 和 Vite 构建。

```sh
npm install
npm run dev
```

打开终端显示的本地 URL。检查与构建命令：

```sh
npm test
npm run build
```

题目数据位于 `public/questions.json`，困难模式选项位于 `public/questions-hard.json`，界面文案位于 `src/messages.js`。修改题目时，请同步更新对应的 `.en.json`、`.zh.json` 和 `.es.json` 文件。自定义或编辑过的题目不会自动翻译。

推送到 `main` 后，GitHub Actions 会运行测试、构建并部署到 GitHub Pages。

## 参与贡献

欢迎直接提交 PR 或 Issue，无需事先询问。欢迎修正题目、改进翻译或提出功能建议。
