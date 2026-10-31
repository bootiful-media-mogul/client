<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  type KeptRange,
  type Notification,
  podcasts,
  previewManagedFile,
  type SegmentFilters
} from '@/services'
import { type Detections, removals } from '@/podcasts/segments/segmentCuts'
import { loadAudio, loadWaveform, type Waveform } from '@/composables/segmentAudio'
import { useNotificationListeners } from '@/composables/useNotificationListeners'
import Icon from '@/ui/Icon.vue'
import TrackEditor from '@/podcasts/segments/TrackEditor.vue'
import closeAsset from '@/assets/images/panel-close.png'
import closeHighlightAsset from '@/assets/images/panel-close-highlight.png'
import audioEditorAsset from '@/assets/images/audio-editor.svg'

const { t } = useI18n()
const { listenForCategory } = useNotificationListeners()

const props = defineProps<{
  readonly label: string
  readonly segmentId: number
}>()

const emit = defineEmits<{
  close: []
}>()

type Phase = 'loading' | 'no-audio' | 'drawing' | 'ready' | 'error'

const phase = ref<Phase>('loading')
const error = ref('')
const filename = ref('')
const audioUrl = ref('')
const waveform = ref<Waveform | null>(null)
const savedKept = ref<Array<KeptRange> | null>(null)
const editor = ref<InstanceType<typeof TrackEditor> | null>(null)
// edited since the last save
const dirty = ref(false)
const saving = ref(false)
// the save went through and the processors are rendering the produced audio
const rendering = ref(false)
const status = ref('')
// the rendered segment, what the episode will actually contain. the editor itself plays
// the upload and skips the cuts; this is the real thing.
const producedAudioId = ref<number | null>(null)
const producedAudioWritten = ref(false)
let waveformRequested = false
// the automatic cuts: only once the audio has been cleaned and analysed
const cleaned = ref(false)
const cleaningError = ref<string | null>(null)
const detections = ref<Detections | null>(null)
const filters = ref<SegmentFilters | null>(null)
const restored = ref<Set<string>>(new Set())

// what the automatic cuts would take out, drawn on the clips; restored ones too, so they
// can be cut again
const marks = computed(() => {
  if (!detections.value || !filters.value) return []
  return removals(detections.value, filters.value, new Set()).map((removal) => ({
    id: removal.id,
    start: removal.start / 1000,
    end: removal.end / 1000,
    kind: t('podcasts.episodes.episode.segments.audio-editor.marks.' + removal.kind),
    active: !restored.value.has(removal.id)
  }))
})

function toggleMark(id: string) {
  const next = new Set(restored.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  restored.value = next
  changed()
}

function changed() {
  dirty.value = true
  status.value = ''
}

const clip = computed(() => ({
  id: props.segmentId,
  name: filename.value || props.label,
  duration: waveform.value?.durationSeconds ?? 0,
  audioUrl: audioUrl.value,
  waveform: waveform.value?.peaks ?? [],
  kept: savedKept.value?.map((range) => ({ start: range.start / 1000, end: range.end / 1000 }))
}))

async function load() {
  try {
    const segment = await podcasts.podcastEpisodeSegmentById(props.segmentId)
    filename.value = segment.audio.filename
    producedAudioId.value = segment.producedAudio?.id ?? null
    producedAudioWritten.value = segment.producedAudio?.written ?? false
    if (!segment.audio.written) {
      phase.value = 'no-audio'
      return
    }
    if (!segment.waveform?.written) {
      // uploads draw their own; this is for segments from before they did, or an upload
      // whose waveform is still being drawn. either way the notification reloads us.
      phase.value = 'drawing'
      if (!waveformRequested) {
        waveformRequested = true
        await podcasts.requestPodcastEpisodeSegmentWaveform(props.segmentId)
      }
      return
    }
    // once it's been cleaned, the cleaned audio is what gets rendered, so it's what plays
    const playing = segment.cleaned && segment.cleanedAudio ? segment.cleanedAudio : segment.audio
    const [drawn, audio] = await Promise.all([
      loadWaveform(segment.waveform.url),
      loadAudio(playing.url)
    ])
    if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
    waveform.value = drawn
    audioUrl.value = audio
    savedKept.value = segment.edits ?? null
    cleaned.value = !!segment.cleaned
    cleaningError.value = segment.cleaningError ?? null
    detections.value = segment.cleaned && segment.detections ? JSON.parse(segment.detections) : null
    filters.value = segment.filters ?? null
    restored.value = new Set(segment.restored ?? [])
    phase.value = 'ready'
  } catch (e) {
    console.error("couldn't open the audio editor for podcast episode segment", props.segmentId, e)
    error.value = e instanceof Error ? e.message : String(e)
    phase.value = 'error'
  }
}

function isThisSegment(notification: Notification) {
  return '' + JSON.parse(notification.context)['segmentId'] === '' + props.segmentId
}

listenForCategory('audio-waveform-computed-event', async (notification: Notification) => {
  if (!isThisSegment(notification) || phase.value !== 'drawing') return
  const outcome = JSON.parse(notification.context)
  if (outcome['success'] === false) {
    error.value = outcome['error']
    phase.value = 'error'
    return
  }
  await load()
})

listenForCategory('media-normalized-event', async (notification: Notification) => {
  if (!isThisSegment(notification) || !rendering.value) return
  rendering.value = false
  producedAudioWritten.value = true
  status.value = t('podcasts.episodes.episode.segments.audio-editor.saved')
})

listenForCategory('media-normalization-failed-event', async (notification: Notification) => {
  if (!isThisSegment(notification) || !rendering.value) return
  rendering.value = false
  status.value = t('podcasts.episodes.episode.segments.audio-editor.render-failed', {
    error: JSON.parse(notification.context)['error']
  })
})

/**
 * the editor's ranges in whole milliseconds, or null when they amount to the whole file:
 * an edit that keeps everything is no edit, and the segment should say so.
 */
function keptForSaving(): Array<KeptRange> | null {
  const duration = waveform.value!.durationSeconds
  const kept = editor.value!.keptRanges().map((range) => ({
    start: Math.round(range.start * 1000),
    end: Math.round(range.end * 1000)
  }))
  const everything =
    kept.length === 1 && kept[0].start <= 10 && kept[0].end >= Math.round(duration * 1000) - 10
  return everything ? null : kept
}

async function save() {
  const kept = keptForSaving()
  saving.value = true
  status.value = t('podcasts.episodes.episode.segments.audio-editor.saving')
  try {
    await podcasts.editPodcastEpisodeSegment(
      props.segmentId,
      kept,
      cleaned.value ? filters.value : null,
      [...restored.value]
    )
    savedKept.value = kept
    dirty.value = false
    rendering.value = true
    status.value = t('podcasts.episodes.episode.segments.audio-editor.rendering')
  } catch (e) {
    console.error("couldn't save the edits to podcast episode segment", props.segmentId, e)
    status.value = t('podcasts.episodes.episode.segments.audio-editor.save-failed', {
      error: e instanceof Error ? e.message : String(e)
    })
  } finally {
    saving.value = false
  }
}

const canListen = computed(
  () => producedAudioId.value !== null && producedAudioWritten.value && !rendering.value
)

function listen() {
  if (canListen.value) previewManagedFile(producedAudioId.value!)
}

function onEdit(edit: { operation: string }) {
  console.log('audio editor edit for podcast episode segment', props.segmentId, edit)
  changed()
}

// the inputs are in seconds, which is how people think about pauses; filters are in ms
const silenceLongerThanSeconds = computed({
  get: () => (filters.value?.silenceLongerThan ?? 2000) / 1000,
  set: (seconds: number) => {
    filters.value = {
      ...filters.value!,
      silenceLongerThan: Math.round(Math.max(0.5, seconds) * 1000)
    }
    changed()
  }
})
const silenceLeaveSeconds = computed({
  get: () => (filters.value?.silenceLeave ?? 400) / 1000,
  set: (seconds: number) => {
    filters.value = { ...filters.value!, silenceLeave: Math.round(Math.max(0, seconds) * 1000) }
    changed()
  }
})

function setFilter(name: 'fillers' | 'stutters' | 'silences', on: boolean) {
  filters.value = { ...filters.value!, [name]: on }
  changed()
}

onMounted(load)
onBeforeUnmount(() => {
  if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
})
</script>

<template>
  <div class="audio-editor-row">
    <div class="type">
      <div class="audio-editor-icon">
        <img :src="audioEditorAsset" alt="" />
      </div>
      <div class="audio-editor-label">{{ label }}</div>
    </div>
    <div class="actions">
      <span class="save-status">{{ status }}</span>
      <a
        v-if="phase === 'ready'"
        href="#"
        :class="'mogul-icon preview-icon' + (canListen ? '' : ' disabled')"
        :title="t('podcasts.episodes.episode.segments.audio-editor.listen')"
        :aria-label="t('podcasts.episodes.episode.segments.audio-editor.listen')"
        @click.prevent="listen"
      ></a>
      <button
        v-if="phase === 'ready'"
        type="button"
        class="pure-button pure-button-primary"
        :disabled="!dirty || saving || rendering"
        @click="save"
      >
        {{ t('podcasts.episodes.episode.segments.audio-editor.save') }}
      </button>
      <Icon
        :icon="closeAsset"
        :icon-hover="closeHighlightAsset"
        :alt="t('podcasts.episodes.episode.segments.audio-editor.close')"
        :title="t('podcasts.episodes.episode.segments.audio-editor.close')"
        @click.prevent="emit('close')"
      />
    </div>
    <div class="editor-body">
      <div v-if="phase === 'ready' && cleaningError" class="status warning">
        {{
          t('podcasts.episodes.episode.segments.audio-editor.not-cleaned', {
            reason: cleaningError
          })
        }}
      </div>
      <div v-if="phase === 'ready' && cleaned && filters" class="filters">
        <label>
          <input
            type="checkbox"
            :checked="filters.fillers"
            @change="setFilter('fillers', ($event.target as HTMLInputElement).checked)"
          />
          {{ t('podcasts.episodes.episode.segments.audio-editor.filters.fillers') }}
        </label>
        <label>
          <input
            type="checkbox"
            :checked="filters.stutters"
            @change="setFilter('stutters', ($event.target as HTMLInputElement).checked)"
          />
          {{ t('podcasts.episodes.episode.segments.audio-editor.filters.stutters') }}
        </label>
        <label>
          <input
            type="checkbox"
            :checked="filters.silences"
            @change="setFilter('silences', ($event.target as HTMLInputElement).checked)"
          />
          {{ t('podcasts.episodes.episode.segments.audio-editor.filters.silences') }}
        </label>
        <label :class="{ muted: !filters.silences }">
          {{ t('podcasts.episodes.episode.segments.audio-editor.filters.longer-than') }}
          <input
            v-model.number="silenceLongerThanSeconds"
            type="number"
            min="0.5"
            step="0.5"
            class="seconds"
            :disabled="!filters.silences"
          />
        </label>
        <label :class="{ muted: !filters.silences }">
          {{ t('podcasts.episodes.episode.segments.audio-editor.filters.leave') }}
          <input
            v-model.number="silenceLeaveSeconds"
            type="number"
            min="0"
            step="0.1"
            class="seconds"
            :disabled="!filters.silences"
          />
        </label>
        <span class="filters-hint">
          {{ t('podcasts.episodes.episode.segments.audio-editor.filters.hint') }}
        </span>
      </div>
      <TrackEditor
        v-if="phase === 'ready'"
        ref="editor"
        :clip="clip"
        :marks="marks"
        @edit="onEdit"
        @toggle-mark="toggleMark"
      />
      <div v-else-if="phase === 'error'" class="status error">
        {{ t('podcasts.episodes.episode.segments.audio-editor.error', { error }) }}
      </div>
      <div v-else-if="phase === 'no-audio'" class="status">
        {{ t('podcasts.episodes.episode.segments.audio-editor.no-audio') }}
      </div>
      <div v-else-if="phase === 'drawing'" class="status">
        {{ t('podcasts.episodes.episode.segments.audio-editor.drawing') }}
      </div>
      <div v-else class="status">
        {{ t('podcasts.episodes.episode.segments.audio-editor.loading') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.audio-editor-row {
  padding: 0;
  background-color: var(--panel-bg-color);
  border-radius: var(--radius);
  margin-bottom: var(--gutter-space);
  display: grid;
  grid-template-columns: minmax(12vw, 130px) auto;
  overflow: hidden;
  grid-template-areas:
    'type        actions'
    'editor-body editor-body';
  .type {
    position: relative;
    font-size: var(--font-size-sm);
    grid-area: type;
    top: calc(var(--radius) * -1);
    background-color: black;
    color: white;
    border-bottom-right-radius: var(--radius);
    display: grid;
    grid-template-areas: 'icon label';
    grid-template-columns: min-content auto;
    grid-gap: var(--gutter-space-half);
    padding: var(--gutter-space-half);
    .audio-editor-label {
      grid-area: label;
      place-content: center;
    }
    .audio-editor-icon {
      grid-area: icon;
      padding-top: var(--radius);
      & img {
        width: var(--icon-width);
        filter: invert(1);
      }
    }
  }
  .actions {
    grid-area: actions;
    place-self: end;
    display: flex;
    align-items: center;
    gap: var(--gutter-space-half);
    padding: var(--gutter-space-half);
  }
  .save-status {
    font-size: var(--font-size-sm);
  }
  .editor-body {
    grid-area: editor-body;
    border-top: 1px solid black;
    min-width: 0;
  }
  .status {
    padding: var(--gutter-space);
    font-size: var(--font-size-sm);
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--gutter-space-half) var(--gutter-space);
    padding: var(--gutter-space-half) var(--gutter-space);
    border-bottom: 1px solid black;
    font-size: var(--font-size-sm);
    & label {
      display: inline-flex;
      align-items: center;
      gap: var(--gutter-space-third);
      font-weight: normal;
    }
    .muted {
      opacity: 0.5;
    }
    .seconds {
      width: 4.5em;
    }
    .filters-hint {
      color: #555;
    }
  }
}
</style>
