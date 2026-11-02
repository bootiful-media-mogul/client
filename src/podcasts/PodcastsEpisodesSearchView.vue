<!-- 
 this is meant to be the overall search view of the podcast episodes 
-->
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { Podcast, PodcastEpisode, podcasts, ResultType } from '@/services'
import router from '@/index'
import { useI18n } from 'vue-i18n'
import Result from '@/search/Result.vue'
import EntityViewDecorator from '@/ui/EntityViewDecorator.vue'

import segmentAsset from '@/assets/images/icons/podcast.svg'
import Icon from '@/ui/Icon.vue'

import plusIcon from '@/assets/images/icons/plus.svg'

// Props
const props = defineProps<{ podcastId: number }>()
const episodes = ref<PodcastEpisode[]>([])
const currentPodcast = ref<Podcast>()
const selectedPodcastId = ref(props.podcastId)
const episode = ref<PodcastEpisode | null>()
const { t } = useI18n()

onMounted(async () => {
  await loadPodcast()
})

const title = ref<string>('')

async function loadPodcast() {
  const newPodcastId = selectedPodcastId.value
  currentPodcast.value = await podcasts.podcastById(newPodcastId)
  episodes.value = await podcasts.podcastEpisodesPreviews(newPodcastId)
  title.value = t('podcasts.episodes.all', {
    id: currentPodcast.value.id,
    title: currentPodcast.value.title
  })
}

async function navigateToEpisodeEditor(podcastId: number, episodeId: number) {
  await router.push({
    name: 'podcasts/episodes/episode',
    params: { podcastId: podcastId, episodeId: episodeId }
  })
}

const loadEpisode = async (e: PodcastEpisode) => {
  await navigateToEpisodeEditor(props.podcastId, e.id)
  title.value = t('podcasts.episodes')
}

function context(episode: PodcastEpisode) {
  const m = new Map<string, any>()
  m.set('podcastId', selectedPodcastId.value)
  m.set('episodeId', episode.id)
  m.set('id', episode.id)
  m.set('type', 'episode')
  return m
}

async function newEpisode() {
  console.log('calling new episode')
  episode.value = await podcasts.createPodcastEpisodeDraft(selectedPodcastId.value, '', '')
  await loadEpisode(episode.value)
}
</script>
<template>
  <EntityViewDecorator :watermark-image="segmentAsset">
    <h1>
      {{ t('podcasts.episodes') }}
    </h1>
    <form class="pure-form">
      <fieldset>
        <legend>
          {{ t('podcasts.episodes.title', { title: currentPodcast?.title }) }}
        </legend>
        <div class="toolbar">
          <Icon :icon-hover="plusIcon" :icon="plusIcon" @click="newEpisode()" />
        </div>
        <div v-for="episode in episodes" v-bind:key="episode.id">
          <Result
            :context="context(episode)"
            :type="ResultType.Segment"
            :aggregate-id="currentPodcast?.id"
            :created="episode.created"
            :title="episode.title"
            :id="episode.id"
            :allow-deletion="true"
            @delete="loadPodcast"
          />
        </div>
      </fieldset>
    </form>
  </EntityViewDecorator>
</template>
