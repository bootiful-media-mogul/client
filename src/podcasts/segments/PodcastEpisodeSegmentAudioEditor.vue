<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { managedFiles } from '@/services'
import { useAudioPeaks } from '@/composables/useAudioPeaks'
import Icon from '@/ui/Icon.vue'
import TrackEditor from '@/podcasts/segments/TrackEditor.vue'
import closeAsset from '@/assets/images/panel-close.png'
import closeHighlightAsset from '@/assets/images/panel-close-highlight.png'
import audioEditorAsset from '@/assets/images/audio-editor.svg'

const { t } = useI18n()

const DEV_SAMPLE_AUDIO_URL = '/dev-sample-segment.mp3'

const props = defineProps<{
  readonly label: string
  readonly managedFileId: number
}>()

const emit = defineEmits<{
  close: []
}>()

const filename = ref<string>('')
const audioUrl = ref<string>('')
const { peaks, duration, loading, error, load } = useAudioPeaks()

const clip = computed(() => ({
  id: props.managedFileId,
  name: filename.value || props.label,
  duration: duration.value,
  audioUrl: audioUrl.value,
  waveform: peaks.value
}))
const ready = computed(() => !loading.value && !error.value && duration.value > 0)

onMounted(async () => {
  loading.value = true
  try {
    const managedFile = await managedFiles.managedFileById(props.managedFileId)
    filename.value = managedFile.filename
    // todo every segment loads the same local stand-in mp3 for now, so we can workshop
    //  the UI without worrying about how the real audio gets here. fetch() of the
    //  real file trips over CORS. download it with:
    //  curl -o client/public/dev-sample-segment.mp3 <any public mp3 url>
    audioUrl.value = DEV_SAMPLE_AUDIO_URL
    await load(DEV_SAMPLE_AUDIO_URL)
  } catch (e) {
    console.error("couldn't open the audio editor for managed file", props.managedFileId, e)
    error.value = e instanceof Error ? e.message : String(e)
    loading.value = false
  }
})

function onEdit(edit: any) {
  console.log('audio editor edit for managed file', props.managedFileId, edit)
}
</script>

<template>
  <div class="audio-editor-row">
    <div class="type">
      <div class="audio-editor-icon">
        <img :src="audioEditorAsset" alt="" />
      </div>
      <div class="audio-editor-label">{{ label }}</div>
    </div>
    <div class="close">
      <Icon
        :icon="closeAsset"
        :icon-hover="closeHighlightAsset"
        :alt="t('podcasts.episodes.episode.segments.audio-editor.close')"
        :title="t('podcasts.episodes.episode.segments.audio-editor.close')"
        @click.prevent="emit('close')"
      />
    </div>
    <div class="editor-body">
      <TrackEditor v-if="ready" :clip="clip" @edit="onEdit" />
      <div v-else-if="error" class="status error">
        {{ t('podcasts.episodes.episode.segments.audio-editor.error', { error }) }}
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
    'type     close'
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
  .close {
    grid-area: close;
    place-self: end;
    padding: var(--gutter-space-half);
  }
  .editor-body {
    grid-area: editor-body;
    border-top: 1px solid black;
    padding: var(--gutter-space-half);
    min-width: 0;
  }
  .status {
    padding: var(--gutter-space);
    font-size: var(--font-size-sm);
  }
}
</style>
