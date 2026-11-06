<script setup lang="ts">
defineProps<{
  watermarkImage: string
}>()
</script>

<template>
  <!-- the image is a mask over a block of the current text color, rather than a background
       image: an svg drawn as a background can't inherit the color, so its currentColor ink
       falls back to black and vanishes on a dark palette -->
  <div
    class="watermark-badge"
    :style="{
      maskImage: `url(${watermarkImage})`,
      WebkitMaskImage: `url(${watermarkImage})`
    }"
  />
</template>

<style scoped>
.watermark-badge {
  --badge-width: calc(0.4 * var(--sidebar-width));
  background-color: currentColor;
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  opacity: 0.3;
  pointer-events: none;
}
</style>
