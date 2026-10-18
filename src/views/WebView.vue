<script setup>
import { computed } from 'vue'
import { config } from '../config'
import WebSiteCard from '../components/WebSiteCard.vue'

const DEFAULT_CATEGORY = '常用站点'

/** 按 category 分组，保持配置文件里的顺序 */
const groups = computed(() => {
  const map = new Map()
  for (const site of config.webSites) {
    const key = site.category || DEFAULT_CATEGORY
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(site)
  }
  return [...map].map(([name, sites]) => ({ name, sites }))
})

/** 只有一个默认分组时就不显示分组标题了 */
const showGroupTitle = computed(
  () => groups.value.length > 1 || groups.value[0]?.name !== DEFAULT_CATEGORY,
)
</script>

<template>
  <div class="container column">
    <h1 class="page-header">{{ config.site.name }}的网址集</h1>

    <p v-if="!config.webSites.length" class="empty-hint">
      还没有配置站点，在 home.config.json 的 webSites 里加就行。
    </p>

    <section v-for="group in groups" :key="group.name" class="group">
      <h2 v-if="showGroupTitle" class="group-title">{{ group.name }}</h2>
      <div class="card-grid">
        <WebSiteCard v-for="site in group.sites" :key="site.url" :site="site" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.column {
  flex-direction: column;
  /* 必须 nowrap：column + wrap 时浏览器会把每个分组拉伸填满整列高度 */
  flex-wrap: nowrap;
  align-items: stretch;
  /* 列表页从顶部排，不要垂直居中留一大片空 */
  margin: 0 auto;
  gap: 1.5rem;
}

.page-header {
  margin: 0;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.group-title {
  margin: 0;
  padding-left: 0.2rem;
  font-size: 0.95rem;
  font-weight: normal;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.55);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 1rem;
}

.empty-hint {
  margin: 0;
  padding: 2rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.45);
}

@media (max-width: 480px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
