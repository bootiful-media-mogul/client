<script lang="ts" setup>
import { computed, ref } from 'vue'
import ManagedFileComponent from '@/managedfiles/ManagedFileComponent.vue'
import PodcastEpisodeSegmentAudioEditor from '@/podcasts/segments/PodcastEpisodeSegmentAudioEditor.vue'
import Icon from '@/ui/Icon.vue'
import { durationToString } from '@/dates'

// files
import imageTypeIcon from '@/assets/images/files/image-file.png'
import mediaTypeIcon from '@/assets/images/files/music-file.png'
import upHighlightAsset from '@/assets/images/up-highlight.png'
import upAsset from '@/assets/images/up.png'
import downHighlightAsset from '@/assets/images/down-highlight.png'
import downAsset from '@/assets/images/down.png'
import deleteHighlightAsset from '@/assets/images/delete-highlight.png'
import deleteAsset from '@/assets/images/delete.png'
import transcriptHighlightAsset from '@/assets/images/transcript-highlight.png'
import transcriptAsset from '@/assets/images/transcript.png'
import audioEditorHighlightAsset from '@/assets/images/audio-editor-highlight.svg'
import audioEditorAsset from '@/assets/images/audio-editor.svg'

//
function fileTypeIconFor(type: string): string {
  const mapping = new Map(
    Object.entries({
      graphic: imageTypeIcon,
      audio: mediaTypeIcon
    })
  )
  return mapping.get(type)!!
}

interface Props {
  label: string
  managedFileId: number
  // the segment this row is, for the audio editor. the graphic row has none
  segmentId?: number
  accept: string
  showReorder?: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
  showDelete?: boolean
  showTranscript?: boolean
  showAudioEditor?: boolean
  order?: number
  type: string
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  showReorder: false,
  canMoveUp: false,
  canMoveDown: false,
  showDelete: false,
  showTranscript: false,
  showAudioEditor: false,
  order: 0,
  type: 'segment',
  duration: undefined
})

// when true, the audio editor replaces this row entirely
const editingAudio = ref(false)

const formattedDuration = computed(() => durationToString(props.duration))

const emit = defineEmits<{
  moveUp: []
  moveDown: []
  delete: []
  editTranscript: []
}>()
</script>
<template>
  <PodcastEpisodeSegmentAudioEditor
    v-if="editingAudio"
    :label="label"
    :segment-id="segmentId!"
    @close="editingAudio = false"
  />
  <div v-else class="row segment-row">
    <div class="type">
      <div class="segment-controls-icon">
        <Icon :icon-hover="fileTypeIconFor(props.type)" :icon="fileTypeIconFor(props.type)" />
      </div>
      <div class="segment-controls-label">{{ label }}</div>
    </div>
    <!-- Reorder arrows (if enabled) -->
    <div class="arrows">
      <Icon
        v-if="showReorder"
        class="up"
        :disabled="!canMoveUp"
        :icon="upHighlightAsset"
        :icon-hover="upAsset"
        @click.prevent="emit('moveUp')"
      />
      <Icon
        v-if="showReorder"
        class="down"
        :disabled="!canMoveDown"
        :icon="downHighlightAsset"
        :icon-hover="downAsset"
        @click.prevent="emit('moveDown')"
      />
    </div>
    <div class="managed-file-row">
      <ManagedFileComponent :managed-file-id="managedFileId" :accept="accept" />
    </div>
    <div class="buttons">
      <!-- File upload component -->

      <!-- Transcript action (if enabled) -->
      <div class="transcript-button">
        <Icon
          v-if="showTranscript"
          :icon="transcriptHighlightAsset"
          :icon-hover="transcriptAsset"
          class="transcript-icon"
          @click.prevent="emit('editTranscript')"
        />
      </div>

      <!-- Audio editor action (if enabled) -->
      <div class="audio-editor-button">
        <Icon
          v-if="showAudioEditor"
          :icon="audioEditorHighlightAsset"
          :icon-hover="audioEditorAsset"
          class="audio-editor-icon"
          @click.prevent="editingAudio = true"
        />
      </div>

      <div v-if="formattedDuration" class="duration" :title="formattedDuration">
        {{ formattedDuration }}
      </div>

      <!-- Delete action (if enabled) -->
      <div class="delete-button">
        <Icon
          :disabled="!showDelete"
          :icon="deleteHighlightAsset"
          :icon-hover="deleteAsset"
          class="delete-icon"
          @click.prevent="emit('delete')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.segment-row {
  padding: 0;
  background-color: var(--panel-bg-color);
  border-radius: var(--radius);
  margin-bottom: var(--gutter-space);
  display: grid;
  grid-template-columns: minmax(12vw, 130px) auto;
  overflow: hidden;
  grid-template-areas:
    '  type               arrows                       '
    '  managed-file-row   managed-file-row '
    '  buttons            buttons ';
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
    .segment-controls-label {
      grid-area: label;
      place-content: center;
    }
    .segment-controls-icon {
      grid-area: icon;
      padding-top: var(--radius);
      & img {
        filter: invert(1);
      }
    }
  }
  .buttons {
    border-top: 1px solid black;
    padding: var(--gutter-space-half);
    grid-area: buttons;
    display: grid;
    grid-template-areas: 'transcript-button audio-editor-button duration delete-button ';
    grid-template-columns: min-content min-content auto min-content;
    grid-gap: var(--gutter-space-half);
    align-items: center;
    .transcript-button {
      grid-area: transcript-button;
    }
    .audio-editor-button {
      grid-area: audio-editor-button;
    }
    .duration {
      grid-area: duration;
      place-self: center;
      font-size: var(--font-size-sm);
      font-variant-numeric: tabular-nums;
      color: var(--muted-color, inherit);
    }
    .delete-button {
      grid-area: delete-button;
    }
  }
  .managed-file-row {
    border-top: 1px solid black;

    grid-area: managed-file-row;
  }
  .arrows {
    grid-area: arrows;
    place-content: center;
    place-self: end;
    padding: var(--gutter-space-half);
    grid-gap: var(--gutter-space-half);
    .up {
      grid-area: up;
    }
    .down {
      grid-area: down;
    }
    display: grid;
    grid-template-areas: ' up down   ';
    grid-template-rows: min-content;
  }
}
</style>
