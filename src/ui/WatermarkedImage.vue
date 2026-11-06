<script setup lang="ts">
withDefaults(
  defineProps<{
    watermarkImage: string
    invert?: boolean
  }>(),
  {
    invert: true
  }
)
</script>

<template>
  <div
    class="watermark-badge"
    :style="{
      backgroundImage: `url(${watermarkImage})`,
      filter: invert ? 'invert(1)' : 'none'
    }"
  />
</template>

<style scoped>
.watermark-badge {
  --badge-width: calc(0.4 * var(--sidebar-width));
  opacity: 0.3;
  pointer-events: none;
}
</style>
