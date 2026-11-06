<script setup lang="ts">
defineProps<{
  watermarkImage: string
}>()
</script>

<template>
  <div class="watermarked-view">
    <!--    <WatermarkedImage class="image" :watermark-image="watermarkImage" />-->
    <div class="content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.watermarked-view {
  .image {
    position: fixed;
    top: var(--gutter-space);
    right: var(--gutter-space);

    width: var(--badge-width);
    height: var(--badge-width);

    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }
}

.content {
  position: relative;
  z-index: 1;
}
</style>
