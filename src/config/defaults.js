/**
 * 默认配置：home.config.json 里没写的字段全部走这里的值，
 * 所以配置文件可以只写你自己关心的几项。
 */
export const defaultConfig = {
  site: {
    name: 'MoGuQAQ',
    url: '',
    description: '',
    keywords: '',
    lang: 'zh-CN',
    footerSince: new Date().getFullYear(),
    footerLink: '',
  },

  background: {
    /** 一张图写字符串，多张写数组（每次刷新随机取一张） */
    images: [],
    /** 黑色遮罩透明度 0~1，越大文字越清晰 */
    mask: 0.6,
  },

  profile: {
    avatar: '',
    /** 头像下方那行打字机图片，留空则不显示 */
    badge: '',
    /** 问候语前缀，名字会用主题色高亮 */
    greeting: '',
    name: '',
    subtitle: '',
    /** 技能关键词，icon 用 bootstrap-icons 的名字 */
    highlights: [],
    /** 技能图标条（SVG/PNG 都行），留空则不显示 */
    skillsImage: '',
    /** 兜底的纯文本行 */
    lines: [],
  },

  socials: [],
  homeSites: [],
  webSites: [],

  modules: {
    hitokoto: true,
    clock: true,
    rss: { enabled: false, url: '', limit: 4 },
    customHtml: { enabled: false, html: '' },
  },

  nav: {
    enabled: true,
  },

  music: {
    api: '',
    fallback: [],
  },
}
