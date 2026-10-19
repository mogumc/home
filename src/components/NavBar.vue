<script setup>
import { nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { config } from '../config'
import { PAGES } from '../router/pages'

const route = useRoute()
const navRef = ref(null)
const linkRefs = ref([])

defineProps({
  /** 停在首屏时收起：名字屏要干净，进内容再淡入 */
  hidden: { type: Boolean, default: false },
})

/** 高亮块的位置和宽度：切换页面时让它滑过去，而不是闪一下 */
const pill = reactive({ left: 0, width: 0, ready: false })

function updatePill() {
  const index = PAGES.findIndex((page) => page.name === route.name)
  const el = linkRefs.value[index]?.$el
  if (!el) return
  pill.left = el.offsetLeft
  pill.width = el.offsetWidth
  pill.ready = true
}

watch(() => route.name, () => nextTick(updatePill))

let observer = null

onMounted(() => {
  nextTick(updatePill)
  // 字体、图标加载完宽度会变，直接盯容器尺寸比自己算靠谱
  observer = new ResizeObserver(updatePill)
  if (navRef.value) observer.observe(navRef.value)
  document.fonts?.ready.then(updatePill)
})

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <nav
    v-if="config.nav.enabled"
    ref="navRef"
    class="navbar"
    :class="{ 'is-hidden': hidden }"
    :inert="hidden"
    aria-label="主导航"
  >
    <span
      class="nav-pill"
      aria-hidden="true"
      :style="{
        transform: `translateX(${pill.left}px)`,
        width: `${pill.width}px`,
        opacity: pill.ready ? 1 : 0,
      }"
    ></span>

    <RouterLink
      v-for="page in PAGES"
      :key="page.name"
      ref="linkRefs"
      :to="page.path"
      class="nav-item"
      :class="{ 'is-active': route.name === page.name }"
    >
      <i class="bi" :class="`bi-${page.icon}`" aria-hidden="true"></i>
      <span class="nav-label">{{ page.title }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  top: 0.9rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9997;
  display: flex;
  gap: 0.25rem;
  padding: 0.35rem;
  border-radius: 999px;
  background: rgba(20, 20, 20, 0.35);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
  white-space: nowrap;
  transition: opacity 0.42s ease, transform 0.42s cubic-bezier(0.22, 0.61, 0.36, 1);
}

/* 首屏：菜单整体淡出并往上缩，别在名字屏上挂着 */
.navbar.is-hidden {
  opacity: 0;
  transform: translate(-50%, -140%);
  pointer-events: none;
}

/* 选中态背景是一块整体滑动的底，位置由 JS 量出来 */
.nav-pill {
  position: absolute;
  top: 0.35rem;
  bottom: 0.35rem;
  left: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  pointer-events: none;
  transition: transform 0.42s cubic-bezier(0.22, 0.61, 0.36, 1),
    width 0.42s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.2s ease;
}

.nav-item {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.9rem;
  text-decoration: none;
  transition: color 0.25s ease;
}

.nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.07);
}

.nav-item.is-active {
  color: #fff;
}

.nav-item i {
  font-size: 0.95rem;
}

@media (max-width: 480px) {
  .navbar {
    top: 0.6rem;
  }

  .nav-label {
    display: none;
  }

  .nav-item {
    padding: 0.45rem 0.7rem;
    font-size: 1rem;
  }
}
</style>
