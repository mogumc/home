<script setup>
import { computed } from 'vue'
import { config } from '../config'

defineProps({
  /** 停在首屏时收起页脚，别压在名字屏上 */
  hidden: { type: Boolean, default: false },
})

const year = new Date().getFullYear()
const showRange = computed(() => year > config.site.footerSince)
const author = computed(() => config.site.name)
</script>

<template>
  <footer class="fixed-blur-footer" :class="{ 'is-hidden': hidden }">
    <span>
      Copyright&nbsp;©&nbsp;{{ config.site.footerSince }}<template v-if="showRange">-{{ year }}</template>
      <a v-if="config.site.footerLink" :href="config.site.footerLink" target="_blank" rel="noopener noreferrer">
        {{ author }}
      </a>
      <template v-else>{{ author }}</template>
    </span>
  </footer>
</template>
