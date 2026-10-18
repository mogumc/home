import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { seoPlugin } from './build/plugins/seo.js'
import { pagesFallbackPlugin } from './build/plugins/pages-fallback.js'
import { PAGES } from './src/router/pages.js'

/**
 * GitHub Pages 两种常见部署方式：
 * - 项目页 https://<user>.github.io/<repo>/  → base 必须是 '/<repo>/'
 * - 用户页 / 自定义域名                        → base 为 '/'
 *
 * 部署工作流会自动注入 VITE_BASE，本地开发默认 '/'。
 * 手动构建项目页：VITE_BASE=/home/ npm run build
 */
const base = process.env.VITE_BASE || '/'

const siteConfig = JSON.parse(
  readFileSync(new URL('./home.config.json', import.meta.url), 'utf8'),
)

export default defineConfig({
  base,
  plugins: [
    vue(),
    seoPlugin({
      site: siteConfig.site,
      routes: PAGES,
      homeTitle: `${siteConfig.site.name} - ${PAGES[0].title}`,
    }),
    pagesFallbackPlugin({ routes: PAGES }),
  ],
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 内联小于 4KB 的资源，少几个请求
    assetsInlineLimit: 4096,
  },
})
