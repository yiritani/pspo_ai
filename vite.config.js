import { defineConfig } from 'vite';

// GitHub Pagesでは /リポジトリ名/ 配下で配信するため、デプロイ時だけBASE_PATHで指定する。
export default defineConfig({
  base: process.env.BASE_PATH || '/',
});
