<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Typed from 'typed.js'
import { config } from '../config'

const props = defineProps({
  /** 0 = 完整首屏；1 = 已经完全滚出视口 */
  progress: { type: Number, default: 0 },
})

const emit = defineEmits(['enter'])

/** 关了系统动画的机器上只保留淡出，不做视差位移 */
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** 首屏内容比页面滚得稍快一点：离开时有纵深，到 83% 就彻底透明 */
const motionStyle = computed(() => {
  const p = Math.min(1, Math.max(0, props.progress))
  return {
    opacity: Math.max(0, 1 - p * 1.2),
    transform: reduceMotion ? 'none' : `translate3d(0, ${(-p * 72).toFixed(1)}px, 0)`,
  }
})

/* ---------- 打字机 ---------- */
const typedEl = ref(null)
let typed = null

onMounted(() => {
  if (!typedEl.value || !config.hero.greetings.length) return
  typed = new Typed(typedEl.value, {
    strings: config.hero.greetings,
    typeSpeed: 58,
    backSpeed: 26,
    backDelay: 2200,
    startDelay: 700,
    loop: true,
    // 整句擦掉再打下一句，长短不一的两句话接得更自然
    smartBackspace: false,
    cursorChar: '|',
  })
})

onUnmounted(() => typed?.destroy())
</script>

<template>
  <section class="hero">
    <div class="hero-inner" :style="motionStyle">
      <h1 v-fit-text="{ minScale: 0.45 }" class="hero-title">{{ config.hero.title }}</h1>

      <p class="hero-greeting">
        <span ref="typedEl" class="typed"></span>
      </p>

      <button class="hero-start" type="button" @click="emit('enter')">
        {{ config.hero.hint }}
      </button>
    </div>

    <button class="hero-arrow" type="button" aria-label="进入主页" @click="emit('enter')">
      <i class="bi bi-chevron-double-down" aria-hidden="true"></i>
    </button>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 一屏高：内容区正好从下一屏开始，滚过去就是一页完整的首页 */
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  padding: 0 1.25rem;
}

.hero-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(92vw, 1100px);
  min-width: 0;
  will-change: transform, opacity;
}

.hero-title {
  margin: 0;
  /* 宽度吃满容器，v-fit-text 才有参照物可量（否则元素会被文字撑到溢出） */
  width: 100%;
  text-align: center;
  overflow: hidden;
  white-space: nowrap;
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 8.6vw, 6.6rem);
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.1;
  color: var(--text-strong);
  text-shadow: 0 4px 24px rgba(0, 0, 0, 0.45);
  animation: hero-rise 0.9s cubic-bezier(0.22, 0.61, 0.36, 1) 0.05s both;
}

/* 打字机这一行：书写体，和上面的几何无衬线搭一软一硬 */
.hero-greeting {
  min-height: 2.1em;
  margin: 1.35rem 0 0;
  padding: 0 0.2rem;
  font-family: var(--font-script);
  font-size: clamp(1.05rem, 2vw, 1.5rem);
  font-weight: 500;
  font-style: italic;
  line-height: 1.5;
  letter-spacing: 0.01em;
  text-align: center;
  color: rgba(255, 255, 255, 0.84);
  text-wrap: balance;
  animation: hero-rise 0.9s cubic-bezier(0.22, 0.61, 0.36, 1) 0.22s both;
}

/* typed.js 自己插进来的光标 */
.hero-greeting :deep(.typed-cursor) {
  color: rgba(255, 255, 255, 0.55);
  font-weight: 300;
  animation: hero-caret 1.1s step-end infinite;
}

.hero-start {
  margin-top: 3.2rem;
  padding: 0.55rem 1.35rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.5);
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 300;
  letter-spacing: 0.34em;
  cursor: pointer;
  animation: hero-rise 0.9s cubic-bezier(0.22, 0.61, 0.36, 1) 0.4s both,
    hero-pulse 3.2s ease-in-out 1.4s infinite;
  transition: color 0.25s ease, border-color 0.25s ease, background 0.25s ease;
}

.hero-start:hover,
.hero-start:focus-visible {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.06);
  outline: none;
}

.hero-arrow {
  position: absolute;
  left: 50%;
  bottom: 2.2rem;
  transform: translateX(-50%);
  padding: 0.4rem;
  border: 0;
  background: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  animation: hero-arrow-in 0.9s ease 0.55s both, hero-bob 2.4s ease-in-out 1.6s infinite;
  transition: color 0.25s ease;
}

.hero-arrow:hover,
.hero-arrow:focus-visible {
  color: #fff;
  outline: none;
}

@keyframes hero-rise {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes hero-caret {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

@keyframes hero-arrow-in {
  from {
    opacity: 0;
    transform: translate(-50%, 16px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@keyframes hero-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

@keyframes hero-bob {
  0%,
  100% {
    transform: translate(-50%, 0);
    opacity: 0.45;
  }
  50% {
    transform: translate(-50%, 9px);
    opacity: 0.9;
  }
}
</style>
