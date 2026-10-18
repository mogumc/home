import { onUnmounted, ref } from 'vue'

/**
 * 共享时钟：全站只跑一个 setInterval，
 * 页面来回切换时不会攒下一堆定时器。
 */
const time = ref('--:--:--')
const date = ref('--')

let timer = null
let subscribers = 0

function tick() {
  const now = new Date()
  time.value = now.toLocaleTimeString()
  date.value = now.toLocaleDateString()
}

function subscribe() {
  subscribers += 1
  if (timer) return
  tick()
  timer = setInterval(tick, 1000)
}

function unsubscribe() {
  subscribers = Math.max(0, subscribers - 1)
  if (subscribers === 0 && timer) {
    clearInterval(timer)
    timer = null
  }
}

export function useClock() {
  subscribe()
  onUnmounted(unsubscribe)
  return { time, date }
}
