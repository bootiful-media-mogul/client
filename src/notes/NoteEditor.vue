<script setup lang="ts">
import deleteAsset from '@/assets/images/icons/delete.svg'
import Icon from '@/ui/Icon.vue'
import editAsset from '@/assets/images/icons/edit.svg'
import { dateTimeToString } from '@/dates'
import { notes } from '@/services'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emit = defineEmits<{
  deleted: [id: number, type: string]
  doneChanged: [id: number, type: string]
  update: [id: number, type: string]
}>()

async function deleteNote() {
  await notes.deleteNote(props.id)
  emit('deleted', props.id, props.type)
}

async function setDone(event: Event) {
  const done = (event.target as HTMLInputElement).checked
  await notes.setNoteDone(props.id, done)
  emit('doneChanged', props.id, props.type)
}

const props = defineProps<{
  id: number
  note: string
  created: string | number
  done: string | null
  type: string
}>()
</script>

<template>
  <div class="note" :class="{ done: done !== null }">
    <div class="created-column">{{ dateTimeToString(created) }}</div>
    <div class="note-text">
      {{ note }}
    </div>
    <div class="note-controls">
      <input
        class="done-checkbox"
        type="checkbox"
        :checked="done !== null"
        :title="t('notes.done')"
        :aria-label="t('notes.done')"
        @change="setDone"
      />
      <Icon
        :alt="t('icons.edit-note')"
        highlight="hover"
        :icon="editAsset"
        :icon-hover="editAsset"
        @click.prevent="$emit('update', id, type)"
      />
      <Icon
        :alt="t('icons.delete-note')"
        highlight="hover"
        @click.prevent="deleteNote"
        :icon="deleteAsset"
        :icon-hover="deleteAsset"
        class="delete-icon"
      />
    </div>
  </div>
</template>

<style scoped>
.note {
  padding-bottom: var(--gutter-space-half);
  display: grid;
  grid-template-areas:
    ' created '
    ' note-text '
    ' buttons ';

  .created-column {
    padding-top: var(--gutter-space-half);
    padding-bottom: calc(var(--gutter-space) / 2);
    font-size: var(--font-size-sm);
    text-align: right;
  }
  .note-text {
    hyphens: auto;

    grid-area: note-text;
  }
  &.done .note-text {
    opacity: 0.65;
    text-decoration: line-through;
  }
  .note-controls {
    padding-top: var(--gutter-space-half);
    padding-bottom: var(--gutter-space-half);
    grid-area: buttons;
    display: grid;
    grid-template-areas: 'done edit delete';
    grid-column-gap: var(--gutter-space-half);
    grid-template-columns: var(--icon-column) var(--icon-column) var(--icon-column);
    align-items: center;
  }
  .done-checkbox {
    grid-area: done;
    margin: 0;
  }
}
</style>
