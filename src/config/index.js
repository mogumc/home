import { ref } from 'vue'
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

/** 首屏文案在这里就退好，组件里不用再写一串 || */
const heroGreetings = (
  Array.isArray(merged.hero?.greetings) ? merged.hero.greetings : []
)
  .map((item) => text(item))
  .filter(Boolean)

const hero = {
  title:
    text(merged.hero?.title) ||
    text(merged.profile?.name) ||
    text(merged.site?.name) ||
    'Home',
  // 没配就退回原来那句副标题，至少还有一行字在打字
  greetings: heroGreetings.length
    ? heroGreetings
    : [text(merged.profile?.subtitle) || text(merged.site?.description)].filter(Boolean),
  hint: text(merged.hero?.hint) || 'PRESS START',
}

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

  hero,

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

const BG_CACHE_KEY = 'home:bg'

/**
 * 当前背景图地址。用 ref 交给 App.vue 渲染成固定的 <img> 图层，
 * 不走 CSS background：路由切换时这层不会被重建，也就不会重新请求。
 */
export const backgroundUrl = ref('')

/** 看起来就是一张图，不用再去解析跳转 */
function isDirectImage(url) {
  return /\.(?:jpe?g|png|webp|avif|gif|svg)(?:[?#].*)?$/i.test(url)
}

function readCachedBackground(images) {
  try {
    const raw = sessionStorage.getItem(BG_CACHE_KEY)
    if (!raw) return ''
    const entry = JSON.parse(raw)
    // 配置换过图就作废，避免一直用旧的
    if (!entry?.resolved || !images.includes(entry.source)) return ''
    return entry.resolved
  } catch {
    return ''
  }
}

function writeCachedBackground(source, resolved) {
  try {
    sessionStorage.setItem(BG_CACHE_KEY, JSON.stringify({ source, resolved }))
  } catch {
    // 隐私模式下 sessionStorage 可能不可用，忽略
  }
}

/**
 * 背景图。
 *
 * 随机图接口（如次元 API）每次请求都 302 到不同的图，而且跳转响应没有缓存头，
 * 所以只要换一次请求就会换图。策略：
 * - 配置里是固定图片地址 → 同一会话内复用同一张；
 * - 是随机接口 → 每次加载取一张，进了页面就不再请求（图层只建一次）。
 */
export function initBackground() {
  const { images } = config.background
  if (!images.length) return

  const cached = readCachedBackground(images)
  if (cached) {
    backgroundUrl.value = cached
    return
  }

  const source = images[Math.floor(Math.random() * images.length)]
  backgroundUrl.value = source

  // 只有固定图片值得记下来，随机接口记了也没意义
  if (isDirectImage(source)) writeCachedBackground(source, source)
}

/**
 * 把外观类配置刷到 CSS 变量上，main.js 挂载前调用，避免闪一下默认样式
 */
export function applyAppearance() {
  const root = document.documentElement
  root.style.setProperty('--site-bg-mask', `rgba(0, 0, 0, ${config.background.mask})`)
  root.lang = config.site.lang

  const cached = readCachedBackground(config.background.images)
  if (cached) backgroundUrl.value = cached
}
