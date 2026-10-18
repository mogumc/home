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
    class="site-block glass"
    :href="external ? href : undefined"
    :to="external ? undefined : site.url"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
    :title="site.name"
  >
    <i class="bi" :class="`bi-${site.icon}`" aria-hidden="true"></i>
    <span v-fit-text="{ minScale: 0.7 }" class="site-title">{{ site.name }}</span>
  </component>
</template>

<style scoped>
.site-title {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}
</style>
