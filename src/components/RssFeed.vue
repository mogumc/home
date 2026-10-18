<script setup>
import { onMounted, ref, watch } from 'vue'

const props = defineProps({
  url: { type: String, default: '' },
  limit: { type: Number, default: 4 },
})

const CACHE_PREFIX = 'home:rss:'
const CACHE_TTL = 30 * 60 * 1000

const items = ref([])
const feedTitle = ref('')

let requestId = 0

function readCache(url) {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${url}`)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (!entry?.items?.length) return null
    if (Date.now() - (entry.ts || 0) > CACHE_TTL) return null
    return entry
  } catch {
    return null
  }
}

function writeCache(url, title, list) {
  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${url}`,
      JSON.stringify({ title, items: list, ts: Date.now() }),
    )
  } catch {
    // localStorage 满了或不可用，忽略
  }
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}/${m}/${d}`
}

/** 先把跨域丢给公共代理 */
async function viaProxy(url) {
  const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error(`proxy HTTP ${res.status}`)
  const data = await res.json()
  if (data.status !== 'ok' || !Array.isArray(data.items)) throw new Error(data.message || 'bad payload')
  return { title: data.feed?.title || '', items: data.items }
}

/** 代理挂了就直接拉 XML 自己解，兼容 RSS 2.0 / Atom */
async function viaDirect(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`feed HTTP ${res.status}`)

  const doc = new DOMParser().parseFromString(await res.text(), 'text/xml')

  const channel = doc.querySelector('channel')
  if (channel) {
    return {
      title: channel.querySelector('title')?.textContent || '',
      items: [...channel.querySelectorAll('item')].map((el) => ({
        title: el.querySelector('title')?.textContent?.trim() || '',
        link: el.querySelector('link')?.textContent?.trim() || '',
        pubDate: el.querySelector('pubDate')?.textContent || '',
      })),
    }
  }

  const feed = doc.querySelector('feed')
  if (feed) {
    return {
      title: feed.querySelector('title')?.textContent || '',
      items: [...feed.querySelectorAll('entry')].map((el) => ({
        title: el.querySelector('title')?.textContent?.trim() || '',
        link: el.querySelector('link')?.getAttribute('href') || '',
        pubDate:
          el.querySelector('updated')?.textContent || el.querySelector('published')?.textContent || '',
      })),
    }
  }

  throw new Error('unsupported feed format')
}

async function load(url) {
  if (!url) return

  const token = ++requestId

  const cached = readCache(url)
  if (cached) {
    feedTitle.value = cached.title
    items.value = cached.items.slice(0, props.limit)
    return
  }

  try {
    let data
    try {
      data = await viaProxy(url)
    } catch {
      data = await viaDirect(url)
    }
    if (token !== requestId) return

    feedTitle.value = data.title
    items.value = data.items
      .filter((item) => item.title && item.link)
      .slice(0, props.limit)
    writeCache(url, feedTitle.value, items.value)
  } catch (err) {
    // 拿不到就整块不渲染，别在首页挂个报错
    console.warn('[rss] 订阅加载失败：', err)
    if (token === requestId) items.value = []
  }
}

onMounted(() => load(props.url))
watch(
  () => props.url,
  (url) => load(url),
)
</script>

<template>
  <section v-if="items.length" class="rss glass">
    <h3 class="rss-title">
      <i class="bi bi-rss-fill" aria-hidden="true"></i>
      {{ feedTitle || '最新文章' }}
    </h3>
    <div class="rss-items">
      <a
        v-for="item in items"
        :key="item.link"
        class="rss-item"
        :href="item.link"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span class="rss-item-title">{{ item.title }}</span>
        <time v-if="item.pubDate" class="rss-item-time">{{ formatDate(item.pubDate) }}</time>
      </a>
    </div>
  </section>
</template>

<style scoped>
.rss {
  padding: 1rem 1.2rem;
}

.rss-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 0.6rem;
  color: var(--text-strong);
  font-size: 1rem;
}

.rss-items {
  display: flex;
  flex-direction: column;
}

.rss-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.45rem 0;
  color: rgba(255, 255, 255, 0.72);
  text-decoration: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  transition: color 0.2s ease;
}

.rss-item:last-child {
  border-bottom: none;
}

.rss-item:hover {
  color: #fff;
}

.rss-item-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 0.9rem;
}

.rss-item-time {
  flex-shrink: 0;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.4);
}
</style>
