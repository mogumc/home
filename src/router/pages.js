/**
 * 页面清单 —— 路由和 sitemap 共用这一份，避免两边对不上。
 * icon 用 bootstrap-icons 的名字（不带 bi- 前缀）。
 * sitemap 里会跳过 hidden: true 的页面。
 */
export const PAGES = [
  {
    name: 'home',
    path: '/',
    title: '个人主页',
    icon: 'house-door-fill',
    changefreq: 'weekly',
    priority: 1,
  },
  {
    name: 'web',
    path: '/web',
    title: '网址集',
    icon: 'grid-fill',
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    name: 'music',
    path: '/music',
    title: '音乐播放器',
    icon: 'music-note-beamed',
    changefreq: 'monthly',
    priority: 0.5,
  },
]
