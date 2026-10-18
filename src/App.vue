<script setup>
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import AppFooter from './components/AppFooter.vue'
import LoadingScreen from './components/LoadingScreen.vue'
import NavBar from './components/NavBar.vue'
import { backgroundUrl } from './config'

const showLoading = ref(true)
const fading = ref(false)
const backgroundReady = ref(false)

/** 首屏至少显示 400ms，避免一闪而过；等 window.load 再收 */
onMounted(() => {
  const MIN_DURATION = 400
  const mountedAt = performance.now()

  const hide = () => {
    const wait = Math.max(0, MIN_DURATION - (performance.now() - mountedAt))
    setTimeout(() => {
      fading.value = true
      setTimeout(() => {
        showLoading.value = false
      }, 400)
    }, wait)
  }

  if (document.readyState === 'complete') hide()
  else window.addEventListener('load', hide, { once: true })
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

  <LoadingScreen v-if="showLoading" :fading="fading" />

  <NavBar />

  <RouterView v-slot="{ Component, route }">
    <Transition name="page">
      <component :is="Component" :key="route.path" />
    </Transition>
  </RouterView>

  <AppFooter />
</template>
