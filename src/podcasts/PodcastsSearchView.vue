<template>
  <EntityViewDecorator :watermark-image="segmentAsset">
    <h1>
      {{ t('podcasts.title') }}
    </h1>

    <div v-if="!editorVisible">
      <form class="pure-form">
        <fieldset>
          <div class="toolbar">
            <Icon :icon-hover="plusIconHighlight" :icon="plusIcon" @click="createPodcast" />
          </div>

          <legend>{{ t('podcasts.all', { user: mogulName }) }}</legend>

          <div v-for="podcast in all" v-bind:key="podcast.id" class="row podcasts-row">
            <div class="id-column">
              #<b>{{ podcast.id }}</b>
            </div>
            <div class="created-column">
              {{ dts(podcast.created) }}
            </div>
            <div class="episodes">
              <a
                class="podcasts-icon"
                href="#"
                @click.prevent="navigateToEpisodesPageForPodcast(podcast.id)"
              >
                {{ t('podcasts.episodes') }}
              </a>
            </div>
            <div class="edit">
              <Icon
                :icon="editHighlightAsset"
                :icon-hover="editAsset"
                @click.prevent="editPodcast(podcast)"
              />
            </div>
            <div class="rss">
              <Icon
                :icon="rssHighlightAsset"
                :icon-hover="rssAsset"
                @click.prevent="openRssFeed(podcast.id, podcastRssFeedUrl(podcast))"
              />
            </div>
            <div class="delete">
              <Icon
                :disabled="all.length == 1"
                :icon="deleteHighlightAsset"
                :icon-hover="deleteAsset"
                @click.prevent="deletePodcast(podcast)"
              />
            </div>
            <div class="podcast-title">
              {{ podcast.title }}
            </div>
          </div>
        </fieldset>
      </form>
    </div>
    <div v-else>
      <PodcastsEditor
        :podcast="draftPodcast!"
        :podcast-id="draftPodcast!.id"
        @done="onEditorDone"
      />
    </div>
  </EntityViewDecorator>
</template>

<style>
.id-column {
  font-weight: normal;
}

.rss {
  grid-area: rss;
}

.episodes {
  grid-area: episodes;
  padding-left: var(--gutter-space);
}

.created-column {
  grid-area: created;
  padding-left: var(--gutter-space);
}

.id-column b {
  font-weight: bold;
  font-size: var(--font-size-base);
}

.delete {
  grid-area: delete;
}

.podcast-title {
  grid-area: podcast-title;
}

.podcasts-row {
  padding-bottom: var(--gutter-space);
  grid-template-rows: minmax(var(--row-height), auto) auto;
  border-top: 1px solid black;
  display: grid;
  grid-column-gap: var(--gutter-space);
  grid-template-areas:
    'podcast-title podcast-title podcast-title podcast-title podcast-title podcast-title '
    'id edit delete rss episodes created';
  grid-template-columns: var(--id-column) var(--icon-column) var(--icon-column) var(--icon-column) 8em auto;
}
</style>
<script lang="ts" setup>
import editHighlightAsset from '@/assets/images/edit-highlight.png'
import editAsset from '@/assets/images/edit.png'
import { useRouter } from 'vue-router'

import { loadNotesForNotable, mogul, Podcast, podcasts, utils } from '@/services'
import { apiUrl } from '@/config'
import { dateTimeToString } from '@/dates'
import { onMounted, ref } from 'vue'
import Icon from '@/ui/Icon.vue'

import rssHighlightAsset from '@/assets/images/rss-highlight.png'
import rssAsset from '@/assets/images/rss.png'

import deleteHighlightAsset from '@/assets/images/delete-highlight.png'
import deleteAsset from '@/assets/images/delete.png'
import PodcastsEditor from '@/podcasts/PodcastsEditor.vue'
import { useI18n } from 'vue-i18n'
import EntityViewDecorator from '@/ui/EntityViewDecorator.vue'

import segmentAsset from '@/assets/images/entity-badges/segment-icon.png'
import plusIconHighlight from '@/assets/images/plus-icon-highlight.png'
import plusIcon from '@/assets/images/plus-icon.png'

const router = useRouter()
const title = ref<string>('')
const all = ref<Array<Podcast>>([])

const draftPodcast = ref<Podcast>()

const editorVisible = ref(false)

const mogulId = ref<number>(0)
const mogulName = ref<string>('')
const { t } = useI18n()

async function refresh() {
  all.value = await podcasts.podcasts()
}

function dts(date: number) {
  return dateTimeToString(date)
}

async function deletePodcast(podcast: Podcast) {
  const msg = t('confirm.deletion', { title: podcast.title })

  if (!utils.confirmDeletion(msg)) {
    return
  }

  await podcasts.deletePodcast(podcast.id)
  await refresh()
}

async function navigateToEpisodesPageForPodcast(podcastId: number) {
  await router.push({
    name: 'podcasts/episodes',
    params: { podcastId: podcastId }
  })
}

function podcastRssFeedUrl(podcast: Podcast) {
  const api = apiUrl()
  return (
    api + '/public/feeds/moguls/' + mogulId.value + '/podcasts/' + podcast.id + '/episodes.atom'
  )
}

function openRssFeed(podcastId: number, url: string) {
  window.open(url, 'rssWindowForPodcastNo' + podcastId)
}

async function createPodcast() {
  const p = await podcasts.create(title.value)
  await editPodcast(p)
}

async function editPodcast(podcast: Podcast) {
  draftPodcast.value = podcast
  title.value = podcast.title
  editorVisible.value = true
  await loadNotesForNotable('podcast', podcast.id, podcast.title)
}

async function onEditorDone() {
  editorVisible.value = false
  await refresh()
}

onMounted(async () => {
  const user = await mogul.user()
  mogulName.value = user.givenName + ' ' + user.familyName
  mogulId.value = user.id
  editorVisible.value = false
  await refresh()
})
</script>
