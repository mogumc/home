<script setup>
import { RouterLink, useRoute } from 'vue-router'
import { config } from '../config'
import { PAGES } from '../router/pages'

const route = useRoute()
</script>

<template>
  <nav v-if="config.nav.enabled" class="navbar" aria-label="主导航">
    <RouterLink
      v-for="page in PAGES"
      :key="page.name"
      :to="page.path"
      class="nav-item"
      :class="{ 'is-active': route.name === page.name }"
    >
      <i class="bi" :class="`bi-${page.icon}`" aria-hidden="true"></i>
      <span class="nav-label">{{ page.title }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  top: 0.9rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9997;
  display: flex;
  gap: 0.25rem;
  padding: 0.35rem;
  border-radius: 999px;
  background: rgba(20, 20, 20, 0.35);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
  white-space: nowrap;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.9rem;
  text-decoration: none;
  transition: color 0.2s ease, background 0.2s ease;
}

.nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.nav-item.is-active {
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
}

.nav-item i {
  font-size: 0.95rem;
}

@media (max-width: 480px) {
  .navbar {
    top: 0.6rem;
  }

  .nav-label {
    display: none;
  }

  .nav-item {
    padding: 0.45rem 0.7rem;
    font-size: 1rem;
  }
}
</style>
