/**
 * LRC 歌词解析与"当前高亮行"计算
 * 原来的做法是拼 HTML 字符串交给 v-html，这里改成结构化数据，
 * 由模板插值渲染，避免注入和文本被转义问题。
 */

const TIME_TAG = /\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g

function isBlank(text) {
  return !text || text.trim() === ''
}

/**
 * @param {string} raw LRC 文本
 * @returns {{ time: number, text: string }[]} 按时间升序
 */
export function parseLrc(raw) {
  if (!raw) return []
  const lines = []

  raw
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .forEach((line) => {
      TIME_TAG.lastIndex = 0
      const stamps = []
      let match
      while ((match = TIME_TAG.exec(line))) {
        stamps.push(Number(match[1]) * 60 + Number(match[2].replace(':', '.')))
      }
      if (!stamps.length) return

      // 去掉所有时间标签，剩下的就是歌词正文
      const text = line.replace(TIME_TAG, '').trim()
      stamps.forEach((time) => lines.push({ time, text }))
    })

  /**
   * 同一时间戳上的多行（原文 + 翻译）都保留：
   * 接口给的就是上下两行，哪一行照着唱都不该丢。
   */
  return lines.sort((a, b) => a.time - b.time)
}

/**
 * 当前行唱到哪了：按「本行时间 → 下一行时间」的比例算 0~1。
 * 最后一行没有下一行，按 4 秒估算。
 */
function lineProgress(lines, index, currentTime) {
  const start = lines[index].time

  // 同一句的翻译/罗马音会共用时间戳，得往后找真正更晚的那一行
  let end = start + 4
  for (let i = index + 1; i < lines.length; i++) {
    if (lines[i].time > start + 0.001) {
      end = lines[i].time
      break
    }
  }

  if (!(end > start)) return 0
  return Math.min(1, Math.max(0, (currentTime - start) / (end - start)))
}

/**
 * 算出当前该显示哪几句歌词。
 *
 * @param {{time:number,text:string}[]} lines
 * @param {number} currentTime 播放进度（秒）
 * @param {number} [windowSize=3] 一屏能放几句（由面板高度算出来）
 * @returns {{ text: string, active: boolean, progress: number }[]}
 */
export function buildLyricView(lines, currentTime, windowSize = 3) {
  if (!lines.length) return []

  const size = Math.max(1, Math.floor(windowSize))

  const active = new Set()
  for (let i = 0; i < lines.length; i++) {
    const next = lines[i + 1]
    if (lines[i].time <= currentTime && (!next || next.time > currentTime)) {
      active.add(i)
    }
  }

  // 同一时间戳的多行（对唱、翻译）一起高亮
  if (active.size) {
    const activeTimes = new Set([...active].map((i) => lines[i].time))
    lines.forEach((line, i) => {
      if (activeTimes.has(line.time)) active.add(i)
    })
  }

  // 还没轮到第一句时，从最前面几句开始显示
  const anchor = active.size ? Math.min(...active) : 0

  const shown = new Set()
  const picked = []

  const take = (index) => {
    if (index < 0 || index >= lines.length) return false
    if (shown.has(index) || isBlank(lines[index].text)) return false
    shown.add(index)
    picked.push(index)
    return true
  }

  // 以当前行为中心向两侧交替扩：0, -1, +1, -2, +2 …
  // 这样当前行始终在中间，上下句数平衡
  for (let step = 0; picked.length < size && step <= lines.length; step++) {
    if (step === 0) {
      take(anchor)
      continue
    }
    take(anchor + step)
    if (picked.length >= size) break
    take(anchor - step)
  }

  // 贴着头尾时一侧没得取了，用另一侧补齐，别让面板空着
  for (let i = Math.max(anchor, ...picked) + 1; picked.length < size && i < lines.length; i++) {
    take(i)
  }
  for (let i = Math.min(anchor, ...picked) - 1; picked.length < size && i >= 0; i--) {
    take(i)
  }

  return picked
    .sort((a, b) => a - b)
    .map((i) => ({
      text: lines[i].text,
      active: active.has(i),
      progress: active.has(i) ? lineProgress(lines, i, currentTime) : 0,
    }))
}
