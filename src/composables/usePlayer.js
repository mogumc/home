import { computed, nextTick, ref, watch } from 'vue'
import { config } from '../config'
import { clamp, formatTime } from '../utils/format'
import { buildLyricView, parseLrc } from '../utils/lrc'

/** 单曲最多重试几次，超过就跳下一首（对齐 music.html 的 3 次） */
const MAX_SONG_RETRY = 3
/** 连续几首都彻底失败，就重新拉一次歌单（音频地址是临时签名，会过期） */
const MAX_CONSECUTIVE_FAIL = 3
/** 两次「重新拉歌单」的最小间隔，防止来回打接口 */
const RESCUE_COOLDOWN = 20_000
/** 想播却一直没动静，多久算卡死 */
const STALL_TIMEOUT = 8_000
/** 健康巡检间隔 */
const HEALTH_INTERVAL = 3_000
/** 换源防抖：连点切歌只保留最后一首，避免一直 abort 请求把元素搞坏 */
const SOURCE_DEBOUNCE = 120

function normalizeSong(song = {}) {
  return {
    title: song.title || song.name || '',
    author: song.author || song.artist || '',
    url: (song.url || '').trim(),
    lrc: song.lrc || '',
    cover: song.cover || song.pic || '',
  }
}

/**
 * 音乐播放器的状态机：歌单、歌词、进度、音量、键盘控制
 *
 * 换歌靠「重建 <audio> 元素 + autoplay」：
 * 元素一旦停在 ended / error / 断流状态，改 src 未必能拉回来，
 * 新建一个带 autoplay 的元素则一定是干净状态，播不播交给浏览器，
 * 不依赖 isPlaying 这个可能和元素真实状态对不上的影子值。
 *
 * 这里是单例：状态和元素都不挂在页面组件上，<audio> 住在 App 里的
 * <PlayerAudio>，所以切到别的页面音乐不会断。
 */
function createPlayer() {
  const audioRef = ref(null)

  const songs = ref([])
  const currentIndex = ref(0)
  const title = ref('')
  const artist = ref('')
  const cover = ref('')
  const src = ref('')
  /** 换源计数，模板当 key 用，保证每次换歌都是新元素 */
  const loadKey = ref(0)
  /** 新元素要不要带 autoplay：进站默认不播，等用户自己点 */
  const shouldAutoplay = ref(false)
  const lyricLines = ref([])
  /** 一屏能放几句歌词：音乐页量完面板高度后写进来，别写死 */
  const lyricWindow = ref(3)

  const isPlaying = ref(false)
  /** 用户是否主动播过：没播过就别在别的页面挂一条 mini 播放器 */
  const hasPlayed = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  /** 拖动/方向键预览时的临时进度，null 表示跟随真实播放 */
  const seekPreview = ref(null)
  const volume = ref(0.7)
  const notice = ref('')

  const devVisible = ref(false)
  const devInput = ref('')
  const playlistLoading = ref(true)
  /** 键盘快捷键只在音乐页生效：别在别的页面抢空格和方向键 */
  const shortcutsOn = ref(false)

  /** 用户是否希望播放（跨越切歌保留） */
  let wantPlay = false
  /** 组件是否还活着，卸载后异步回调都要停手 */
  let active = false
  let songRetry = 0
  let consecutiveFail = 0
  let lyricToken = 0
  /** 每次换歌自增，异步回调靠它判断「这事是不是已经过期」 */
  let loadSeq = 0
  let advanceTimer = null
  let healthTimer = null
  let sourceTimer = null

  /** 巡检用：想播却没动静的计时与补救次数 */
  let stallFrom = 0
  let stallFixes = 0
  let lastTickTime = -1
  let lastRescueAt = 0
  let rescuing = false

  /** 待生效的换源（防抖用） */
  let pendingSource = null

  const lyricView = computed(() =>
    buildLyricView(lyricLines.value, currentTime.value, lyricWindow.value),
  )

  /**
   * 当前正在唱的那一句，只取第一行（原文）。
   * 同一时间戳往往还有一行翻译，mini 播放器只有一行位置，放原文更合适。
   */
  const currentLyric = computed(() => lyricView.value.find((line) => line.active)?.text || '')

  /** 面板变高变矮时重算能放几句；取奇数，当前行才是正中间 */
  function setLyricWindow(count) {
    const next = Math.max(3, Math.min(15, Math.round(count) || 3))
    const odd = next % 2 === 0 ? next - 1 : next
    if (odd !== lyricWindow.value) lyricWindow.value = odd
  }
  const percent = computed(() => {
    if (!duration.value) return 0
    const base = seekPreview.value ?? currentTime.value
    return clamp((base / duration.value) * 100, 0, 100)
  })
  const currentText = computed(() => formatTime(seekPreview.value ?? currentTime.value))
  const durationText = computed(() => formatTime(duration.value))

  function schedule(fn, delay = 0) {
    if (advanceTimer) clearTimeout(advanceTimer)
    advanceTimer = setTimeout(() => {
      advanceTimer = null
      if (!active) return
      fn()
    }, delay)
  }

  function currentEl() {
    return audioRef.value
  }

  /** 换源：改 key 让 Vue 重建元素，播不播由 wantPlay 决定 */
  function setSource(url) {
    src.value = url
    // 只有「用户想听」时新元素才带 autoplay，否则只加载元数据
    shouldAutoplay.value = wantPlay
    loadKey.value += 1
    const seq = ++loadSeq

    nextTick(() => {
      if (!active || seq !== loadSeq) return
      const el = currentEl()
      if (!el) return
      el.volume = clamp(Number(volume.value) || 0, 0, 1)
      if (wantPlay) play()
    })
  }

  /**
   * 连点切歌时，旧元素会被一次次 abort，浏览器容易把最后那个元素
   * 留在「在播但没数据」的状态。等手停下来再真正换源，只发一次请求。
   */
  function scheduleSource(url, lrc) {
    pendingSource = { url, lrc }
    if (sourceTimer) clearTimeout(sourceTimer)
    sourceTimer = setTimeout(() => {
      sourceTimer = null
      flushSource()
    }, SOURCE_DEBOUNCE)
  }

  function flushSource() {
    if (sourceTimer) {
      clearTimeout(sourceTimer)
      sourceTimer = null
    }
    const next = pendingSource
    pendingSource = null
    if (!next || !active) return
    setSource(next.url)
    loadLyric(next.lrc)
  }

  function play() {
    const el = currentEl()
    if (!el) return
    // src 丢了（比如元素还没建出来）就先恢复当前曲
    if (!src.value) {
      if (songs.value.length) loadIndex(currentIndex.value, true)
      return
    }

    wantPlay = true
    stallFrom = 0
    hasPlayed.value = true

    const result = el.play()
    if (!result || typeof result.then !== 'function') return
    result
      .then(() => {
        isPlaying.value = true
      })
      .catch((err) => {
        const name = err?.name || ''
        if (name === 'AbortError') return // 被新的加载打断，正常
        if (name === 'NotAllowedError') {
          wantPlay = false
          isPlaying.value = false
          notice.value = '浏览器拦住了自动播放，点一下播放按钮就行'
          return
        }
        isPlaying.value = !el.paused
        handleAudioError()
      })
  }

  function toggle() {
    // 还在防抖里：直接把换源落下去，再交给自动播放
    if (pendingSource) {
      wantPlay = true
      flushSource()
      return
    }

    const el = currentEl()
    if (!el) {
      // 元素还没建出来（歌单仍在加载），先催一下
      if (songs.value.length) loadIndex(currentIndex.value, true)
      return
    }

    // 元素已经没法用了（卡在 00:00、播过报错）：不管当前是播是停，直接重建
    if (isBroken(el)) {
      loadIndex(currentIndex.value, true)
      return
    }
    // 以元素真实状态为准，影子状态错了也能靠这一下掰回来
    if (!el.paused) {
      wantPlay = false
      el.pause()
      return
    }
    play()
  }

  /** 元素是不是已经没法用了：没源、报过错、或者连时长都拿不到 */
  function isBroken(el) {
    if (!src.value || el.error) return true
    return !Number.isFinite(el.duration) || el.duration <= 0
  }

  async function loadLyric(url) {
    const token = ++lyricToken
    if (!url) return
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const raw = await res.text()
      if (token !== lyricToken) return
      lyricLines.value = parseLrc(raw)
    } catch {
      if (token === lyricToken) lyricLines.value = []
    }
  }

  function loadIndex(index, autoplay = wantPlay) {
    const len = songs.value.length
    if (!len) return

    const idx = ((index % len) + len) % len
    const song = songs.value[idx]

    currentIndex.value = idx
    songRetry = 0
    stallFixes = 0
    stallFrom = 0
    lastTickTime = -1
    notice.value = ''
    lyricLines.value = []
    currentTime.value = 0
    duration.value = 0
    seekPreview.value = null
    title.value = song.title || '未知歌曲'
    artist.value = song.author || '未知'
    cover.value = song.cover || ''

    if (!song.url) {
      notice.value = '歌曲链接无效'
      songFailed()
      return
    }

    wantPlay = autoplay
    // 新元素还没 play 事件，先把图标摆正，随后由事件接管
    isPlaying.value = false
    scheduleSource(song.url, song.lrc)
  }

  /** 歌单接口：返回空数组表示这次没拿到 */
  async function fetchPlaylist() {
    if (!config.music.api) return []
    try {
      // 音频地址是临时签名，歌单 JSON 不能吃缓存
      const res = await fetch(config.music.api, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!Array.isArray(data?.data)) return []
      return data.data.map(normalizeSong).filter((song) => song.url)
    } catch (err) {
      console.warn('[player] 歌单接口失败', err)
      return []
    }
  }

  async function loadPlaylist() {
    playlistLoading.value = true
    try {
      let list = await fetchPlaylist()
      if (!list.length) {
        console.warn('[player] 歌单为空，回退到备用曲目')
        list = config.music.fallback.map(normalizeSong).filter((song) => song.url)
      }
      songs.value = list
      if (!list.length) {
        notice.value = '歌单加载失败'
        wantPlay = false
        return
      }
      if (!active) return
      // 进站先摆好第一首，但不自动播：播放要用户自己点
      loadIndex(0, false)
    } finally {
      playlistLoading.value = false
    }
  }

  /**
   * 重新拉歌单再接着播：签名过期时所有地址都会 403，
   * 本地重试多少次都没用，必须换一份新地址。有冷却，避免打接口。
   */
  async function rescue() {
    if (rescuing) return
    const now = Date.now()
    if (now - lastRescueAt < RESCUE_COOLDOWN) {
      giveUp()
      return
    }
    lastRescueAt = now
    rescuing = true
    notice.value = '正在重新加载歌单…'

    const list = await fetchPlaylist()
    rescuing = false
    if (!active) return

    if (!list.length) {
      giveUp()
      return
    }
    songs.value = list
    consecutiveFail = 0
    loadIndex(currentIndex.value, true)
  }

  function giveUp() {
    wantPlay = false
    consecutiveFail = 0
    isPlaying.value = false
    notice.value = '音频加载失败，暂时没法播放，稍后再试'
  }

  /** 一首歌彻底播不了：连续失败多了就去换歌单，否则跳下一首 */
  function songFailed() {
    consecutiveFail += 1
    songRetry = 0
    if (consecutiveFail >= MAX_CONSECUTIVE_FAIL) {
      rescue()
      return
    }
    schedule(() => loadIndex(currentIndex.value + 1, true), 300)
  }

  function next() {
    if (!songs.value.length) {
      loadPlaylist()
      return
    }
    loadIndex(currentIndex.value + 1, true)
  }

  function prev() {
    if (!songs.value.length) {
      loadPlaylist()
      return
    }
    loadIndex(currentIndex.value - 1, true)
  }

  /* ---------- <audio> 事件 ---------- */
  /** 元数据到手就有总时长了：没播放时也能显示 04:38，而不是 00:00 */
  function handleMetadata(event) {
    const el = event?.target || currentEl()
    if (!el) return
    if (Number.isFinite(el.duration) && el.duration > 0) duration.value = el.duration
  }

  function handleCanPlay() {
    const el = currentEl()
    if (!el) return
    songRetry = 0
    // 元素自带 autoplay，这里只兜住「本来想播但没播起来」的情况
    if (wantPlay && el.paused) play()
  }

  function handlePlay(event) {
    // 换歌时旧元素被替换，它的暂停事件可能比新元素的 play 晚到
    if (event?.target && event.target !== currentEl()) return
    notice.value = ''
    isPlaying.value = true
    stallFrom = 0
    const el = currentEl()
    if (el) el.volume = clamp(Number(volume.value) || 0, 0, 1)
  }

  function handlePause(event) {
    if (event?.target && event.target !== currentEl()) return
    isPlaying.value = false
  }

  function handleEnded() {
    isPlaying.value = false
    // 播完继续下一首，意图保持「在播」
    wantPlay = true
    next()
  }

  function handleTimeUpdate(event) {
    const el = event.target
    if (!el) return
    currentTime.value = el.currentTime
    if (Number.isFinite(el.duration) && el.duration > 0) duration.value = el.duration
    if (el.currentTime > 0.5) consecutiveFail = 0
  }

  function handleAudioError() {
    const el = currentEl()
    // 没有源时的报错不算数，别把次数白白耗掉
    if (!el || !src.value) return

    const seq = loadSeq
    if (songRetry < MAX_SONG_RETRY) {
      songRetry += 1
      schedule(() => {
        if (seq !== loadSeq) return
        const target = currentEl()
        if (!target) return
        target.load()
        if (wantPlay) play()
      }, 300 * songRetry)
      return
    }
    songFailed()
  }

  /* ---------- 卡死自愈 ---------- */
  function healthCheck() {
    const el = currentEl()
    if (!el || !wantPlay) {
      stallFrom = 0
      lastTickTime = -1
      return
    }

    // 只有「进度真的在走」才算正常：paused，或者根本没数据都算卡住
    const moving = !el.paused && !el.ended && el.currentTime !== lastTickTime
    lastTickTime = el.currentTime
    if (moving) {
      stallFrom = 0
      consecutiveFail = 0
      // 元素才是真相：进度在走就把图标掰回「播放中」，别让影子状态骗人
      isPlaying.value = true
      return
    }

    if (!stallFrom) stallFrom = Date.now()
    if (Date.now() - stallFrom < STALL_TIMEOUT) return
    stallFrom = 0

    if (stallFixes < 1) {
      stallFixes += 1
      // 重建元素比 load() 干净，能清掉「在播但拿不到数据」的怪状态
      setSource(src.value)
      return
    }
    songFailed()
  }

  /* ---------- 进度条 / 音量 ---------- */
  function seek(event) {
    const el = currentEl()
    if (!el) return

    let total = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0
    if (!total && el.seekable?.length) total = el.seekable.end(0)
    if (!total) return

    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1)
    const target = ratio * total

    try {
      el.currentTime = target
    } catch {
      // 元数据没到位时有的浏览器会拒绝，下一次 timeupdate 会补上
    }
    currentTime.value = target
    if (!duration.value) duration.value = total
    seekPreview.value = null
    // 本来就是播放状态，拖完继续播
    if (wantPlay && el.paused) play()
  }

  watch(volume, (value) => {
    const el = currentEl()
    if (el) el.volume = clamp(Number(value) || 0, 0, 1)
  })

  /* ---------- 键盘控制 ---------- */
  function isTyping(target) {
    return !!target?.closest?.('input, textarea, select, button')
  }

  function handleKeydown(event) {
    // 首屏的空格/方向键归滚动管（App 会先 preventDefault），别抢
    if (!shortcutsOn.value || event.defaultPrevented) return
    const el = currentEl()
    if (!el || isTyping(event.target)) return

    const total = el.duration
    if (!Number.isFinite(total) || total <= 0) return

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        event.preventDefault()
        const step = Math.max(total * 0.03, 1)
        const base = seekPreview.value ?? el.currentTime
        seekPreview.value = clamp(base + (event.key === 'ArrowRight' ? step : -step), 0, total)
        break
      }
      case 'ArrowUp':
      case 'ArrowDown': {
        event.preventDefault()
        const delta = event.key === 'ArrowUp' ? 0.01 : -0.01
        volume.value = Number(clamp(Number(volume.value) + delta, 0, 1).toFixed(2))
        break
      }
      case ' ':
        event.preventDefault()
        toggle()
        break
      default:
        break
    }
  }

  function handleKeyup(event) {
    const el = currentEl()
    if (!el) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    if (seekPreview.value === null) return
    try {
      el.currentTime = clamp(seekPreview.value, 0, el.duration || 0)
    } catch {
      // 忽略
    }
    seekPreview.value = null
    if (wantPlay && el.paused) play()
  }

  /* ---------- 调试面板 ---------- */
  function toggleDevTools() {
    devVisible.value = !devVisible.value
  }

  /** 播放列表点选：点当前这首就当播放/暂停用，别从头再来 */
  function playIndex(index) {
    if (index === currentIndex.value && src.value) {
      toggle()
      return
    }
    loadIndex(index, true)
  }

  function playByIndex() {
    const index = Number.parseInt(devInput.value, 10)
    if (!Number.isInteger(index) || index < 0 || index >= songs.value.length) {
      notice.value = `请输入 0 - ${songs.value.length - 1} 之间的序号`
      return
    }
    loadIndex(index, true)
  }

  function start() {
    // 单例：<PlayerAudio> 只会挂一次，重复调用直接忽略
    if (active) return
    active = true
    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('keyup', handleKeyup)
    healthTimer = setInterval(healthCheck, HEALTH_INTERVAL)
    loadPlaylist()
  }

  function stop() {
    active = false
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('keyup', handleKeyup)
    if (healthTimer) clearInterval(healthTimer)
    if (advanceTimer) clearTimeout(advanceTimer)
    if (sourceTimer) clearTimeout(sourceTimer)
    healthTimer = null
    advanceTimer = null
    sourceTimer = null
    pendingSource = null
    wantPlay = false
    lyricToken += 1

    const el = currentEl()
    if (el) el.pause()
    // 清掉源，元素随之销毁，也不会在后台继续拉流
    src.value = ''
  }

  return {
    audioRef,
    songs,
    currentIndex,
    title,
    artist,
    cover,
    src,
    loadKey,
    shouldAutoplay,
    lyricView,
    currentLyric,
    notice,
    isPlaying,
    hasPlayed,
    percent,
    currentText,
    durationText,
    volume,
    devVisible,
    devInput,
    playlistLoading,
    shortcutsOn,
    setLyricWindow,
    next,
    prev,
    toggle,
    seek,
    playIndex,
    start,
    stop,
    handleCanPlay,
    handleMetadata,
    handlePlay,
    handlePause,
    handleEnded,
    handleTimeUpdate,
    handleAudioError,
    toggleDevTools,
    playByIndex,
  }
}

/** 全局只有这一份状态；页面切走时它和 <audio> 都还在 */
const player = createPlayer()

export function usePlayer() {
  return player
}

/** 由 <PlayerAudio> 调用：整个应用生命周期内只跑一次 */
export function startPlayer() {
  player.start()
}

export function stopPlayer() {
  player.stop()
}
