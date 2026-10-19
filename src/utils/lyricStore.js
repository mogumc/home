/**
 * 歌词缓存。
 *
 * 歌词是纯文本，一首几 KB，切回上一首没理由再请求一遍；
 * 解析结果也一起存，省得反复正排。预加载（warm）和播放共用这一份，
 * 谁先到谁写，后来的直接命中。
 */
import { parseLrc } from './lrc'

/** 最多记这么多首，超了丢最早的那条 */
const CACHE_LIMIT = 80

const cache = new Map()
const pending = new Map()

function remember(url, lines) {
  if (cache.size >= CACHE_LIMIT && !cache.has(url)) {
    const oldest = cache.keys().next().value
    cache.delete(oldest)
  }
  cache.set(url, lines)
}

/**
 * 取歌词（已解析）。失败不缓存，下次还有机会重试。
 * @param {string} url
 * @returns {Promise<{time:number,text:string}[]>}
 */
export function loadLyric(url) {
  if (!url) return Promise.resolve([])

  const hit = cache.get(url)
  if (hit) {
    // 命中的挪到队尾，让它晚点被淘汰
    cache.delete(url)
    cache.set(url, hit)
    return Promise.resolve(hit)
  }

  const running = pending.get(url)
  if (running) return running

  const task = (async () => {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const lines = parseLrc(await res.text())
      remember(url, lines)
      return lines
    } catch {
      return []
    } finally {
      pending.delete(url)
    }
  })()

  pending.set(url, task)
  return task
}

/** 预热用：结果没人要也无所谓，请求先发出去 */
export function prefetchLyric(url) {
  if (!url || cache.has(url) || pending.has(url)) return
  loadLyric(url)
}
