<script setup>
import { config } from '../config'
import ClockCard from '../components/ClockCard.vue'
import LyricLine from '../components/LyricLine.vue'
import QuoteCard from '../components/QuoteCard.vue'
import { usePlayer } from '../composables/usePlayer'

const {
  audioRef,
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
} = usePlayer()
</script>

<template>
  <div class="container">
    <div class="left">
      <!-- 拿到歌单后展示封面唱片，播放时旋转；双击打开调试面板 -->
      <div
        class="disc is-clickable"
        :class="{ 'is-spinning': isPlaying && cover }"
        :title="title || '双击打开调试面板'"
        @dblclick="toggleDevTools"
      >
        <img :src="cover || config.profile.avatar" :alt="title || `${config.site.name} 的头像`" />
      </div>

      <div class="contact-info glass lyric-card">
        <div class="lyric-box" aria-live="polite">
          <div v-if="notice" class="lyric-message">{{ notice }}</div>
          <template v-else-if="lyricView.length">
            <LyricLine
              v-for="(line, index) in lyricView"
              :key="`${index}-${line.text}`"
              :text="line.text"
              :active="line.active"
              :progress="line.progress"
            />
          </template>
          <div v-else>暂无歌词</div>
        </div>
      </div>

      <div v-if="devVisible" class="contact-info glass">
        <form id="dev-box" @submit.prevent="playByIndex">
          <input
            v-model="devInput"
            class="dev-input"
            inputmode="numeric"
            placeholder="输入歌曲序号"
            aria-label="歌曲序号"
          />
          <button class="dev-button" type="submit">提交</button>
        </form>
      </div>
    </div>

    <div class="right">
      <div v-if="config.modules.hitokoto || config.modules.clock" class="top-modules">
        <QuoteCard v-if="config.modules.hitokoto" />
        <ClockCard v-if="config.modules.clock" />
      </div>

      <div class="music-modules">
        <div class="module glass">
          <h3><i class="bi bi-music-note-beamed" aria-hidden="true"></i> 音乐播放器</h3>

          <div class="custom-player">
            <audio
              ref="audioRef"
              :src="src || undefined"
              preload="auto"
              @timeupdate="handleTimeUpdate"
              @ended="next"
              @error="handleAudioError"
              @canplay="handleCanPlay"
              @play="handlePlay"
              @pause="handlePause"
            ></audio>

            <div class="audio-controls">
              <button class="audio-panel" type="button" title="上一首" @click="prev">
                <i class="bi bi-skip-backward-fill" aria-hidden="true"></i>
              </button>
              <button
                class="audio-panel"
                type="button"
                :title="isPlaying ? '暂停' : '播放'"
                @click="toggle"
              >
                <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
              </button>
              <button class="audio-panel" type="button" title="下一首" @click="next">
                <i class="bi bi-skip-forward-fill" aria-hidden="true"></i>
              </button>
            </div>

            <div class="audio-progress-container" @click="seek">
              <div class="progress-bar" :style="{ width: `${percent}%` }"></div>
              <div class="progress-thumb" :style="{ left: `${percent}%` }"></div>
            </div>

            <div class="audio-time">{{ currentText }} / {{ durationText }}</div>
          </div>
        </div>

        <div class="module glass">
          <h3><i class="bi bi-info-circle" aria-hidden="true"></i> 歌曲信息</h3>
          <p><strong>正在播放：</strong>{{ title || '未播放音乐' }}</p>
          <p><strong>歌手：</strong>{{ artist || '未知' }}</p>

          <label class="volume-label" for="volume"><strong>音量：</strong></label>
          <input id="volume" v-model.number="volume" type="range" min="0" max="1" step="0.01" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ---------- 歌词 ---------- */
/* ---------- 封面唱片 ---------- */
.disc {
  width: 150px;
  height: 150px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 3px solid #fff;
  overflow: hidden;
  cursor: pointer;
  animation: disc-spin 26s linear infinite;
  animation-play-state: paused;
}

.disc.is-spinning {
  animation-play-state: running;
}

.disc img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* 换歌时淡一下，避免硬切 */
  transition: opacity 0.3s ease;
}

@keyframes disc-spin {
  to {
    transform: rotate(360deg);
  }
}

.lyric-card {
  /* 撑满左侧剩余高度，和右边播放器卡片底部对齐 */
  display: flex;
  flex: 1 1 auto;
  min-height: 132px;
}

.lyric-box {
  /* 高度由卡片决定，歌词行数变化不会让布局来回跳 */
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 10px;
  font-size: 16px;
  line-height: 1.6;
  text-align: left;
  color: var(--text-muted);
}


.lyric-message {
  color: var(--text-strong);
  font-weight: bold;
}

/* ---------- 调试面板 ---------- */
#dev-box {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.dev-input {
  flex: 1;
  min-width: 0;
  max-width: 150px;
  height: 30px;
  padding: 0 10px;
  border: 2px solid #ccc;
  border-radius: 10px;
  font-size: 16px;
  background: #fff;
  outline: none;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.dev-input:focus {
  border-color: #007bff;
  box-shadow: 0 0 8px rgba(0, 123, 255, 0.3);
}

.dev-button {
  flex-shrink: 0;
  width: 60px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: #007bff;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

.dev-button:hover {
  background: #0056b3;
  transform: scale(1.05);
}

.dev-button:active {
  transform: scale(0.98);
}

/* ---------- 播放器 ---------- */
.music-modules {
  display: flex;
  gap: 1rem;
}

.custom-player {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.audio-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.audio-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.6rem;
  height: 2.6rem;
  padding: 0;
  border: 1px solid var(--glass-border);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-size: 1.2rem;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}

.audio-panel:hover,
.audio-panel:focus-visible {
  color: #66ccff;
  background: rgba(255, 255, 255, 0.12);
  outline: none;
}

.audio-progress-container {
  position: relative;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #555;
  cursor: pointer;
}

.progress-bar {
  height: 100%;
  width: 0;
  border-radius: 4px;
  background: #fff;
  transition: width 0.08s linear;
}

.progress-thumb {
  position: absolute;
  top: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  transform: translateX(-50%);
  pointer-events: none;
}

.audio-time {
  margin-top: 4px;
  font-size: 14px;
  color: #ccc;
  font-variant-numeric: tabular-nums;
}

.volume-label {
  display: inline-block;
  margin-top: 8px;
}

input[type='range'] {
  width: 100%;
  max-width: 220px;
  accent-color: #66ccff;
  cursor: pointer;
}

@media (max-width: 1024px) {
  .lyric-card {
    flex: 0 0 auto;
  }

  .lyric-box {
    height: 150px;
  }
}

@media (max-width: 768px) {
  .music-modules {
    flex-direction: column;
  }

  .top-modules {
    display: none;
  }
}

</style>
