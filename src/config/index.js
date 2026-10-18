import rawConfig from '../../home.config.json'
import { defaultConfig } from './defaults'

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** 深合并：对象递归，数组/标量直接覆盖 */
function merge(base, override) {
  if (!isPlainObject(override)) return override ?? base
  const result = { ...base }
  for (const [key, value] of Object.entries(override)) {
    result[key] = isPlainObject(base?.[key]) ? merge(base[key], value) : value
  }
  return result
}

function text(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function clamp(value, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

/** 只保留有名字和地址的链接项 */
function normalizeLinks(list, withDesc = false) {
  if (!Array.isArray(list)) return []
  return list
    .filter((item) => isPlainObject(item) && text(item.name) && text(item.url))
    .map((item) => ({
      name: text(item.name),
      icon: text(item.icon) || 'link-45deg',
      url: text(item.url),
      ...(withDesc
        ? { desc: text(item.desc), category: text(item.category) || '常用站点' }
        : {}),
    }))
}

function normalizeModuleToggle(value, extra = {}) {
  if (value === true || value === false) return { enabled: value, ...extra }
  if (!isPlainObject(value)) return { enabled: false, ...extra }
  return { ...extra, ...value, enabled: value.enabled === true }
}

const merged = merge(defaultConfig, rawConfig)

const images = Array.isArray(merged.background.images)
  ? merged.background.images
  : [merged.background.images]

export const config = {
  site: {
    name: text(merged.site.name) || 'Home',
    url: text(merged.site.url).replace(/\/+$/, ''),
    description: text(merged.site.description),
    keywords: text(merged.site.keywords),
    lang: text(merged.site.lang) || 'zh-CN',
    footerSince: Number.isFinite(Number(merged.site.footerSince))
      ? Number(merged.site.footerSince)
      : new Date().getFullYear(),
    footerLink: text(merged.site.footerLink),
  },

  background: {
    images: images.map((src) => text(src)).filter(Boolean),
    mask: clamp(merged.background.mask, 0, 1),
  },

  profile: {
    avatar: text(merged.profile.avatar),
    badge: text(merged.profile.badge),
    greeting: text(merged.profile.greeting),
    name: text(merged.profile.name),
    subtitle: text(merged.profile.subtitle),
    highlights: Array.isArray(merged.profile.highlights)
      ? merged.profile.highlights
          .filter((item) => isPlainObject(item) && text(item.text))
          .map((item) => ({ icon: text(item.icon), text: text(item.text) }))
      : [],
    skillsImage: text(merged.profile.skillsImage),
    lines: Array.isArray(merged.profile.lines)
      ? merged.profile.lines.map((line) => text(line)).filter(Boolean)
      : [],
  },

  socials: normalizeLinks(merged.socials),
  homeSites: normalizeLinks(merged.homeSites),
  webSites: normalizeLinks(merged.webSites, true),

  modules: {
    hitokoto: merged.modules.hitokoto !== false,
    clock: merged.modules.clock !== false,
    rss: normalizeModuleToggle(merged.modules.rss, {
      url: text(merged.modules.rss?.url),
      limit: Math.max(1, Number(merged.modules.rss?.limit) || 4),
    }),
    customHtml: normalizeModuleToggle(merged.modules.customHtml, {
      html: text(merged.modules.customHtml?.html),
    }),
  },

  nav: {
    enabled: merged.nav.enabled !== false,
  },

  music: {
    api: text(merged.music.api),
    fallback: Array.isArray(merged.music.fallback)
      ? merged.music.fallback
          .filter((song) => isPlainObject(song) && text(song.url))
          .map((song) => ({
            title: text(song.title),
            author: text(song.author),
            url: text(song.url),
            lrc: text(song.lrc),
          }))
      : [],
  },
}

/**
 * 把外观类配置刷到 CSS 变量上，main.js 挂载前调用，避免闪一下默认样式
 */
export function applyAppearance() {
  const root = document.documentElement
  const { images, mask } = config.background

  if (images.length) {
    const pick = images[Math.floor(Math.random() * images.length)].replace(/^["']|["']$/g, '')
    root.style.setProperty('--site-bg', `url("${pick}")`)
  } else {
    root.style.setProperty('--site-bg', 'none')
  }

  root.style.setProperty('--site-bg-mask', `rgba(0, 0, 0, ${mask})`)
  root.lang = config.site.lang
}
