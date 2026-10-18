<script setup>
/**
 * 任意 HTML 片段，直接渲染。
 * 内容来自你自己的 home.config.json，不走用户输入，所以 v-html 可以接受。
 */
defineProps({
  html: { type: String, default: '' },
})
</script>

<template>
  <div v-if="html" class="custom-html glass" v-html="html"></div>
</template>

<style scoped>
.custom-html {
  padding: 1rem 1.2rem;
  color: var(--text);
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.custom-html :deep(a) {
  color: var(--accent);
}

.custom-html :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>
