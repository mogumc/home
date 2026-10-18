/**
 * LRC 歌词解析与"当前高亮行"计算
 * 原来的做法是拼 HTML 字符串交给 v-html，这里改成结构化数据，
 * 由模板插值渲染，避免注入和文本被转义问题。
 */

const TIME_TAG = /\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g
const EMPTY_PLACEHOLDER = '♫ ♫ ♫'

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
 * 算出当前该显示哪几行（当前行 + 上下文一行）
 * @param {{time:number,text:string}[]} lines
 * @param {number} currentTime 播放进度（秒）
 * @returns {{ text: string, active: boolean, progress: number }[]}
 */
export function buildLyricView(lines, currentTime) {
  if (!lines.length) return []

  const active = new Set()
  for (let i = 0; i < lines.length; i++) {
    const next = lines[i + 1]
    if (lines[i].time <= currentTime && (!next || next.time > currentTime)) {
      active.add(i)
    }
  }
  if (!active.size) return []

  // 同一时间戳的多行（对唱、翻译）一起高亮
  const activeTimes = new Set([...active].map((i) => lines[i].time))
  lines.forEach((line, i) => {
    if (activeTimes.has(line.time)) active.add(i)
  })

  const shown = new Set()
  active.forEach((i) => {
    if (!isBlank(lines[i].text)) shown.add(i)
  })

  // 当前行是空文本（间奏）时，向上下找最近一句有词的
  if (!shown.size) {
    const base = Math.min(...active)
    for (let offset = 0; offset < lines.length; offset++) {
      const before = base - 1 - offset
      if (before >= 0 && !isBlank(lines[before].text)) {
        shown.add(before)
        break
      }
      const after = base + 1 + offset
      if (after < lines.length && !isBlank(lines[after].text)) {
        shown.add(after)
        break
      }
    }
  }

  const first = Math.min(...active)
  const last = Math.max(...active)
  if (first - 1 >= 0 && !isBlank(lines[first - 1].text)) shown.add(first - 1)
  if (last + 1 < lines.length) shown.add(last + 1)

  return [...shown]
    .sort((a, b) => a - b)
    .map((i) => ({
      text: isBlank(lines[i].text) ? EMPTY_PLACEHOLDER : lines[i].text,
      active: active.has(i),
      progress: active.has(i) ? lineProgress(lines, i, currentTime) : 0,
    }))
}
