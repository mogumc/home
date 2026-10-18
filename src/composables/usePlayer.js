import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { config } from '../config'
import { clamp, formatTime } from '../utils/format'
import { buildLyricView, parseLrc } from '../utils/lrc'

/** 单曲最多重试几次，超过就跳下一首 */
const MAX_SONG_RETRY = 3

function normalizeSong(song = {}) {
  return {
    title: song.title || song.name || '',
    author: song.author || song.artist || '',
    url: song.url || '',
    lrc: song.lrc || '',
    cover: song.cover || song.pic || '',
  }
}

/**
 * 音乐播放器的状态机：歌单、歌词、进度、音量、键盘控制
 * 原来散在 setup 里的一大坨逻辑收在这里，View 只负责画 UI。
 */
export function usePlayer() {
  const audioRef = ref(null)

  const songs = ref([])
  const currentIndex = ref(0)
  const title = ref('')
  const artist = ref('')
  const cover = ref('')
  const src = ref('')
  const lyricLines = ref([])

  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  /** 拖动/方向键预览时的临时进度，null 表示跟随真实播放 */
  const seekPreview = ref(null)
  const volume = ref(0.7)
  const notice = ref('')

  const devVisible = ref(false)
  const devInput = ref('')
  const playlistLoading = ref(true)

  let songRetry = 0
  let totalRetry = 0
  let lyricToken = 0
  let advanceTimer = null

  const lyricView = computed(() => buildLyricView(lyricLines.value, currentTime.value))
  const percent = computed(() => {
    if (!duration.value) return 0
    const base = seekPreview.value ?? currentTime.value
    return clamp((base / duration.value) * 100, 0, 100)
  })
  const currentText = computed(() => formatTime(seekPreview.value ?? currentTime.value))
  const durationText = computed(() => formatTime(duration.value))

  function tryPlay() {
    const el = audioRef.value
    if (!el || !el.src) return
    el.play().catch(() => {
      notice.value = '播放被浏览器阻止，请手动点击开始播放'
    })
  }

  /** 重试耗尽后放弃，或排下一首 */
  function fail(extraRetry = 0) {
    totalRetry += extraRetry
    if (totalRetry >= songs.value.length * MAX_SONG_RETRY) {
      notice.value = '音频加载失败，请稍后重试'
      return
    }
    advanceTimer = setTimeout(() => loadIndex(currentIndex.value + 1), 0)
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

  function loadIndex(index) {
    const len = songs.value.length
    if (!len) return

    const idx = ((index % len) + len) % len
    const song = songs.value[idx]

    currentIndex.value = idx
    songRetry = 0
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
      fail(2)
      return
    }

    if (src.value !== song.url) src.value = song.url
    loadLyric(song.lrc)
  }

  async function loadPlaylist() {
    playlistLoading.value = true
    try {
      const res = await fetch(config.music.api)
      const data = await res.json()
      const list = Array.isArray(data?.data) ? data.data : []
      if (!list.length) throw new Error('歌单为空')
      songs.value = list.map(normalizeSong)
    } catch (err) {
      console.warn('[player] 歌单加载失败，回退到备用曲目', err)
      songs.value = config.music.fallback.map(normalizeSong)
    } finally {
      playlistLoading.value = false
    }
    if (songs.value.length) loadIndex(0)
  }

  function next() {
    loadIndex(currentIndex.value + 1)
  }

  function prev() {
    loadIndex(currentIndex.value - 1)
  }

  function toggle() {
    if (isPlaying.value) audioRef.value?.pause()
    else tryPlay()
  }

  /* ---------- <audio> 事件 ---------- */
  function handleCanPlay() {
    songRetry = 0
    if (!isPlaying.value) tryPlay()
  }

  function handlePlay() {
    notice.value = ''
    isPlaying.value = true
    if (audioRef.value) audioRef.value.volume = Number(volume.value)
  }

  function handlePause() {
    isPlaying.value = false
  }

  function handleTimeUpdate(event) {
    const el = event.target
    currentTime.value = el.currentTime
    if (Number.isFinite(el.duration)) duration.value = el.duration
  }

  function handleAudioError() {
    const el = audioRef.value
    if (!el) return

    if (songRetry < MAX_SONG_RETRY) {
      songRetry += 1
      totalRetry += 1
      el.load()
      return
    }

    if (totalRetry >= songs.value.length * MAX_SONG_RETRY) {
      notice.value = '音频加载失败，请稍后重试'
      return
    }
    songRetry = 0
    next()
  }

  /* ---------- 进度条 / 音量 ---------- */
  function seek(event) {
    const el = audioRef.value
    if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1)
    el.currentTime = ratio * el.duration
    seekPreview.value = null
  }

  watch(volume, (value) => {
    if (audioRef.value) audioRef.value.volume = clamp(Number(value) || 0, 0, 1)
  })

  /* ---------- 键盘控制 ---------- */
  function isTyping(target) {
    return !!target?.closest?.('input, textarea, select, button')
  }

  function handleKeydown(event) {
    const el = audioRef.value
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
    const el = audioRef.value
    if (!el) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    if (seekPreview.value === null) return
    el.currentTime = clamp(seekPreview.value, 0, el.duration || 0)
    seekPreview.value = null
  }

  /* ---------- 调试面板 ---------- */
  function toggleDevTools() {
    devVisible.value = !devVisible.value
  }

  function playByIndex() {
    const index = Number.parseInt(devInput.value, 10)
    if (!Number.isInteger(index) || index < 0 || index >= songs.value.length) {
      notice.value = `请输入 0 - ${songs.value.length - 1} 之间的序号`
      return
    }
    loadIndex(index)
  }

  function start() {
    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('keyup', handleKeyup)
    loadPlaylist()
  }

  function stop() {
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('keyup', handleKeyup)
    if (advanceTimer) clearTimeout(advanceTimer)
  }

  onMounted(start)
  onUnmounted(stop)

  return {
    audioRef,
    songs,
    title,
    artist,
    cover,
    src,
    lyricView,
    notice,
    isPlaying,
    percent,
    currentText,
    durationText,
    volume,
    devVisible,
    devInput,
    playlistLoading,
    next,
    prev,
    toggle,
    seek,
    handleCanPlay,
    handlePlay,
    handlePause,
    handleTimeUpdate,
    handleAudioError,
    toggleDevTools,
    playByIndex,
  }
}
