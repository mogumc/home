/**
 * 滚动动画 —— 首屏与内容区之间的「上滑 / 下拉」全靠这里。
 *
 * 不用 scroll-behavior: smooth：原生平滑滚动的时长由浏览器决定（通常 300~500ms、
 * 距离越远越久），没法跟首屏动效对上节奏。自己按帧插值，时长说了算。
 */

/** 起止都慢、中间快，长距离滚动看着最舒服 */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

let activeFrame = 0
let activeResolve = null

/**
 * 保底时长：这段滚动是「换了一页」的唯一提示，太快就成了瞬移。
 * 宁可慢一点，也不要让人以为页面卡了一下。调用方传的时长低于它就按它来。
 */
const MIN_DURATION = 380

/** 打断上一次没跑完的滚动（连续点导航时用） */
export function cancelScroll() {
  if (activeFrame) cancelAnimationFrame(activeFrame)
  activeFrame = 0
  const resolve = activeResolve
  activeResolve = null
  resolve?.()
}

/** 单纯等一会儿，给「停在首屏」留保底时间 */
export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 平滑滚到某个位置。
 * @param {number} targetY 目标滚动位置
 * @param {number} duration 期望时长（低于 MIN_DURATION 按 MIN_DURATION 算）
 * @returns {Promise<void>} 动画结束（或被取消）后 resolve
 */
export function scrollToY(targetY, duration = 600) {
  cancelScroll()

  const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  const startY = window.scrollY
  const endY = Math.min(Math.max(0, targetY), maxY)
  const delta = endY - startY
  const effective = Math.max(MIN_DURATION, duration)

  // 原地不动 → 别让回调永远挂着
  if (Math.abs(delta) < 1) {
    window.scrollTo(0, endY)
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      activeFrame = 0
      activeResolve = null
      resolve()
    }
    activeResolve = finish

    const startTime = performance.now()
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / effective)
      window.scrollTo(0, startY + delta * easeInOutCubic(t))
      if (t < 1) activeFrame = requestAnimationFrame(step)
      else finish()
    }
    activeFrame = requestAnimationFrame(step)
  })
}
