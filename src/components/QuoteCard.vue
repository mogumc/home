<script setup>
import { useQuote } from '../composables/useQuote'

const { text, author } = useQuote()
</script>

<template>
  <div class="module glass">
    <h3><i class="bi bi-balloon-heart-fill" aria-hidden="true"></i> 一言</h3>
    <p class="quote">{{ text }}</p>
    <p class="quote-source">--- {{ author || '未知' }}</p>
  </div>
</template>

<style scoped>
.quote {
  margin: 0;
  font-size: 1.1rem;
  font-style: italic;
  color: #ddd;
  word-break: break-word;
}

.quote-source {
  margin: 5px 0 0;
  font-size: 0.9rem;
  color: #aaa;
  text-align: right;
}
</style>
