<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

/**
 * 一行歌词：放不下时不折行，而是把「正在唱到的那一点」推到容器中间，
 * 两端用渐隐遮罩过渡，跟桌面音乐软件的歌词条一个思路。
 */
const props = defineProps({
  text: { type: String, required: true },
  active: { type: Boolean, default: false },
  /** 当前行内的播放进度 0~1 */
  progress: { type: Number, default: 0 },
})

const rowRef = ref(null)
const textRef = ref(null)
const offset = ref(0)
const overflowing = ref(false)

let observer = null

function measure() {
  const row = rowRef.value
  const text = textRef.value
  if (!row || !text) return

  const rowWidth = row.clientWidth
  const textWidth = text.scrollWidth
  overflowing.value = textWidth > rowWidth + 1

  if (!overflowing.value || !props.active) {
    offset.value = 0
    return
  }

  // 唱到哪，哪一点就落在中间：offset = 半宽 - 进度 × 文本宽
  const target = rowWidth / 2 - props.progress * textWidth
  // 首尾不能露白，限制在 [容器宽 - 文本宽, 0]
  offset.value = Math.min(0, Math.max(rowWidth - textWidth, target))
}

onMounted(() => {
  observer = new ResizeObserver(measure)
  if (rowRef.value) observer.observe(rowRef.value)
  measure()
})

onUnmounted(() => observer?.disconnect())

watch(
  () => [props.text, props.active, props.progress],
  () => nextTick(measure),
)
</script>

<template>
  <div
    ref="rowRef"
    class="lyric-line"
    :class="{ 'is-active': active, 'is-overflow': overflowing }"
  >
    <span ref="textRef" class="lyric-text" :style="{ transform: `translateX(${offset}px)` }">
      {{ text }}
    </span>
  </div>
</template>

<style scoped>
.lyric-line {
  overflow: hidden;
  white-space: nowrap;
  line-height: 1.6;
  color: var(--text-muted);
}

/* 只在放不下时给两端加渐隐，短句不受影响 */
.lyric-line.is-overflow {
  mask-image: linear-gradient(90deg, transparent 0, #000 7%, #000 93%, transparent 100%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 7%, #000 93%, transparent 100%);
}

.lyric-line.is-active {
  color: var(--text-strong);
  font-weight: bold;
}

.lyric-text {
  display: inline-block;
  will-change: transform;
  transition: transform 0.28s linear;
}
</style>
