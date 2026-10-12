import { defineConfig } from 'vite';
import { renderQuestionPages } from './scripts/question-pages.js';

// 問題と解説の一覧ページを、ビルド時は静的HTMLとして出力し、開発サーバーではその場で返す。
function questionPages() {
  let base = '/';
  return {
    name: 'question-pages',
    configResolved(config) { base = config.base; },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url.split('?')[0];
        const page = renderQuestionPages(base).find(p => base + p.fileName.replace(/index\.html$/, '') === path);
        if (!page) return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(page.html);
      });
    },
    generateBundle() {
      for (const page of renderQuestionPages(base)) this.emitFile({ type: 'asset', fileName: page.fileName, source: page.html });
    },
  };
}

// GitHub Pagesでは /リポジトリ名/ 配下で配信するため、デプロイ時だけBASE_PATHで指定する。
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [questionPages()],
  build: {
    // 本体には日本語の収録問題（通常・ハード）を含むため、500kBを少し超える。
    chunkSizeWarningLimit: 600,

  },
});
