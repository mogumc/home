<script setup>
defineProps({
  fading: { type: Boolean, default: false },
})
</script>

<template>
  <div class="loading-screen" :class="{ 'is-fading': fading }" role="status" aria-live="polite">
    正在加载...
  </div>
</template>
