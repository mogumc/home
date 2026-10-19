<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlayer } from '../composables/usePlayer'

const props = defineProps({
  /** 内容区是否已经滚进视口：首屏上不打扰名字屏 */
  shown: { type: Boolean, default: true },
})

const route = useRoute()
const router = useRouter()
const { title, artist, cover, isPlaying, hasPlayed, percent, currentLyric, toggle, next } =
  usePlayer()

/** 音乐页本身就是播放器；没主动播过也不显示，别无缘无故占着屏幕 */
const visible = computed(
  () =>
    props.shown &&
    // 用 name 判断，/music 和 /music/ 都算音乐页
    route.name !== 'music' &&
    !!title.value &&
    (hasPlayed.value || isPlaying.value),
)

/**
 * 第二行：播着的时候显示正在唱的那句（只取原文，翻译放不下），
 * 暂停就退回歌手名，别把上一句歌词冻在那儿。
 */
const subline = computed(() => (isPlaying.value && currentLyric.value) || artist.value)

/* ---------- 收起/展开 ---------- */
/**
 * 统一用 collapsed 控制：
 * - 有指针设备：鼠标移入展开、移出收起；
 * - 触屏没有 hover：点一下切换，滑页面或点别处也会收起来。
 */
const touchLike = window.matchMedia?.('(hover: none)').matches ?? false

/** 默认收起，先不压内容 */
const collapsed = ref(true)

function handleClick(event) {
  // 播放/下一首按钮自己管自己，别顺手把条子收起来
  if (event.target.closest?.('.mini-actions')) return

  if (touchLike) {
    collapsed.value = !collapsed.value
    return
  }

  if (collapsed.value) {
    collapsed.value = false
    return
  }

  // 桌面：展开状态下点条子进播放器页
  router.push('/music')
}

function handleEnter() {
  if (!touchLike) collapsed.value = false
}

function handleLeave() {
  if (!touchLike) collapsed.value = true
}

/** 触屏：滑页面或点条子以外的地方，都当成「不看了」 */
function handleOutside(event) {
  if (!touchLike || collapsed.value) return
  if (event.target?.closest?.('.mini')) return
  collapsed.value = true
}

function handleScroll() {
  if (touchLike && !collapsed.value) collapsed.value = true
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutside, true)
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleOutside, true)
  window.removeEventListener('scroll', handleScroll)
})

// 每次重新出现都回到收起态
watch(visible, (value) => {
  if (value) collapsed.value = true
})
</script>

<template>
  <div
    v-if="visible"
    class="mini glass"
    :class="{ 'is-playing': isPlaying, 'is-collapsed': collapsed }"
    :title="collapsed ? `正在播放：${title}` : '打开播放器'"
    @click="handleClick"
    @pointerenter="handleEnter"
    @pointerleave="handleLeave"
  >
      <span class="mini-cover">
        <img v-if="cover" :src="cover" alt="" />
        <i v-else class="bi bi-music-note-beamed" aria-hidden="true"></i>
      </span>

      <span class="mini-meta">
        <strong>{{ title }}</strong>
        <Transition name="mini-sub" mode="out-in">
          <span :key="subline" class="mini-sub">{{ subline }}</span>
        </Transition>
      </span>

      <div class="mini-actions">
        <button type="button" :title="isPlaying ? '暂停' : '播放'" @click="toggle">
          <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
        </button>
        <button type="button" title="下一首" @click="next">
          <i class="bi bi-skip-forward-fill" aria-hidden="true"></i>
        </button>
      </div>

      <span class="mini-bar" aria-hidden="true">
        <span :style="{ width: `${percent}%` }"></span>
      </span>
    </div>
</template>

<style scoped>
.mini {
  position: fixed;
  right: 1rem;
  /* 压在固定页脚上方，别叠在一起 */
  bottom: calc(var(--footer-height) + 0.75rem);
  z-index: 9996;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: min(310px, calc(100vw - 2rem));
  padding: 0.5rem 0.6rem;
  border-radius: 14px;
  box-shadow: 0 18px 40px -18px rgba(0, 0, 0, 0.75);
  overflow: hidden;
  cursor: pointer;
  transition: width 0.38s cubic-bezier(0.22, 0.61, 0.36, 1), padding 0.38s ease,
    border-radius 0.38s ease;
}

.mini-cover {
  display: grid;
  place-items: center;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.45);
}

.mini-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.mini-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1 1 auto;
  line-height: 1.3;
}

.mini-meta strong {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-strong);
}

.mini-sub {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.5);
}

.mini-sub-enter-active,
.mini-sub-leave-active {
  transition: opacity 0.16s ease;
}

.mini-sub-enter-from,
.mini-sub-leave-to {
  opacity: 0;
}

.mini-actions {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  flex: 0 0 auto;
}

.mini-actions button {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: rgba(255, 255, 255, 0.62);
  font-size: 1rem;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}

.mini-actions button:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

/* 贴着底边的细进度条 */
.mini-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.12);
}

.mini-bar > span {
  display: block;
  height: 100%;
  background: rgba(255, 255, 255, 0.75);
  transition: width 0.12s linear;
}

.mini-player-enter-active,
.mini-player-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.mini-player-enter-from,
.mini-player-leave-to {
  opacity: 0;
  transform: translateY(140%);
}

/* 出现时从下面升上来；收起/展开只改宽度，不动位移 */
.mini {
  animation: mini-in 0.32s cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

@keyframes mini-in {
  from {
    opacity: 0;
    transform: translateY(140%);
  }
}

/* ---------- 收起态 ---------- */
/* 收成贴在右边的小方块，只留封面，彻底不占排版也不吃点击 */
.mini.is-collapsed {
  width: 52px;
  padding: 8px;
  border-radius: 16px;
}

.mini.is-collapsed .mini-meta,
.mini.is-collapsed .mini-actions {
  display: none;
}

/* 收起时给封面一点呼吸感，提示这里在放歌 */
.mini.is-collapsed.is-playing .mini-cover {
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.22);
  animation: mini-breathe 3.2s ease-in-out infinite;
}

@keyframes mini-breathe {
  0%,
  100% {
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18), 0 0 0 0 rgba(255, 255, 255, 0.18);
  }
  50% {
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.28), 0 0 0 6px rgba(255, 255, 255, 0.06);
  }
}

/* 窄窗口：跟桌面一样靠右停靠、同样宽度，不铺满整屏 */
@media (max-width: 560px) {
  .mini {
    right: 0.75rem;
    width: min(310px, calc(100vw - 1.5rem));
  }

  .mini.is-collapsed {
    width: 52px;
  }
}
</style>
