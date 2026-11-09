<!--
  search, from anywhere: a dialog opened by the search button in the top bar, by ⌘K (Ctrl+K
  off a Mac), or by / when focus isn't in a field. it offers, in order:

  - searching everything for what you typed, on the search page. it comes first so that
    typing and pressing enter does what the old search box did
  - the studio's sections whose names match, so settings and jobs, which no longer have
    icons of their own in the bar, are a keystroke away
  - live results as you type, which open the thing they found

  the list is a combobox's listbox: focus stays in the field, the arrow keys move the
  active option, enter chooses it. a native <dialog> gives the rest - the top layer, a
  focus trap, escape to close, and focus handed back to wherever it was.
-->
<template>
  <dialog
    ref="dialog"
    class="search-palette"
    :aria-label="t('search.palette.label')"
    @close="onClosed"
  >
    <div class="palette-field">
      <Icon :icon="searchIconAsset" :icon-hover="searchIconAsset" alt="" class="palette-glass" />
      <input
        ref="input"
        v-model="term"
        type="text"
        class="palette-input"
        role="combobox"
        aria-expanded="true"
        aria-autocomplete="list"
        autocomplete="off"
        spellcheck="false"
        :aria-controls="listId"
        :aria-activedescendant="activeOption?.id"
        :aria-label="t('search.palette.label')"
        :placeholder="t('search.palette.placeholder')"
        @keydown="onKeydown"
      />
      <kbd class="palette-key" aria-hidden="true">esc</kbd>
    </div>

    <div
      :id="listId"
      class="palette-results"
      role="listbox"
      :aria-label="t('search.palette.label')"
    >
      <template v-for="group in groups" :key="group.key">
        <div class="palette-group-label" aria-hidden="true">{{ group.label }}</div>
        <div role="group" :aria-label="group.label">
          <!-- options in a combobox's list are never focused: focus stays in the field,
               which takes the keys and points at the active option with
               aria-activedescendant. a click is the pointer's way to pick one. -->
          <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/interactive-supports-focus -->
          <div
            v-for="option in group.options"
            :id="option.id"
            :key="option.id"
            role="option"
            class="palette-option"
            :aria-selected="option.index === active"
            @pointermove="active = option.index"
            @click="choose(option)"
          >
            <Icon
              :icon="option.icon"
              :icon-hover="option.icon"
              alt=""
              class="palette-option-icon"
            />
            <span class="palette-option-label">{{ option.label }}</span>
            <span v-if="option.hint" class="palette-option-hint">{{ option.hint }}</span>
          </div>
        </div>
      </template>
    </div>

    <div class="palette-foot">
      <span class="palette-status" role="status">{{ status }}</span>
      <span class="palette-keys" aria-hidden="true">
        <span
          ><kbd class="palette-key">↑</kbd><kbd class="palette-key">↓</kbd>
          {{ t('search.palette.move') }}</span
        >
        <span><kbd class="palette-key">↵</kbd> {{ t('search.palette.choose') }}</span>
        <span><kbd class="palette-key">esc</kbd> {{ t('search.palette.close') }}</span>
      </span>
    </div>
  </dialog>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, useId, watch } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { search, type SearchableResult } from '@/services'
import { sections } from '@/layout/sections'
import Icon from '@/ui/Icon.vue'

import searchIconAsset from '@/assets/images/icons/search.svg'
import podcastIconAsset from '@/assets/images/icons/podcast.svg'
import postIconAsset from '@/assets/images/icons/rss.svg'
import noteIconAsset from '@/assets/images/icons/notes.svg'

const { t } = useI18n()
const router = useRouter()

const dialog = ref<HTMLDialogElement>()
const input = ref<HTMLInputElement>()
const listId = `palette-${useId()}`

const term = ref('')
const active = ref(0)
const results = ref<SearchableResult[]>([])
const searching = ref(false)

// live results wait for a pause in the typing, and only the latest search's answer counts
const debounceMillis = 200
const resultLimit = 8
const minimumTermLength = 2
let timer: ReturnType<typeof setTimeout> | undefined
let latest = 0

interface Option {
  id: string
  index: number
  label: string
  hint?: string
  icon: string
  to: () => RouteLocationRaw
}

interface Group {
  key: string
  label: string
  options: Option[]
}

const iconForType: Record<string, string> = {
  episode: podcastIconAsset,
  segment: podcastIconAsset,
  post: postIconAsset,
  note: noteIconAsset
}

const groups = computed<Group[]>(() => {
  const q = term.value.trim()
  const lower = q.toLowerCase()
  const found: Group[] = []

  if (q) {
    found.push({
      key: 'everything',
      label: t('search.palette.label'),
      options: [
        {
          id: `${listId}-everything`,
          index: 0,
          label: t('search.palette.everything', { term: q }),
          icon: searchIconAsset,
          to: () => ({ name: 'search', query: { query: q } })
        }
      ]
    })
  }

  const matching = sections.filter((s) => !q || t(s.label).toLowerCase().includes(lower))
  if (matching.length) {
    found.push({
      key: 'go-to',
      label: t('search.palette.go-to'),
      options: matching.map((s) => ({
        id: `${listId}-section-${s.key}`,
        index: 0,
        label: t(s.label),
        icon: s.icon,
        to: s.to
      }))
    })
  }

  if (q && results.value.length) {
    found.push({
      key: 'results',
      label: t('search.palette.results'),
      options: results.value.slice(0, resultLimit).map((r) => ({
        id: `${listId}-result-${r.searchableId}`,
        index: 0,
        label: r.title,
        hint: t(`search.palette.types.${r.type}`),
        icon: iconForType[r.type] ?? noteIconAsset,
        to: () => {
          const context = r.contextMap
          return { name: 'entity', params: { id: context.get('id'), type: context.get('type') } }
        }
      }))
    })
  }

  // number the options in the order they're drawn, which is the order the arrows walk
  let index = 0
  for (const group of found) for (const option of group.options) option.index = index++
  return found
})

const options = computed(() => groups.value.flatMap((g) => g.options))
const activeOption = computed(() => options.value[active.value])

const status = computed(() => {
  const q = term.value.trim()
  if (q.length < minimumTermLength) return ''
  if (searching.value && !results.value.length) return t('search.palette.searching')
  if (!searching.value && !results.value.length) return t('search.palette.nothing', { term: q })
  return ''
})

watch(term, (value) => {
  active.value = 0
  clearTimeout(timer)
  const q = value.trim()
  if (q.length < minimumTermLength) {
    latest++
    results.value = []
    searching.value = false
    return
  }
  searching.value = true
  timer = setTimeout(() => runSearch(q), debounceMillis)
})

async function runSearch(q: string) {
  const mine = ++latest
  let found: SearchableResult[] = []
  try {
    found = await search.search(q)
  } catch (e) {
    console.error('search failed', e)
  }
  if (mine !== latest) return
  results.value = found
  searching.value = false
}

// keep the active option in view as the arrows walk past the edge of the list
watch(active, async () => {
  await nextTick()
  const id = activeOption.value?.id
  if (id) document.getElementById(id)?.scrollIntoView({ block: 'nearest' })
})

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing) return
  const count = options.value.length
  if (event.key === 'ArrowDown' && count) {
    event.preventDefault()
    active.value = (active.value + 1) % count
  } else if (event.key === 'ArrowUp' && count) {
    event.preventDefault()
    active.value = (active.value - 1 + count) % count
  } else if (event.key === 'Enter') {
    event.preventDefault()
    if (activeOption.value) choose(activeOption.value)
  }
}

async function choose(option: Option) {
  const destination = option.to()
  close()
  await router.push(destination)
}

function open() {
  const element = dialog.value
  if (!element || element.open) return
  element.showModal()
  input.value?.focus()
}

function close() {
  dialog.value?.close()
}

function toggle() {
  if (dialog.value?.open) close()
  else open()
}

// however it closes (escape, a choice, a click outside), it opens fresh next time
function onClosed() {
  clearTimeout(timer)
  latest++
  term.value = ''
  results.value = []
  searching.value = false
  active.value = 0
}

// the dialog is exactly the size of the palette, so a click that lands on the dialog
// itself rather than something in it was on the backdrop around it
function onDialogClick(event: MouseEvent) {
  if (event.target === dialog.value) close()
}

function isEditable(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false
  return (
    element.isContentEditable ||
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT'
  )
}

function onDocumentKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    toggle()
  } else if (
    event.key === '/' &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !isEditable(event.target)
  ) {
    event.preventDefault()
    open()
  }
}

// a click outside is a pointer's shortcut for escape, so it's listened for here rather
// than as a template click handler on the dialog, which would read as a control
onMounted(() => {
  document.addEventListener('keydown', onDocumentKeydown)
  dialog.value?.addEventListener('click', onDialogClick)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
  dialog.value?.removeEventListener('click', onDialogClick)
  clearTimeout(timer)
})

defineExpose({ open, close, toggle })
</script>

<style scoped>
.search-palette {
  width: min(40rem, calc(100vw - 2 * var(--gutter-space)));
  max-width: none;
  max-height: calc(100dvh - 2 * var(--gutter-space));
  margin: min(12vh, 6rem) auto auto;
  padding: 0;
  border: 0;
  border-radius: calc(1.5 * var(--radius));
  overflow: hidden;
  background-color: var(--raised-color);
  color: var(--ink-color);
  box-shadow: var(--box-shadow);
  --icon-paper-color: var(--raised-color);
}

.search-palette[open] {
  display: flex;
  flex-direction: column;
}

.search-palette::backdrop {
  background-color: rgb(5 10 20 / 45%);
}

.palette-field {
  display: flex;
  align-items: center;
  gap: var(--gutter-space);
  padding: 0 var(--gutter-space);
  border-bottom: 1px solid var(--rule-color);
}

.palette-glass {
  width: 1.25rem;
  flex: none;
  cursor: default;
  color: var(--muted-color);
}

/* the field is the whole top of the palette, so it needs no box of its own; the caret
   and the palette being open are what says it has focus */
.search-palette .palette-input {
  flex: 1;
  min-width: 0;
  height: 3.5rem;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  outline: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: var(--font-size-lg);
}

.palette-key {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  line-height: 1;
  padding: 0.25em 0.4em;
  border-radius: 0.3em;
  border: 1px solid var(--rule-color);
  background-color: var(--hover-tint);
  color: var(--muted-color);
}

.palette-results {
  flex: 1;
  min-height: 0;
  max-height: 24rem;
  overflow-y: auto;
  padding: var(--gutter-space-half);
}

.palette-results:empty {
  display: none;
}

.palette-group-label {
  padding: var(--gutter-space-half) var(--gutter-space-half) var(--gutter-space-third);
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted-color);
}

.palette-option {
  display: flex;
  align-items: center;
  gap: var(--gutter-space);
  padding: var(--gutter-space-half);
  border-radius: var(--radius);
  cursor: pointer;
}

.palette-option[aria-selected='true'] {
  background-color: var(--accent-color);
  color: var(--accent-ink-color);
  --icon-paper-color: var(--accent-color);
}

.palette-option-icon {
  width: 1.125rem;
  flex: none;
  color: var(--muted-color);
}

.palette-option[aria-selected='true'] .palette-option-icon,
.palette-option[aria-selected='true'] .palette-option-hint {
  color: inherit;
}

.palette-option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.palette-option-hint {
  font-size: var(--font-size-xs);
  color: var(--muted-color);
}

.palette-foot {
  display: flex;
  align-items: center;
  gap: var(--gutter-space);
  padding: var(--gutter-space-half) var(--gutter-space);
  border-top: 1px solid var(--rule-color);
  font-size: var(--font-size-xs);
  color: var(--muted-color);
}

.palette-status {
  flex: 1;
}

.palette-keys {
  display: flex;
  gap: var(--gutter-space);
}

.palette-keys > span {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
}

/* a phone has no arrow keys to explain */
@media (pointer: coarse) {
  .palette-keys,
  .palette-field .palette-key {
    display: none;
  }
}
</style>
