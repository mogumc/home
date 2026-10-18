<script setup>
import { useClock } from '../composables/useClock'

const { time, date } = useClock()
</script>

<template>
  <div class="module glass">
    <h3><i class="bi bi-clock-fill" aria-hidden="true"></i> 时钟</h3>
    <div class="date">{{ date }}</div>
    <div class="clock">{{ time }}</div>
  </div>
</template>

<style scoped>
.date {
  font-size: 0.9rem;
  color: #bbb;
  font-weight: normal;
}

.clock {
  margin-top: 4px;
  font-size: 1.5rem;
  font-weight: bold;
  color: #ccc;
  font-variant-numeric: tabular-nums;
}
</style>
