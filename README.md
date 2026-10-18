# home

Vue 3 重写的个人主页 —— [Vue 3](https://vuejs.org) + [Vite](https://vite.dev) + Vue Router，纯静态，可直接跑在 GitHub Pages 上。

内容包括：个人主页、网址导航、音乐播放器、错误页（403 / 404 / 502）。
所有文案、链接、背景图都集中在 **`home.config.json`**，改配置不用碰组件。

## Demo

- [主页](https://www.moguq.top)

## 功能

**主页**
- 头像、问候语、简介、技能图标条
- 社交入口（hover 显示名称）
- 一言（Hitokoto）、时钟，可单独开关
- RSS 订阅：解析 RSS 2.0 / Atom，展示最新 4 条（代理失败时直连解析，localStorage 缓存 30 分钟）
- 自定义 HTML 模块
- 快捷链接网格

**网址集（`/web`）**
- 按 `category` 分组，卡片带图标、名称、描述
- 站内链接走前端路由（不刷新），站外链接新标签打开

**音乐播放器（`/music`）**
- 歌单接口拉取，失败自动回退到备用曲目
- 封面自动替换头像，播放时像唱片一样旋转，暂停即停
- 歌词逐行高亮；单行放不下时不折行，按行内播放进度横向推进、两端渐隐
- 进度拖动、音量调节
- 键盘：`←` `→` 快退快进、`↑` `↓` 音量、`空格` 播放暂停
- 双击头像打开调试面板，按序号切歌

**其它**
- 首屏加载动画、页面切换淡入
- 背景图多张随机、遮罩透明度可调
- 构建时自动生成 `sitemap.xml` / `robots.txt`
- 响应式：≤1024px 上下堆叠，左栏固定 360px 宽

## 快速开始

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # 产物在 dist/
npm run preview  # 预览构建结果
```

Node 需要 20.19+ 或 22.12+。

## 目录结构

```
home.config.json           # 站点配置（改这个）
index.html                 # Vite 入口
vite.config.js
build/plugins/
  seo.js                   # title/description/canonical + sitemap + robots
  pages-fallback.js        # 404.html 与各页面静态壳（GitHub Pages 用）
public/
  favicon.ico
  .nojekyll
src/
  main.js
  App.vue                  # 加载动画 + 导航 + 路由出口 + 页脚
  config/
    index.js               # 合并默认值、归一化、写入 CSS 变量
    defaults.js            # 默认配置
  router/
    index.js               # 路由 + 标题 + canonical
    pages.js               # 页面清单（路由与 sitemap 共用）
  views/                   # Home / Web / Music / Error
  components/              # NavBar、QuoteCard、ClockCard、RssFeed、各类卡片
  composables/
    useClock.js            # 全站共用一个定时器
    useQuote.js            # 一言缓存
    usePlayer.js           # 播放器状态机
  utils/                   # lrc 解析、时间格式化、站内链接解析
  directives/fitText.js    # v-fit-text：长站名自动缩字号
  styles/global.css        # 变量 + 布局 + 毛玻璃
legacy/                    # 重构前的单文件版本，留作对照，可删
```

## 配置说明

全部写在 `home.config.json`，没写的字段走 `src/config/defaults.js` 的默认值。

| 字段 | 说明 |
|:---|:---|
| `site.name` | 站点名，用于标题、页脚 |
| `site.url` | 站点地址，**生成 sitemap 必需**，不填则跳过 |
| `site.description` / `site.keywords` | SEO 描述与关键词 |
| `site.footerSince` / `site.footerLink` | 页脚起始年份与作者链接 |
| `background.images` | 背景图，字符串或数组（多张每次刷新随机） |
| `background.mask` | 黑色遮罩透明度 0~1 |
| `profile.avatar` | 头像 URL |
| `profile.greeting` / `profile.name` | 「Hi!👋 I am」+ 主题色高亮的名字 |
| `profile.subtitle` | 名字下面的身份行 |
| `profile.highlights` | 技能关键词，`{ icon, text }`，icon 用 bootstrap-icons 名字 |
| `profile.skillsImage` | 技能图标条图片 |
| `socials` | 左侧社交图标，`{ name, icon, url }` |
| `homeSites` | 主页快捷链接，`{ name, icon, url }` |
| `webSites` | 网址集，`{ name, icon, desc, category, url }` |
| `modules.hitokoto` / `modules.clock` | 一言 / 时钟开关 |
| `modules.rss` | `{ enabled, url, limit }` |
| `modules.customHtml` | `{ enabled, html }` |
| `nav.enabled` | 顶部悬浮导航开关 |
| `music.api` / `music.fallback` | 歌单接口与兜底曲目 |

**站内链接**直接写 `/music`、`/web`，会自动补上部署子路径；`https://`、`mailto:` 原样使用。

```json
{
  "name": "音乐",
  "icon": "music-player-fill",
  "desc": "站内播放器",
  "category": "站点",
  "url": "/music"
}
```

图标名去 [bootstrap-icons](https://icons.getbootstrap.com/) 查，不带 `bi-` 前缀。

## 新增页面

1. 在 `src/router/pages.js` 加一条（`name / path / title / icon / changefreq / priority`）；
2. 在 `src/router/index.js` 的 `views` 里映射到组件。

`sitemap.xml`、顶部导航、静态壳页面都会自动跟上，不用另外改。

## 部署到 GitHub Pages

仓库已带 `.github/workflows/deploy.yml`，推到 `main` 就在 Actions 里构建发布。

**先在仓库 Settings → Pages 里把 Source 选成「GitHub Actions」。**

`base`（资源前缀）由工作流按顺序判断：

1. 仓库 Variables 里的 `VITE_BASE`（最高优先级）
2. 存在 `public/CNAME`，或 Pages 已绑定自定义域名 → `/`
3. 其他情况按项目页 → `/<repo>/`

`public/CNAME` 里写的是 `www.moguq.top`，所以本站按域名根路径 `/` 构建。
**换成自己的域名时改这个文件**；用项目页就把它删掉，工作流会自动走 `/<repo>/`。

构建后还会校验 `dist/index.html` 里的资源前缀是否和 `VITE_BASE` 一致，不一致直接让构建失败，避免再发一个资源全 404 的站点。

本地手动构建：

```bash
npm run build                    # base 默认 '/'
VITE_BASE=/home/ npm run build   # 项目页
```

> Windows 的 Git Bash 会把 `VITE_BASE=/` 当成路径转成 Git 安装目录，手动构建时加 `MSYS_NO_PATHCONV=1`，或改用 Windows 自带的终端。

### sitemap

构建产物里会有：

- `sitemap.xml`：`site.url` + `src/router/pages.js` 里的页面，带 `lastmod` / `changefreq` / `priority`
- `robots.txt`：放开抓取并指向 sitemap

上线后到搜索引擎站长平台提交 `https://你的域名/sitemap.xml` 即可。

## 从旧版迁移

重构前的 6 个单文件页面在 `legacy/`，只作对照，不参与构建，确认没问题后可以删掉。

## 灵感与致谢

- [imsyy - home](https://github.com/imsyy/home)
- 背景图：次元 API ｜ 一言：[Hitokoto](https://hitokoto.cn/)

我的另一个相关项目

- [Komari-Home](https://github.com/mogumc/Komari-Home)

## License

[MIT](./LICENSE)
