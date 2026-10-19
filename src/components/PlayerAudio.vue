<script setup>
import { onMounted, onUnmounted } from 'vue'
import { startPlayer, stopPlayer, usePlayer } from '../composables/usePlayer'

/**
 * <audio> 的家：挂在 App 上，整站常驻。
 * 页面切来切去时元素不重建，所以音乐不会断；换歌靠 key 变化重建，见 usePlayer。
 */
const {
  audioRef,
  src,
  loadKey,
  shouldAutoplay,
  handleMetadata,
  handleCanPlay,
  handlePlay,
  handlePause,
  handleEnded,
  handleTimeUpdate,
  handleAudioError,
} = usePlayer()

onMounted(startPlayer)
onUnmounted(stopPlayer)
</script>

<template>
  <audio
    v-if="src"
    :key="loadKey"
    ref="audioRef"
    :src="src"
    :autoplay="shouldAutoplay"
    :preload="shouldAutoplay ? 'auto' : 'metadata'"
    @timeupdate="handleTimeUpdate"
    @loadedmetadata="handleMetadata"
    @ended="handleEnded"
    @error="handleAudioError"
    @canplay="handleCanPlay"
    @play="handlePlay"
    @pause="handlePause"
  ></audio>
</template>
