<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import {
  Composition,
  loadNotesForNotable,
  Notification,
  Podcast,
  PodcastEpisode,
  PodcastEpisodeSegment,
  podcasts,
  transcripts,
  utils
} from '@/services'
import { useI18n } from 'vue-i18n'
import EntityViewDecorator from '@/ui/EntityViewDecorator.vue'

import segmentAsset from '@/assets/images/entity-badges/segment-icon.png'

import { dateTimeToString, durationToString } from '@/dates'
import InputWrapper from '@/ui/input/InputWrapper.vue'
import InputTools from '@/ui/InputTools.vue'
import PodcastEpisodeSegmentEditor from '@/podcasts/PodcastEpisodeSegmentEditor.vue'
import CompositionComponent from '@/compositions/CompositionComponent.vue'
import PublicationsSectionComponent from '@/publications/PublicationsSectionComponent.vue'
import PodcastEpisodeBlogPost from '@/podcasts/publications/PodcastEpisodeBlogPost.vue'
import PodcastEpisodeAudioFile from '@/podcasts/publications/PodcastEpisodeAudioFile.vue'
import Podbean from '@/podcasts/publications/Podbean.vue'
import Ayrshare from '@/podcasts/publications/Ayrshare.vue'
import Mock from '@/podcasts/publications/Mock.vue'
import plusIconHighlight from '@/assets/images/plus-icon-highlight.png'
import plusIcon from '@/assets/images/plus-icon.png'
import Icon from '@/ui/Icon.vue'

import { useNotificationListeners } from '@/composables/useNotificationListeners'

const { listenForCategory } = useNotificationListeners()

const { t } = useI18n()

// Props
const props = defineProps<{
  podcastId: number
  episodeId: number
}>()

// State
const segments = ref<PodcastEpisodeSegment[]>([])
const created = ref<string | number>(-1)
// bound to the date picker; null until an episode is loaded
const createdDate = ref<Date | null>(null)
const draftEpisode = ref<PodcastEpisode>({} as PodcastEpisode)
const podcast = ref<Podcast>()
const podcastId = ref<number>(props.podcastId)
const episodeId = ref<number>(props.episodeId)
const publicationsDisabled = ref<boolean>(false)
// the render moved out of the api into the processors module, so publishing an
// episode whose segments have changed no longer blocks on ffmpeg -- it returns at
// once and the publication sits in draft until the render comes back. this is what
// says so, because otherwise those minutes look like nothing happening.
const producing = ref<boolean>(false)
const productionFailed = ref<boolean>(false)

onMounted(async () => {
  podcast.value = await podcasts.podcastById(podcastId.value)
  if (props.episodeId) {
    await loadEpisodeFromDbIntoEditor(episodeId.value)
  }
})

// title
const title = ref('')
const titleComposition = ref<Composition>()

// description
const description = ref('')
const descriptionComposition = ref<Composition>()
const dirtyKey = ref('')

const buttonsDisabled = computed(() => {
  let changed = false
  if (!draftEpisode.value.id) {
    const hasData = description.value.trim() !== '' && title.value.trim() !== ''
    if (hasData) {
      changed = true
    }
  } else {
    changed = dirtyKey.value !== computeDirtyKey()
  }
  return !changed
})

const loadEpisodeFromDbIntoEditor = async (episodeId: number): Promise<PodcastEpisode> => {
  const ep = await podcasts.podcastEpisodeById(episodeId)
  await loadEpisodeIntoEditor(ep)
  return ep
}

// Methods
const dts = (date: string | number): string | null => {
  return dateTimeToString(date)
}

const formattedEpisodeDuration = computed(() => durationToString(draftEpisode.value.duration))

const computeDirtyKey = (): string => {
  // the creation date is part of what Save persists, so editing it has to mark the
  // form dirty or the button stays disabled.
  const createdAt = createdDate.value ? createdDate.value.getTime() : ''
  return `${draftEpisode.value.id ? draftEpisode.value.id : ''}${description.value}:${
    title.value
  }:${createdAt}`
}

const loadEpisodeSegments = async (episode: PodcastEpisode) => {
  const ep = await podcasts.podcastEpisodeById(episode.id)
  if (ep?.segments?.length > 0) {
    segments.value = ep.segments
  }
}

const loadEpisodeIntoEditor = async (episode: PodcastEpisode) => {
  Object.assign(draftEpisode.value, episode)
  publicationsDisabled.value = !episode.complete
  description.value = episode.description
  title.value = episode.title
  created.value = episode.created
  createdDate.value = episode.created ? new Date(episode.created) : null
  segments.value = episode.segments
  descriptionComposition.value = episode.descriptionComposition
  titleComposition.value = episode.titleComposition
  dirtyKey.value = computeDirtyKey()

  await loadNotesForNotable('episode', episodeId.value, title.value)
}

async function editPodcastEpisodeSegmentTranscript(seg: PodcastEpisodeSegment) {
  const episode = await podcasts.podcastEpisodeById(draftEpisode.value.id)
  const match = episode.segments.filter((pes) => pes.id == seg.id)[0]
  transcripts.editTranscript(match.transcript.id, match.transcript.transcript)
}

const save = async () => {
  if (draftEpisode.value.id) {
    await podcasts.updatePodcastEpisode(
      draftEpisode.value.id,
      title.value,
      description.value,
      createdDate.value
    )
    await loadEpisodeIntoEditor(await podcasts.podcastEpisodeById(draftEpisode.value.id))
  } //
  else {
    const episode = await podcasts.createPodcastEpisodeDraft(
      parseInt(podcastId.value + ''),
      title.value,
      description.value
    )
    await loadEpisodeIntoEditor(await podcasts.podcastEpisodeById(episode.id))
  }
}

const cancel = async () => {
  Object.assign(draftEpisode, {} as PodcastEpisode)
  title.value = ''
  description.value = ''
  segments.value = []
  publicationsDisabled.value = true
}

// Segment Methods
const movePodcastEpisodeSegmentDown = async (
  episode: PodcastEpisode,
  episodeSegment: PodcastEpisodeSegment
) => {
  await podcasts.movePodcastEpisodeSegmentDown(episode.id, episodeSegment.id)
  await loadEpisodeSegments(episode)
}

const movePodcastEpisodeSegmentUp = async (
  episode: PodcastEpisode,
  episodeSegment: PodcastEpisodeSegment
) => {
  await podcasts.movePodcastEpisodeSegmentUp(episode.id, episodeSegment.id)
  await loadEpisodeSegments(episode)
}

const deletePodcastEpisodeSegment = async (
  episode: PodcastEpisode,
  episodeSegment: PodcastEpisodeSegment
) => {
  const segmentDetails = t('podcasts.episodes.segments.number', { id: episodeSegment.order })
  const msg = t('confirm.deletion', { title: segmentDetails })
  if (!utils.confirmDeletion(msg)) return

  publicationsDisabled.value = true
  await podcasts.deletePodcastEpisodeSegment(episodeSegment.id)
  await loadEpisodeSegments(episode)
}

const addNewPodcastEpisodeSegment = async (episode: PodcastEpisode) => {
  publicationsDisabled.value = true
  await podcasts.createPodcastEpisodeSegment(episode.id)
  await loadEpisodeSegments(episode)
}

// Arrow Classes
const downArrowDisabled = (_: PodcastEpisode, segment: PodcastEpisodeSegment) => {
  if (!segments.value || segments.value.length === 0) return true
  // Check if this is the last segment by order (largest order number)
  const maxOrder = Math.max(...segments.value.map((s) => s.order))
  return segment.order === maxOrder
}

const upArrowDisabled = (_: PodcastEpisode, segment: PodcastEpisodeSegment) => {
  if (!segments.value || segments.value.length === 0) return true
  // Check if this is the first segment by order (smallest order number)
  const minOrder = Math.min(...segments.value.map((s) => s.order))
  return segment.order === minOrder
}

// Lifecycle Hooks
onMounted(async () => {
  dirtyKey.value = computeDirtyKey()

  listenForCategory('podcast-episode-completed-event', async (evt) => {
    // the context carries episodeId and complete; `key` lives on the notification
    // itself, not inside its context, so reading ctx['key'] was always undefined and
    // this handler returned early every single time.
    const ctx = JSON.parse(evt.context)
    if ('' + ctx['episodeId'] !== '' + draftEpisode.value.id) {
      return
    }
    publicationsDisabled.value = ctx['complete'] === false
  })

  // a segment's audio is normalized on the server long after the upload returns, and
  // that's when its duration becomes known. the notification carries the duration
  // itself rather than telling us to re-fetch: the server writes the row and sends
  // this from two independent listeners on the same event, so a re-read could arrive
  // before the write.
  listenForCategory('media-normalized-event', async (evt: Notification) => {
    const ctx = JSON.parse(evt.context)
    if ('' + ctx['episodeId'] !== '' + draftEpisode.value.id) {
      return
    }
    const segment = segments.value.find((s) => '' + s.id === '' + ctx['segmentId'])
    if (!segment) {
      return
    }
    segment.duration = ctx['durationInMilliseconds']
    // the episode's duration is the sum of its segments', server-side too, so keep the
    // header in step without another round trip.
    draftEpisode.value.duration = segments.value.reduce((total, s) => total + (s.duration || 0), 0)
  })

  // both of these are keyed by episode id, and both arrive for every episode this
  // mogul has open anywhere, so check before believing them.
  listenForCategory('podcast-episode-render-started-event', async (evt: Notification) => {
    if ('' + evt.key !== '' + draftEpisode.value.id) return
    producing.value = true
    productionFailed.value = false
  })

  listenForCategory('podcast-episode-render-finished-event', async (evt: Notification) => {
    if ('' + evt.key !== '' + draftEpisode.value.id) return
    producing.value = false
    productionFailed.value = JSON.parse(evt.context)['success'] === false
    // the produced audio is a different file now, and the episode records when. reload
    // rather than patch: the publication that was waiting on this render is running
    // right now, and its outcome lands in the same view.
    await loadEpisodeFromDbIntoEditor(draftEpisode.value.id)
  })

  listenForCategory('publication-completed-event', async () => {
    await loadEpisodeFromDbIntoEditor(draftEpisode.value.id)
  })

  listenForCategory('publication-started-event', async (_: Notification) => {
    await loadEpisodeFromDbIntoEditor(draftEpisode.value.id)
  })
})
</script>
<template>
  <EntityViewDecorator :watermark-image="segmentAsset">
    <h1>
      {{ t('podcasts.episodes.episode') }}
    </h1>
    <form class="pure-form pure-form-stacked">
      <fieldset>
        <legend>
          <span v-if="title">
            {{ t('podcasts.episodes.episode.editing', { id: draftEpisode.id, title: title }) }}
          </span>
          <span v-else>
            {{ t('podcasts.episodes.new-episode') }}
          </span>
          <span v-if="draftEpisode.id"> ({{ dts(draftEpisode.created) }}) </span>
          <span v-if="draftEpisode.id && formattedEpisodeDuration" class="episode-duration">
            {{ formattedEpisodeDuration }}
          </span>
        </legend>
        <div class="form-section">
          <div class="form-section-title">{{ t('podcasts.episodes.basics') }}</div>
          <div class="form-row">
            <label for="episodeTitle">
              {{ t('podcasts.episodes.episode.title') }}
            </label>
            <InputWrapper v-model="title">
              <input id="episodeTitle" v-model="title" required type="text" />
              <InputTools v-model="title" />
            </InputWrapper>
          </div>

          <div class="form-row">
            <label for="episodeDescription">
              {{ t('podcasts.episodes.episode.description') }}
            </label>
            <InputWrapper v-model="description">
              <textarea id="episodeDescription" v-model="description" required rows="10" />
              <CompositionComponent
                v-if="descriptionComposition"
                :composition-id="parseInt(descriptionComposition.id + '')"
              />
              <InputTools v-model="description" />
            </InputWrapper>
          </div>

          <div v-if="draftEpisode.id" class="form-row">
            <label for="episodeCreated">
              {{ t('podcasts.episodes.episode.created') }}
            </label>
            <VDatePicker id="episodeCreated" v-model="createdDate" mode="dateTime" is24hr>
              <template #default="{ inputValue, inputEvents }">
                <input :value="inputValue" type="text" v-on="inputEvents" />
              </template>
            </VDatePicker>
          </div>

          <div>
            <button
              :disabled="buttonsDisabled"
              class="pure-button pure-button-primary"
              type="submit"
              @click.prevent="save"
            >
              {{ t('podcasts.episodes.buttons.save') }}
            </button>
            <button
              :disabled="description == '' && title == ''"
              class="pure-button pure-button-primary"
              type="submit"
              @click.prevent="cancel"
            >
              {{ t('podcasts.episodes.buttons.cancel') }}
            </button>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">{{ t('podcasts.episodes.segments') }}</div>
          <div class="toolbar">
            <Icon
              :icon-hover="plusIconHighlight"
              :icon="plusIcon"
              @click.prevent="addNewPodcastEpisodeSegment(draftEpisode)"
            />
          </div>

          <div v-if="draftEpisode">
            <!-- Graphic -->
            <PodcastEpisodeSegmentEditor
              v-if="draftEpisode.graphic"
              type="graphic"
              :order="0"
              :label="t('podcasts.episodes.episode.graphic')"
              :managed-file-id="draftEpisode.graphic.id"
              accept=".jpg,.jpeg,.png,image/jpeg,image/jpg,image/png"
            />

            <!-- Segments -->
            <PodcastEpisodeSegmentEditor
              v-for="segment in segments"
              :key="segment.id"
              :order="segment.order"
              type="audio"
              :label="t('podcasts.episodes.episode.segments.number', { order: segment.order })"
              :managed-file-id="segment.audio.id"
              :duration="segment.duration"
              accept=".mp3,audio/mpeg"
              show-reorder
              :can-move-up="!upArrowDisabled(draftEpisode, segment)"
              :can-move-down="!downArrowDisabled(draftEpisode, segment)"
              show-delete
              show-transcript
              @move-up="movePodcastEpisodeSegmentUp(draftEpisode, segment)"
              @move-down="movePodcastEpisodeSegmentDown(draftEpisode, segment)"
              @delete="deletePodcastEpisodeSegment(draftEpisode, segment)"
              @edit-transcript="editPodcastEpisodeSegmentTranscript(segment)"
            />
          </div>
          <div class="form-section-title">{{ t('podcasts.episodes.publications') }}</div>
          <div v-if="producing" class="production-status">
            {{ t('podcasts.episodes.publications.producing') }}
          </div>
          <div v-if="productionFailed" class="production-status production-status-failed">
            {{ t('podcasts.episodes.publications.production-failed') }}
          </div>
          <div class="publish-menu">
            <PublicationsSectionComponent
              v-if="draftEpisode.id"
              :disabled="publicationsDisabled"
              :publishable="draftEpisode.id + ''"
              :type="'episode'"
            >
              <Podbean />
              <Ayrshare />
              <PodcastEpisodeBlogPost />
              <PodcastEpisodeAudioFile />
              <Mock />
            </PublicationsSectionComponent>
          </div>
        </div>
      </fieldset>
    </form>
  </EntityViewDecorator>
</template>
<style>
.result-row {
  grid-template-areas: 'id edit delete created title';
  grid-template-columns:
    var(--id-column)
    var(--icon-column)
    var(--icon-column)
    var(--date-column)
    auto;
  display: grid;
  grid-template-rows: minmax(var(--row-height), auto);
}

.publish-menu button {
  grid-area: publish-button;
}

.publish-menu select {
  grid-area: publish-select;
}

fieldset.episodes-table {
  padding-bottom: calc(var(--footer-height) * 1);
}

.episode-duration {
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}

.production-status {
  margin-bottom: var(--gutter-space-half);
  padding: var(--gutter-space-half);
  border-radius: var(--radius);
  background-color: var(--panel-bg-color);
  font-size: var(--font-size-sm);
}

.production-status-failed {
  font-weight: bold;
}
</style>
