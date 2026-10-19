<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppFooter from './components/AppFooter.vue'
import HeroCover from './components/HeroCover.vue'
import MiniPlayer from './components/MiniPlayer.vue'
import NavBar from './components/NavBar.vue'
import PlayerAudio from './components/PlayerAudio.vue'
import { backgroundUrl } from './config'
import { coverBusy, coverHeight, measureCover, setCoverElement, toContent } from './composables/useCover'
import { warmCache } from './utils/playlist'

const route = useRoute()
const coverRef = ref(null)
const backgroundReady = ref(false)

/**
 * 播放器第一次进音乐页才初始化（歌单接口不便宜），
 * 但一旦起来，<audio> 就常驻在这里，切页不断歌。
 *
 * 判断用路由 name 而不是 path：GitHub Pages 之类的静态托管会把
 * /music 301 成 /music/，比 path 字符串会把「直接进来的音乐页」漏掉，
 * 结果就是歌单永远不拉、<audio> 永远不建。
 */
const playerStarted = ref(false)

watch(
  () => route.name,
  (name) => {
    if (name === 'music') playerStarted.value = true
  },
  { immediate: true },
)

/** 滚动位置：驱动首屏淡出和页脚显隐，按帧合并，不跟着每个 scroll 事件重排 */
const scrollY = ref(0)
let scrollFrame = 0

const coverProgress = computed(() =>
  coverHeight.value > 0 ? Math.min(1, scrollY.value / coverHeight.value) : 0,
)

/** 页脚只在内容区露头；停在名字屏时让它靠边站 */
const inContent = computed(() => scrollY.value > coverHeight.value * 0.5)

function readScroll() {
  if (scrollFrame) return
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0
    scrollY.value = window.scrollY
  })
}

/** 停在首屏时向下滚：一格就进内容，别让人卡在半屏 */
function onWheel(event) {
  // 动画期间挡住原生滚动，否则惯性会跟动画抢位置
  if (coverBusy.value) {
    event.preventDefault()
    return
  }
  if (event.deltaY <= 0 || window.scrollY > 6) return
  event.preventDefault()
  toContent()
}

function onKeydown(event) {
  if (window.scrollY > 6) return
  // 焦点在按钮/链接上时，空格是「按下它」，别再抢
  const tag = event.target?.tagName
  if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA') return
  if (![' ', 'Spacebar', 'PageDown', 'ArrowDown', 'End'].includes(event.key)) return
  event.preventDefault()
  toContent()
}

function onResize() {
  measureCover()
}

watch(
  () => route.path,
  async () => {
    // 「回到首屏」由路由守卫负责（那时新页面还没进来）；
    // 这里等新页面挂上、排完版，再把内容拉下来
    await nextTick()
    requestAnimationFrame(() => requestAnimationFrame(() => toContent()))
  },
)

onMounted(() => {
  // 刷新时浏览器会恢复上次的滚动位置，一进来就落在内容区，名字屏就白做了
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  // 顺手把可能被恢复/锚定出来的那点偏移清掉，首屏必须整屏干净
  window.scrollTo(0, 0)
  setCoverElement(coverRef.value)
  window.addEventListener('scroll', readScroll, { passive: true })
  window.addEventListener('resize', onResize)
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKeydown)
  readScroll()

  // 首屏闲下来先把歌单索引拉进缓存：之后进音乐页直接有列表，不用等接口
  warmCache()
})

onUnmounted(() => {
  window.removeEventListener('scroll', readScroll)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('keydown', onKeydown)
  if (scrollFrame) cancelAnimationFrame(scrollFrame)
})
</script>

<template>
  <!-- 背景是一层常驻的 <img>：路由切换时不会重建，也就不会重新请求换图 -->
  <div class="bg-layer" aria-hidden="true">
    <img
      v-if="backgroundUrl"
      :src="backgroundUrl"
      alt=""
      :class="{ 'is-ready': backgroundReady }"
      @load="backgroundReady = true"
    />
  </div>

  <NavBar :hidden="!inContent" />

  <HeroCover ref="coverRef" :progress="coverProgress" @enter="toContent" />

  <main class="page-shell">
    <RouterView v-slot="{ Component, route: currentRoute }">
      <component :is="Component" :key="currentRoute.path" />
    </RouterView>
  </main>

  <AppFooter :hidden="!inContent" />

  <PlayerAudio v-if="playerStarted" />
  <MiniPlayer :shown="inContent" />
</template>
