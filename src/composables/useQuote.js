import { ref } from 'vue'

/**
 * 一言：全站共用一份缓存，切换页面不会重复请求
 */
const text = ref('加载中...')
const author = ref('')
const loading = ref(true)

let started = false

async function load() {
  if (started) return
  started = true

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch('https://v1.hitokoto.cn/', { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    text.value = data.hitokoto || '获取失败'
    author.value = data.from || data.from_who || ''
  } catch {
    text.value = '获取失败'
    author.value = ''
  } finally {
    loading.value = false
  }
}

export function useQuote() {
  load()
  return { text, author, loading }
}
