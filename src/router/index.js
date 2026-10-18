import { createRouter, createWebHistory } from 'vue-router'
import { config } from '../config'
import { PAGES } from './pages'
import ErrorView from '../views/ErrorView.vue'
import HomeView from '../views/HomeView.vue'
import WebView from '../views/WebView.vue'
import MusicView from '../views/MusicView.vue'

// 页面就三个，直接同步引入：切路由不用等 chunk，过渡才不会中间空一屏
const views = {
  home: HomeView,
  web: WebView,
  music: MusicView,
}

const pageRoutes = PAGES.map((page) => ({
  path: page.path,
  name: page.name,
  component: views[page.name],
  meta: { title: `${config.site.name} - ${page.title}` },
}))

const errorRoutes = [
  {
    path: '/403',
    name: 'forbidden',
    component: ErrorView,
    props: { code: 403, title: 'Forbidden', message: '你不该这样做...' },
    meta: { title: `${config.site.name} - 403` },
  },
  {
    path: '/502',
    name: 'bad-gateway',
    component: ErrorView,
    props: { code: 502, title: 'BadGateway', message: '我们遇到了点问题！暂时的！' },
    meta: { title: `${config.site.name} - 502` },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: ErrorView,
    props: { code: 404, title: 'NotFound', message: '页面飞往了外星！' },
    meta: { title: `${config.site.name} - 404` },
  },
]

/**
 * GitHub Pages 是静态托管，history 路由靠构建时生成的 404.html 兜底
 * （见 build/plugins/seo.js），这样链接不带 # 也能写进 sitemap。
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...pageRoutes, ...errorRoutes],
  scrollBehavior: () => ({ top: 0 }),
})

function setCanonical(path) {
  if (!config.site.url) return
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = `${config.site.url}${path === '/' ? '/' : path}`
}

router.afterEach((to) => {
  document.title = to.meta.title || config.site.name
  setCanonical(to.path)
})

export default router
