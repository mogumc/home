<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { isInternal, resolveUrl } from '../utils/url'

const props = defineProps({
  site: { type: Object, required: true },
})

const external = computed(() => !isInternal(props.site.url))
const href = computed(() => resolveUrl(props.site.url))
</script>

<template>
  <component
    :is="external ? 'a' : RouterLink"
    class="nav-card glass"
    :href="external ? href : undefined"
    :to="external ? undefined : site.url"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
  >
    <span class="card-icon">
      <i class="bi" :class="`bi-${site.icon}`" aria-hidden="true"></i>
    </span>
    <span class="card-body">
      <span v-fit-text="{ minScale: 0.65 }" class="card-name">{{ site.name }}</span>
      <span v-if="site.desc" class="card-desc">{{ site.desc }}</span>
    </span>
  </component>
</template>

<style scoped>
.nav-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
  padding: 1.1rem;
  color: var(--text);
  text-decoration: none;
  transition: background 0.25s ease, transform 0.25s ease;
}

.nav-card:hover {
  background: var(--glass-bg-hover);
  transform: translateY(-3px);
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 1.4rem;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.card-name {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  color: var(--text-strong);
  font-size: 1.05rem;
  font-weight: bold;
}

.card-desc {
  font-size: 0.82rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.5);
  overflow-wrap: anywhere;
}
</style>
