/**
 * v-fit-text —— 单行文本自适应缩小字号
 *
 * 地址集卡片里的站名长短不一，用完整字号会溢出，直接省略号又看不清。
 * 这个指令在放不下时按比例缩字号，直到刚好塞进容器。
 * 前提：元素自身 white-space: nowrap; overflow: hidden，
 * 父容器 min-width: 0（否则元素会被内容撑开，永远不触发）。
 *
 * 用法：v-fit-text 或 v-fit-text="{ minScale: 0.6 }"
 */

const state = new WeakMap()

function readMinScale(binding) {
  if (typeof binding.value === 'number') return binding.value
  if (binding.value && typeof binding.value.minScale === 'number') return binding.value.minScale
  return 0.6
}

function applyFit(el, minScale) {
  // 先还原字号拿基准值，保证重复调用幂等
  el.style.fontSize = ''
  const base = Number.parseFloat(getComputedStyle(el).fontSize)
  if (!base) return

  const min = base * minScale
  let size = base
  for (let i = 0; i < 8 && el.scrollWidth > el.clientWidth; i++) {
    size = Math.max(size * (el.clientWidth / el.scrollWidth), min)
    el.style.fontSize = `${size}px`
    if (size <= min) break
  }
}

export const fitText = {
  mounted(el, binding) {
    const minScale = readMinScale(binding)
    const observer = new ResizeObserver(() => applyFit(el, minScale))
    observer.observe(el)
    document.fonts?.ready.then(() => applyFit(el, minScale))
    state.set(el, { observer, minScale })
    applyFit(el, minScale)
  },

  updated(el, binding) {
    const ctrl = state.get(el)
    if (!ctrl) return
    ctrl.minScale = readMinScale(binding)
    applyFit(el, ctrl.minScale)
  },

  beforeUnmount(el) {
    state.get(el)?.observer.disconnect()
    state.delete(el)
  },
}
