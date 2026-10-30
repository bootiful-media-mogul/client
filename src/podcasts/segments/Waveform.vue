<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  peaks: number[]
  sourceStart: number
  sourceEnd: number
  sourceDuration: number
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let observer: ResizeObserver | undefined

function draw() {
  const element = canvas.value
  if (!element) return
  const width = Math.max(1, Math.round(element.clientWidth))
  const height = Math.max(1, Math.round(element.clientHeight))
  const ratio = window.devicePixelRatio || 1
  element.width = Math.round(width * ratio)
  element.height = Math.round(height * ratio)
  const context = element.getContext('2d')
  if (!context) return
  context.scale(ratio, ratio)
  context.clearRect(0, 0, width, height)
  // the bar color comes from css (`color` on the canvas) so the waveform follows the theme
  context.fillStyle = getComputedStyle(element).color
  const bars = Math.ceil(width / 3)
  const visibleDuration = Math.max(0.001, props.sourceEnd - props.sourceStart)
  for (let index = 0; index < bars; index++) {
    const sourceTime = props.sourceStart + (index / bars) * visibleDuration
    const peakIndex = Math.min(
      props.peaks.length - 1,
      Math.floor((sourceTime / props.sourceDuration) * props.peaks.length)
    )
    const amplitude = props.peaks[peakIndex] ?? 0.18
    const barHeight = Math.max(3, amplitude * (height - 10))
    context.globalAlpha = 0.62 + amplitude * 0.35
    context.fillRect(index * 3, (height - barHeight) / 2, 1.6, barHeight)
  }
  context.globalAlpha = 1
}

onMounted(() => {
  observer = new ResizeObserver(draw)
  observer.observe(canvas.value!)
  draw()
})
onBeforeUnmount(() => observer?.disconnect())
watch(() => [props.peaks, props.sourceStart, props.sourceEnd, props.sourceDuration], draw)
</script>

<template><canvas ref="canvas" class="waveform" aria-hidden="true" /></template>

<style scoped>
.waveform {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
