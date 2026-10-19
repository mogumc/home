/**
 * 歌单的取用规则（这是「缓存 + 差异刷新」的唯一入口）
 *
 * 1. 本地缓存先上屏：列表存在 localStorage，进页面不用等接口就有歌；
 * 2. 接口回来先比对内容指纹：一致只把「临时签名地址」换新，列表不重建；
 * 3. 内容真变了才替换列表，由调用方决定怎么对齐当前播放；
 * 4. 刚校验过的一小段时间内直接复用内存里那份，切页来回不打接口。
 */
import { config } from '../config'

const CACHE_PREFIX = 'home:playlist:'
const CACHE_VERSION = 1
/** 内存复用窗口的兜底值（配置项 music.cache.revalidate 会覆盖它） */
const REVALIDATE_FALLBACK = 60_000

/** 接口字段名各家用得不一样，统一成播放器认的形状 */
export function normalizeSong(song = {}) {
  return {
    title: song.title || song.name || '',
    author: song.author || song.artist || '',
    url: (song.url || '').trim(),
    lrc: song.lrc || '',
    cover: song.cover || song.pic || '',
  }
}

/**
 * 内容指纹：只认「有哪些歌、什么顺序」，不看 url。
 * 音频地址是临时签名，每请求一次都不一样，算进去就永远是「有差异」。
 */
export function signatureOf(list) {
  let hash = 2166136261
  for (const song of list) {
    const key = `${song.title}\u0001${song.author}\u0002`
    for (let i = 0; i < key.length; i += 1) {
      hash ^= key.charCodeAt(i)
      hash = Math.imul(hash, 16777619)
    }
  }
  return `${list.length}:${(hash >>> 0).toString(36)}`
}

function cacheKey(api) {
  return `${CACHE_PREFIX}${CACHE_VERSION}:${api}`
}

/**
 * 读缓存。隐私模式下 localStorage 会抛，直接当没缓存。
 * @returns {{ list: object[], sig: string, savedAt: number } | null}
 */
export function readCache(api = config.music.api) {
  if (!api) return null
  try {
    const raw = localStorage.getItem(cacheKey(api))
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (!entry || entry.v !== CACHE_VERSION || !Array.isArray(entry.list)) return null
    const list = entry.list.map(normalizeSong).filter((song) => song.url)
    if (!list.length) return null
    return { list, sig: entry.sig || signatureOf(list), savedAt: Number(entry.savedAt) || 0 }
  } catch {
    return null
  }
}

export function writeCache(list, sig, api = config.music.api) {
  if (!api || !list.length) return
  try {
    localStorage.setItem(
      cacheKey(api),
      JSON.stringify({ v: CACHE_VERSION, sig, savedAt: Date.now(), list }),
    )
  } catch {
    // 存不下（配额/隐私模式）就算了，功能不依赖它
  }
}

let memo = { api: '', list: null, at: 0 }
let inflight = null

async function request(api) {
  try {
    // 音频地址是临时签名，歌单 JSON 不能吃浏览器缓存，否则拿回来的是过期地址
    const res = await fetch(api, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data?.data)) return []
    return data.data.map(normalizeSong).filter((song) => song.url)
  } catch (err) {
    console.warn('[player] 歌单接口失败', err)
    return []
  }
}

/**
 * 拉歌单。并发请求合并成一个，成功的列表顺手写进缓存。
 * @param {{ force?: boolean }} options force 会跳过内存复用窗口（签名过期时用）
 * @returns {Promise<object[]>} 失败返回空数组
 */
export function fetchPlaylist({ force = false } = {}) {
  const api = config.music.api
  if (!api) return Promise.resolve([])

  const now = Date.now()
  const ttl = Number.isFinite(config.music.cache?.revalidate)
    ? config.music.cache.revalidate
    : REVALIDATE_FALLBACK
  if (!force && memo.api === api && memo.list && now - memo.at < ttl) {
    return Promise.resolve(memo.list)
  }
  if (inflight) return inflight

  inflight = request(api)
    .then((list) => {
      if (!list.length) return list
      const sig = signatureOf(list)
      memo = { api, list, at: Date.now() }
      writeCache(list, sig, api)
      return list
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

/**
 * 首页空闲时先把歌单拉进缓存：之后进音乐页列表已经在本地，不用干等接口。
 * 拉的是索引（几十 KB 的 JSON），不涉及音频文件。
 */
export function warmCache() {
  const run = () => {
    fetchPlaylist()
  }
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 2500 })
    return
  }
  setTimeout(run, 400)
}
