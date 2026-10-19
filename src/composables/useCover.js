/**
 * 首屏（cover）与内容区的交接控制。
 *
 * 页面结构是一整条竖向流：<HeroCover>（一屏高）+ <main class="page-shell">。
 * 所以「回到首屏 / 拉下内容」本质上就是滚动到 0 或滚动到内容顶端。
 *
 * 路由守卫和 App 共用这里的单例状态，避免两处各自算一遍高度。
 *
 * 节奏：这是个慢信息流站点，切页不是即时反馈——
 * 上滑、停顿、下拉三段，每段都有保底时长，宁可慢一点也不要有「闪过去」的感觉。
 */
import { ref } from 'vue'
import { scrollToY, wait } from '../utils/scroll'

/** 内容 → 首屏：把内容推下去，露出名字屏 */
const BACK_MS = 460
/** 首屏 → 内容：把新页面拉上来 */
const ENTER_MS = 820
/** 停在名字屏的保底时间：到得再快，也让人看清这屏再走 */
const HOLD_MS = 240

/** 首屏高度 = 内容区的起点，App 挂载后测量写入 */
export const coverHeight = ref(0)

/** 是否正在执行这段交互动画（滚轮处理要靠它让路） */
export const coverBusy = ref(false)

let coverEl = null
let seq = 0

export function setCoverElement(el) {
  coverEl = el
  measureCover()
}

/** 视口变化（移动端地址栏收起、窗口缩放）后重新量一次 */
export function measureCover() {
  const height = coverEl?.offsetHeight || window.innerHeight
  coverHeight.value = height > 0 ? height : window.innerHeight
}

async function run(targetY, duration) {
  const mine = ++seq
  coverBusy.value = true
  await scrollToY(targetY, duration)
  if (mine === seq) coverBusy.value = false
}

/** 回到首屏：切页前先把内容滑下去，露出名字屏；并在首屏停留一个保底时间 */
export async function toCover() {
  if (window.scrollY >= 2) await run(0, BACK_MS)
  // 从内容区过来时这段停顿让人看清名字屏；本来就在首屏时它就是「别急着走」
  await wait(HOLD_MS)
}

/** 进入内容：换页完成后自动把新页面拉上来 */
export function toContent() {
  // 直接量内容区在文档里的位置，比缓存的 coverHeight 更抗视口变化
  const shell = document.querySelector('.page-shell')
  const target = shell
    ? shell.getBoundingClientRect().top + window.scrollY
    : coverHeight.value || window.innerHeight
  if (Math.abs(window.scrollY - target) < 2) return Promise.resolve()
  return run(target, ENTER_MS)
}
