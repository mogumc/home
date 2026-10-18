<script setup>
import { config } from '../config'
</script>

<template>
  <div v-if="config.socials.length" class="socials-container">
    <a
      v-for="item in config.socials"
      :key="item.name"
      class="social-block glass"
      :href="item.url"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="item.name"
    >
      <i class="bi" :class="`bi-${item.icon}`" aria-hidden="true"></i>
      <span class="social-title">{{ item.name }}</span>
    </a>
  </div>
</template>

<style scoped>
.social-block {
  text-decoration: none;
}
</style>
