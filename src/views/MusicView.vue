<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import LyricLine from '../components/LyricLine.vue'
import { usePlayer } from '../composables/usePlayer'

/**
 * 播放器页面。真正的 <audio> 在 App 里的 <PlayerAudio>，
 * 这里只负责展示和发指令，所以离开这页音乐照放。
 */
const {
  songs,
  currentIndex,
  title,
  artist,
  cover,
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
  shortcutsOn,
  setLyricWindow,
  next,
  prev,
  toggle,
  seek,
  playIndex,
  toggleDevTools,
  playByIndex,
} = usePlayer()

/** 右侧面板：歌词 / 播放列表 */
const tab = ref('lyric')

/** 歌词区一行（含行距）大约这么高，用面板高度除一下就是能放几句 */
const LYRIC_ROW_HEIGHT = 39

const lyricStage = ref(null)
let stageObserver = null

/** 按歌词区的真实高度决定显示几行：面板越高，上下能带出的句子越多 */
function measureLyricWindow() {
  const el = lyricStage.value
  if (!el) return
  const styles = getComputedStyle(el)
  const padding = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0)
  setLyricWindow((el.clientHeight - padding) / LYRIC_ROW_HEIGHT)
}

function watchStage() {
  stageObserver?.disconnect()
  if (!lyricStage.value) return
  stageObserver = new ResizeObserver(measureLyricWindow)
  stageObserver.observe(lyricStage.value)
  measureLyricWindow()
}

watch(tab, async () => {
  await nextTick()
  watchStage()
})

onMounted(async () => {
  // 键盘快捷键（空格、方向键）只在这页接管
  shortcutsOn.value = true
  await nextTick()
  watchStage()
})

onBeforeUnmount(() => {
  shortcutsOn.value = false
  stageObserver?.disconnect()
})
</script>

<template>
  <div class="player-page">
    <!-- 左：封面 + 曲目信息 + 进度 + 控制 -->
    <section class="deck glass">
      <div class="artwork" title="双击打开调试面板" @dblclick="toggleDevTools">
        <img v-if="cover" :src="cover" :alt="title || '专辑封面'" />
        <i v-else class="bi bi-vinyl" aria-hidden="true"></i>
      </div>

      <div class="meta">
        <h1 class="track-title" :title="title">{{ title || '未选择歌曲' }}</h1>
        <p class="track-artist">{{ artist || '—' }}</p>
      </div>

      <div class="seek" @click="seek">
        <div class="seek-rail">
          <span class="seek-fill" :style="{ width: `${percent}%` }"></span>
        </div>
        <div class="seek-times">
          <span>{{ currentText }}</span>
          <span>{{ durationText }}</span>
        </div>
      </div>

      <div class="controls">
        <button class="icon-btn" type="button" title="上一首" @click="prev">
          <i class="bi bi-skip-backward-fill" aria-hidden="true"></i>
        </button>
        <button
          class="play-btn"
          type="button"
          :title="isPlaying ? '暂停' : '播放'"
          @click="toggle"
        >
          <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
        </button>
        <button class="icon-btn" type="button" title="下一首" @click="next">
          <i class="bi bi-skip-forward-fill" aria-hidden="true"></i>
        </button>
      </div>

      <div class="volume">
        <i class="bi bi-volume-down-fill" aria-hidden="true"></i>
        <input v-model.number="volume" type="range" min="0" max="1" step="0.01" aria-label="音量" />
      </div>

      <p v-if="notice" class="notice">{{ notice }}</p>

      <form v-if="devVisible" id="dev-box" @submit.prevent="playByIndex">
        <input
          v-model="devInput"
          class="dev-input"
          inputmode="numeric"
          placeholder="输入歌曲序号"
          aria-label="歌曲序号"
        />
        <button class="dev-button" type="submit">提交</button>
      </form>
    </section>

    <!-- 右：歌词 / 播放列表 -->
    <section class="panel glass">
      <header class="panel-head">
        <button
          class="tab"
          type="button"
          :class="{ 'is-active': tab === 'lyric' }"
          @click="tab = 'lyric'"
        >
          歌词
        </button>
        <button
          class="tab"
          type="button"
          :class="{ 'is-active': tab === 'list' }"
          @click="tab = 'list'"
        >
          播放列表
          <span v-if="songs.length" class="tab-count">{{ songs.length }}</span>
        </button>
      </header>

      <div v-if="tab === 'lyric'" ref="lyricStage" class="lyric-stage">
        <template v-if="lyricView.length">
          <LyricLine
            v-for="(line, index) in lyricView"
            :key="`${index}-${line.text}`"
            :text="line.text"
            :active="line.active"
            :progress="line.progress"
          />
        </template>
        <p v-else class="stage-empty">
          {{ playlistLoading ? '歌单加载中…' : '暂无歌词' }}
        </p>
      </div>

      <div v-else class="track-list">
        <p v-if="!songs.length" class="stage-empty">
          {{ playlistLoading ? '歌单加载中…' : '歌单暂无曲目' }}
        </p>
        <button
          v-for="(song, index) in songs"
          :key="`${index}-${song.url}`"
          class="track-row"
          type="button"
          :class="{ 'is-current': index === currentIndex }"
          @click="playIndex(index)"
        >
          <span class="track-index">
            <i
              v-if="index === currentIndex && isPlaying"
              class="bi bi-bar-chart-fill"
              aria-hidden="true"
            ></i>
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span class="track-name">{{ song.title || '未知歌曲' }}</span>
          <span class="track-artist">{{ song.author }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.player-page {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 1.25rem;
  /* margin:auto 让两栏在内容区里居中，窄屏堆叠时贴顶 */
  margin: auto;
  width: min(96%, 1080px);
}

/* ---------- 左：播放台 ---------- */
.deck {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 2.2rem 1.6rem 1.6rem;
}

.artwork {
  position: relative;
  width: min(100%, 250px);
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 26px 56px -20px rgba(0, 0, 0, 0.8);
  cursor: pointer;
  user-select: none;
}

.artwork img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.artwork i {
  font-size: 3rem;
  color: rgba(255, 255, 255, 0.28);
}

.meta {
  width: 100%;
  margin-top: 1.5rem;
  text-align: center;
  min-width: 0;
}

.track-title {
  margin: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--text-strong);
}

.track-artist {
  margin: 0.4rem 0 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.55);
}

/* ---------- 进度 ---------- */
.seek {
  width: 100%;
  margin-top: 1.5rem;
  padding: 0.35rem 0;
  cursor: pointer;
}

.seek-rail {
  /* 固定用放大后的高度：hover 再变高会把下面的控件顶动，看着像整块在抖 */
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  overflow: hidden;
}

.seek-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: #fff;
  /* 和 timeupdate 的频率对齐，别追得太紧 */
  transition: width 0.12s linear;
}

.seek-times {
  display: flex;
  justify-content: space-between;
  margin-top: 0.45rem;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.45);
}

/* ---------- 控制 ---------- */
.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.1rem;
  margin-top: 1.1rem;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: rgba(255, 255, 255, 0.62);
  font-size: 1.35rem;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}

.icon-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.play-btn {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #fff;
  color: #111;
  font-size: 1.7rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 12px 30px -8px rgba(0, 0, 0, 0.65);
  transition: transform 0.18s ease, background 0.2s ease;
}

.play-btn:hover {
  transform: scale(1.05);
}

.play-btn:active {
  transform: scale(0.96);
}

/* ---------- 音量 / 提示 ---------- */
.volume {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.4rem;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.85rem;
}

.volume input[type='range'] {
  width: 120px;
  accent-color: #fff;
  cursor: pointer;
}

.notice {
  margin: 1rem 0 0;
  font-size: 0.78rem;
  line-height: 1.5;
  text-align: center;
  color: rgba(255, 255, 255, 0.55);
}

#dev-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 1rem;
}

.dev-input {
  width: 130px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-strong);
  font-family: inherit;
  font-size: 0.8rem;
  outline: none;
}

.dev-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.dev-input:focus {
  border-color: rgba(255, 255, 255, 0.45);
}

.dev-button {
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.16);
  color: var(--text-strong);
  font-family: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.dev-button:hover {
  background: rgba(255, 255, 255, 0.26);
}

/* ---------- 右：歌词 / 列表 ---------- */
.panel {
  display: flex;
  flex-direction: column;
  min-height: 420px;
  padding: 1rem 1.2rem 1.2rem;
}

.panel-head {
  display: flex;
  gap: 1.4rem;
  padding: 0.2rem 0.2rem 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.tab {
  position: relative;
  padding: 0 0 0.55rem;
  border: 0;
  background: none;
  color: rgba(255, 255, 255, 0.5);
  font-family: inherit;
  font-size: 0.95rem;
  cursor: pointer;
  transition: color 0.2s ease;
}

.tab::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: #fff;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tab:hover {
  color: rgba(255, 255, 255, 0.8);
}

.tab.is-active {
  color: #fff;
}

.tab.is-active::after {
  transform: scaleX(1);
}

.tab-count {
  margin-left: 0.4rem;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.35);
}

.lyric-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  min-height: 0;
  /* 上下渐隐，长歌词进出不会硬切 */
  mask-image: linear-gradient(to bottom, transparent 0, #000 10%, #000 90%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 10%, #000 90%, transparent 100%);
}

.lyric-stage :deep(.lyric-line) {
  font-size: 1rem;
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.38);
  transition: color 0.3s ease, font-size 0.3s ease;
}

.lyric-stage :deep(.lyric-line.is-active) {
  font-size: 1.18rem;
  font-weight: 600;
  color: #fff;
}

.stage-empty {
  margin: 0;
  text-align: center;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.35);
}

.track-list {
  flex: 1;
  min-height: 0;
  max-height: 52vh;
  margin-top: 0.5rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
}

.track-list::-webkit-scrollbar {
  width: 6px;
}

.track-list::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.22);
}

.track-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.55rem 0.6rem;
  border: 0;
  border-radius: 8px;
  background: none;
  color: rgba(255, 255, 255, 0.72);
  font-family: inherit;
  font-size: 0.88rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}

.track-row:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
}

.track-row.is-current {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.track-index {
  flex: 0 0 1.8rem;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.32);
  text-align: right;
}

.track-row.is-current .track-index {
  color: #fff;
}

.track-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.track-artist {
  flex: 0 1 auto;
  max-width: 38%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.38);
}

/* ---------- 窄屏 ---------- */
@media (max-width: 900px) {
  .player-page {
    grid-template-columns: minmax(0, 1fr);
    width: 100%;
    gap: 1rem;
  }

  /* 窄屏上把播放台压紧一点，让下面的歌词面板露个头 */
  .deck {
    padding: 1.4rem 1rem 1rem;
  }

  .artwork {
    width: min(100%, 170px);
  }

  .meta {
    margin-top: 1.1rem;
  }

  .track-title {
    font-size: 1.15rem;
  }

  .seek {
    margin-top: 1.1rem;
  }

  .controls {
    margin-top: 0.9rem;
  }

  .play-btn {
    width: 58px;
    height: 58px;
    font-size: 1.55rem;
  }

  .volume {
    margin-top: 1rem;
  }

  .panel {
    min-height: 320px;
  }

  .lyric-stage {
    padding: 1.25rem 0.5rem;
  }

  .track-list {
    max-height: 46vh;
  }
}
</style>
