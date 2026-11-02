<script setup lang="ts">
import { onMounted, ref } from 'vue'
import NoteEditor from '@/notes/NoteEditor.vue'
import { events, mogul, Note, notes } from '@/services'
import InputWrapper from '@/ui/input/InputWrapper.vue'
import InputTools from '@/ui/InputTools.vue'
import { useI18n } from 'vue-i18n'
import plusIcon from '@/assets/images/icons/plus.svg'
import Icon from '@/ui/Icon.vue'

const { t } = useI18n()
const el = ref<HTMLElement>()

class UiNote {
  readonly id: number
  readonly note: string
  readonly type: string
  readonly created: string
  readonly done: string | null
  constructor(id: number, note: string, type: string, created: string, done?: string | null) {
    this.id = id
    this.note = note
    this.type = type
    this.created = created
    this.done = done ?? null
  }
}
const mogulName = ref<string>('')
const defaultId = -1
const mogulId = ref<number>(-1)
const noteText = ref<string>('')
const mogulNotes = ref<Array<UiNote>>([])
const entityNotes = ref<Array<UiNote>>([])
const noteId = ref<number>(defaultId)
const notableId = ref<number>(-1)
const type = ref<string>('mogul')
const entityLoaded = ref<boolean>(false)
const entityName = ref<string>('')
const noteTarget = ref<'mogul' | 'entity'>('mogul')
const showComposer = ref<boolean>(false)
const showDoneNotes = ref<boolean>(false)

function resultsToUiNotes(items: Array<Note>): Array<UiNote> {
  if (items && items.length > 0) {
    const arr: Array<UiNote> = []
    for (const item of items) {
      arr.push(new UiNote(item.id, item.note, item.type, item.created, item.done))
    }
    return arr
  }
  return []
}

async function loadIntoEditor(note: UiNote) {
  noteText.value = note.note
  noteId.value = note.id
  noteTarget.value = note.type === 'mogul' ? 'mogul' : 'entity'
  showComposer.value = true
}

async function saveEntityNote(notableId: number, type: string) {
  if (noteId.value > 0) {
    await notes.updateNote(noteId.value, noteText.value)
  } //
  else {
    await notes.createNote(type, notableId, noteText.value)
  }
  await reload()
  await clear()
}

async function expandIfNotesAvailable(): Promise<void> {
  if (
    (mogulNotes.value || entityNotes.value) &&
    (entityNotes.value.length > 0 || mogulNotes.value.length > 0)
  ) {
    // events.emit('sidebar-panel-opened', el.value)
  }
}

async function clear() {
  noteText.value = ''
  noteId.value = defaultId
  showComposer.value = false
}

function showComposerFor(target: 'mogul' | 'entity') {
  noteTarget.value = target
  showComposer.value = true
}

async function reload() {
  mogulNotes.value = resultsToUiNotes(
    await notes.notesForNotable(mogulId.value, 'mogul', showDoneNotes.value)
  )
  if (notableId.value > 0 && (type.value + '').trim() !== '') {
    entityNotes.value = resultsToUiNotes(
      await notes.notesForNotable(notableId.value, type.value, showDoneNotes.value)
    )
  }
  await expandIfNotesAvailable()
}

async function notesForNotableEventHandler(event: any) {
  notableId.value = event.notableId as number
  entityName.value = event.entityName as string
  type.value = event.type as string
  entityLoaded.value = true
  await reload()
}

onMounted(async () => {
  const m = await mogul.user()
  mogulName.value = m.givenName
  mogulId.value = m.id

  events.on('reset-notes-for-notable-event', async (event: any) => {
    notableId.value = -1
    type.value = 'mogul'
    entityNotes.value = []
    entityLoaded.value = false
    showComposer.value = false
    // Reload mogul notes to keep them fresh
    mogulNotes.value = resultsToUiNotes(
      await notes.notesForNotable(mogulId.value, 'mogul', showDoneNotes.value)
    )
  })

  events.on('notes-for-notable-event', notesForNotableEventHandler)

  // Load mogul notes on initial mount
  await reload()
})
</script>
<template>
  <form ref="el" class="pure-form pure-form-stacked">
    <fieldset>
      <!-- Composition panel - hidden by default -->
      <div v-if="showComposer" class="note-composition">
        <div class="pure-control-group">
          <label for="note">
            {{
              t('notes.new.prompt', {
                entityName: noteTarget === 'entity' ? entityName : mogulName
              })
            }}
          </label>

          <InputWrapper v-model="noteText">
            <textarea id="transcript" v-model="noteText" required rows="10" />
            <InputTools v-model="noteText" />
          </InputWrapper>
        </div>
        <div>
          <span class="save">
            <button
              :class="'pure-button pure-button-primary '"
              type="submit"
              @click.prevent="
                noteTarget === 'entity'
                  ? saveEntityNote(notableId, type)
                  : saveEntityNote(mogulId, 'mogul')
              "
              :disabled="noteText.length === 0"
            >
              {{ t('notes.buttons.save') }}
            </button>
          </span>
          <span class="cancel">
            <button
              :class="'pure-button '"
              :disabled="noteText.length === 0"
              type="submit"
              @click.prevent="clear"
            >
              {{ t('transcripts.buttons.cancel') }}
            </button>
          </span>
        </div>
      </div>
      <!-- Always show mogul notes section -->
      <div class="existing-notes">
        <label class="notes-filter">
          <input v-model="showDoneNotes" type="checkbox" @change="reload" />
          <span>{{ t('notes.filters.show-done') }}</span>
        </label>
        <div class="panel-menu-subtitle notes-section section-header">
          <span>{{ t('notes.system-wide.title') }}</span>
          <Icon
            highlight="hover"
            :icon-hover="plusIcon"
            :icon="plusIcon"
            @click="showComposerFor('mogul')"
          />
        </div>
        <div class="note" v-for="note in mogulNotes" :key="note.id">
          <NoteEditor
            :created="note.created"
            :done="note.done"
            :id="note.id"
            :note="note.note"
            :type="note.type"
            @deleted="reload"
            @done-changed="reload"
            @update="loadIntoEditor(note)"
          />
        </div>
      </div>

      <!-- Show entity-specific notes section when on entity page -->
      <div class="entity-notes" v-if="entityLoaded">
        <div class="panel-menu-subtitle notes-section section-header">
          <span class="notes-section-title">{{
            t('notes.entity.title', { entityName: entityName })
          }}</span>

          <Icon
            highlight="hover"
            :icon-hover="plusIcon"
            :icon="plusIcon"
            @click="showComposerFor('entity')"
          />
        </div>
        <div class="note" v-for="note in entityNotes" :key="note.id">
          <NoteEditor
            :created="note.created"
            :done="note.done"
            :id="note.id"
            :note="note.note"
            :type="note.type"
            @deleted="reload"
            @done-changed="reload"
            @update="loadIntoEditor(note)"
          />
        </div>
      </div>
    </fieldset>
  </form>
</template>

<style scoped>
.note {
  border-top: 1px solid black;
}
.note:first-of-type {
  border-top: none;
}
.notes-section {
  padding-top: var(--gutter-space-half);
  padding-bottom: var(--gutter-space-half);
}

.notes-filter {
  display: inline-flex;
  align-items: center;
  gap: var(--gutter-space-half);
  padding-bottom: var(--gutter-space-half);
  font-size: var(--font-size-sm);
}

.note-composition {
  padding-bottom: var(--gutter-space);
  border-bottom: 2px solid rgba(0, 0, 0, 0.2);
  margin-bottom: var(--gutter-space);
}

.section-header {
  display: grid;
  grid-template-columns: auto var(--gutter-space) min-content;
  grid-template-areas: 'title . plus-button';
  align-items: center;
}
.notes-section-title {
  grid-area: title;
}
.plus-button {
  grid-area: plus-button;
}
</style>
