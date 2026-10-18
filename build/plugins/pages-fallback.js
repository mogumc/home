/**
 * GitHub Pages 的 SPA 兜底。
 *
 * 没有服务端 rewrite，history 路由直接访问 /music 会吃到 404。做法：
 * 1. 把 index.html 复制成 404.html —— 未匹配的路径返回应用外壳，由前端路由接管；
 * 2. 再给每个页面生成 <path>/index.html —— 让 sitemap 里的地址返回 200 而不是 404。
 *
 * 两种文件内容一样，浏览器打开后都是同一个 SPA。
 */
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export function pagesFallbackPlugin({ routes }) {
  return {
    name: 'home-pages-fallback',
    apply: 'build',

    writeBundle(options) {
      const outDir = options.dir
      if (!outDir) return

      const indexFile = join(outDir, 'index.html')

      // 任何未匹配路径都由前端路由接管
      copyFileSync(indexFile, join(outDir, '404.html'))

      for (const route of routes) {
        // 根路径已有 index.html；动态路由静态生成不了
        if (route.path === '/' || route.path.includes(':')) continue
        const dir = route.path.replace(/^\/+/, '').replace(/\/+$/, '')
        if (!dir) continue
        mkdirSync(join(outDir, dir), { recursive: true })
        copyFileSync(indexFile, join(outDir, dir, 'index.html'))
      }
    },
  }
}
