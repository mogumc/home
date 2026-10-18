<script setup>
import { config } from '../config'
import SiteCard from './SiteCard.vue'
</script>

<template>
  <div class="sites-container">
    <SiteCard v-for="site in config.homeSites" :key="site.name" :site="site" />
  </div>
</template>
