/**
 * 构建期生成 sitemap.xml、robots.txt，并把首页 title/description/canonical
 * 换成 home.config.json 里的值。
 *
 * 路由清单来自 src/router/pages.js，和前端路由共用一份，不会对不上。
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeXml(value = '') {
  return escapeHtml(value).replace(/'/g, '&apos;')
}

/** 统一成带尾斜杠的绝对地址，避免 sitemap 里出现需要跳转的链接 */
function absoluteUrl(siteUrl, path) {
  if (path === '/') return `${siteUrl}/`
  return `${siteUrl}${path.replace(/\/+$/, '')}/`
}

export function seoPlugin({ site, routes, homeTitle }) {
  const siteUrl = (site.url || '').replace(/\/+$/, '')
  const title = homeTitle || site.name
  const buildDate = new Date().toISOString().slice(0, 10)

  return {
    name: 'home-seo',
    apply: 'build',

    transformIndexHtml(html) {
      const headTags = []

      if (site.description) {
        headTags.push({
          tag: 'meta',
          attrs: { name: 'description', content: site.description },
          injectTo: 'head',
        })
        headTags.push({
          tag: 'meta',
          attrs: { property: 'og:description', content: site.description },
          injectTo: 'head',
        })
      }

      if (site.keywords) {
        headTags.push({
          tag: 'meta',
          attrs: { name: 'keywords', content: site.keywords },
          injectTo: 'head',
        })
      }

      headTags.push(
        { tag: 'meta', attrs: { property: 'og:title', content: title }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' }, injectTo: 'head' },
      )

      if (siteUrl) {
        headTags.push(
          { tag: 'link', attrs: { rel: 'canonical', href: `${siteUrl}/` }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:url', content: `${siteUrl}/` }, injectTo: 'head' },
        )
      }

      return {
        html: html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`),
        tags: headTags,
      }
    },

    writeBundle(options) {
      const outDir = options.dir
      if (!outDir) return

      if (!siteUrl) {
        this.warn('home.config.json 里没填 site.url，已跳过 sitemap.xml / robots.txt 生成')
        return
      }

      const entries = routes
        .filter((route) => !route.path.includes(':'))
        .map((route) =>
          [
            '  <url>',
            `    <loc>${escapeXml(absoluteUrl(siteUrl, route.path))}</loc>`,
            `    <lastmod>${buildDate}</lastmod>`,
            `    <changefreq>${route.changefreq || 'weekly'}</changefreq>`,
            `    <priority>${route.priority ?? 0.5}</priority>`,
            '  </url>',
          ].join('\n'),
        )
        .join('\n')

      writeFileSync(
        join(outDir, 'sitemap.xml'),
        [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          entries,
          '</urlset>',
          '',
        ].join('\n'),
      )

      writeFileSync(
        join(outDir, 'robots.txt'),
        ['User-agent: *', 'Allow: /', '', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n'),
      )
    },
  }
}
