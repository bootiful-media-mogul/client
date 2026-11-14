<template>
  <AyrshareComponent
    :icon="ayrshareIcon"
    plugin-name="podcastEpisodeAyrshare"
    ready-event-category="podcast-episode-completed-event"
  />
</template>
<script lang="ts" setup>
import ayrshareIcon from '@/assets/images/icons/ayrshare.svg'
import AyrshareComponent from '@/publications/AyrshareComponent.vue'
</script>
