<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  code: { type: [Number, String], default: 404 },
  title: { type: String, default: 'NotFound' },
  message: { type: String, default: '页面飞往了外星！' },
})
</script>

<template>
  <div class="error-page">
    <div class="error-code">{{ code }} - {{ title }}</div>
    <p class="error-message">{{ message }}</p>
    <RouterLink class="error-home" to="/">返回首页</RouterLink>
  </div>
</template>

<style scoped>
.error-page {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  text-align: center;
  background: #111;
  color: #fff;
}

.error-code {
  font-size: 2.5rem;
  font-weight: bold;
}

.error-message {
  margin: 1rem 0 0;
  font-size: 1.5rem;
  font-weight: normal;
  opacity: 0.8;
}

.error-home {
  margin-top: 1.5rem;
  padding: 0.55rem 1.4rem;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 999px;
  color: #fff;
  font-size: 0.9rem;
  text-decoration: none;
  transition: background 0.2s ease;
}

.error-home:hover {
  background: rgba(255, 255, 255, 0.12);
}
</style>
