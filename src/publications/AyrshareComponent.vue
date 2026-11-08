<style scoped>
/* the composer: a list of every platform down the left, and the text for whichever row is
   open on the right. the open row is drawn in the editor's color and runs into it, which
   is what makes it read as a tab; a vertical list of thirteen never has to wrap. */
.ayrshare-composer {
  container: ayrshare-composer / inline-size;
  padding-bottom: var(--gutter-space);
  padding-top: var(--gutter-space);
}

.composer-body {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(13em, 17em) minmax(0, 1fr);
  margin-top: var(--gutter-space);
}

.platform-list {
  list-style: none;
  margin: 0;
  /* the list never reaches the editor's bottom corner, which is rounded; the open row
     only ever meets the editor's straight edge (or its squared-off top corner) */
  padding: 0 0 var(--radius);
}

.platform-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: var(--gutter-space-half);
  align-items: start;
  padding: var(--gutter-space-third) var(--gutter-space-half);
  border-radius: var(--radius) 0 0 var(--radius);
}

.platform-row:hover:not(.open) {
  background-color: var(--hover-tint);
}

.platform-row.open {
  background-color: var(--raised-color);
}

/* the hover tint takes the muted text just under 4.5:1 in the dark themes, so a hovered
   row's small print steps up to the label color */
.platform-row:hover:not(.open) .row-button .limit,
.platform-row:hover:not(.open) .row-button .status .shared {
  color: var(--label-color);
}

/* a platform's initials on its own color. the ring keeps the near-black ones (X, TikTok,
   Threads) from vanishing into the dark themes */
.badge {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 1.75em;
  height: 1.75em;
  border-radius: 0.4em;
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 0 0 1px var(--rule-color);
}

.platform-row .badge {
  grid-area: 1 / 1;
  margin-top: 0.1em;
}

.platform-row .row-button {
  grid-area: 1 / 2;
}

.badge-everywhere {
  background-color: var(--chrome-color);
  color: var(--chrome-ink-color);
  font-size: var(--font-size-base);
}

/* the picker: the dropdown, and the badges of what's picked beside it. it and the composer
   body under it are each their own stacking context, the picker on top, so nothing in the
   body (whose fields carry z-index 20 from base.css) can draw through the dropped-down
   list, whatever the dropdown's own z-index */
.platform-picker {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--gutter-space-half);
}

.picker-label {
  font-weight: bolder;
}

.picked-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gutter-space-third);
  list-style: none;
  margin: 0;
  padding: 0;
}

.picker-choices {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 18em;
}

.picker-choice {
  display: flex;
  align-items: center;
  gap: var(--gutter-space-half);
  cursor: pointer;
  padding: var(--gutter-space-third) var(--gutter-space-half);
  border-radius: calc(var(--radius) / 2);
}

.picker-choice:hover {
  background-color: var(--hover-tint);
}

.picker-choice .picker-name {
  flex: 1;
}

.picker-choice .limit {
  white-space: nowrap;
  color: var(--muted-color);
  font-size: var(--font-size-xs);
  font-family: var(--font-mono);
}

.row-button {
  /* a button, so undo what the browser and base.css give one */
  border: 0;
  margin: 0;
  padding: 0;
  background: none;
  color: inherit;
  font: inherit;
  line-height: inherit;
  text-align: left;
  cursor: pointer;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: var(--gutter-space-half);
  align-items: baseline;
}

.row-button .name {
  font-weight: 500;
}

.platform-row.open .row-button .name {
  font-weight: 700;
}

.row-button .limit {
  white-space: nowrap;
  color: var(--muted-color);
  font-size: var(--font-size-xs);
  font-family: var(--font-mono);
}

.row-button .status {
  grid-column: 1 / -1;
  font-size: var(--font-size-xs);
  color: var(--muted-color);
}

.row-button .status .own {
  color: var(--accent-color);
  font-weight: 600;
}

/* small type on the list's shaded background: the danger color alone falls just short of
   4.5:1 there, so it's pulled toward the ink (darker by day, lighter in the dark themes) */
.row-button .status .problem {
  color: color-mix(in srgb, var(--danger-color) 80%, var(--ink-color));
  font-weight: 600;
}

.composer-editor {
  /* border-box, so the height held across row switches (an offsetHeight) means the same
     thing as a min-height */
  box-sizing: border-box;
  background-color: var(--raised-color);
  border-radius: var(--radius);
  padding: var(--gutter-space) var(--gutter-space) 0;
  /* a textarea is min-width:auto otherwise, and pushes the editor wider than its column */
  min-width: 0;
}

/* when the first row is open, the editor's top corner squares off so the two join */
.composer-editor.joins-top {
  border-top-left-radius: 0;
}

.composer-status {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0 var(--gutter-space);
  margin-bottom: var(--gutter-space-half);
}

.composer-status p,
.composer-notes p {
  margin: 0;
}

.composer-status button {
  margin-top: 0;
}

.composer-notes {
  color: var(--muted-color);
  font-size: var(--font-size-sm);
  display: grid;
  gap: var(--gutter-space-third);
  padding-bottom: var(--gutter-space);
  /* the input wrapper's own bottom margin already spaces it from the notes */
  margin-top: calc(-1 * var(--gutter-space-half));
}

.composer-notes .over,
.composer-status .over {
  color: var(--danger-color);
  font-weight: 600;
}

/* a platform still showing the shared text: muted until it's edited, at which point the
   platform has text of its own and it reads like any other field */
.composer-editor textarea.inherited {
  color: var(--muted-color);
}

/* too narrow for two columns: the list goes on top and the editor under it */
@container ayrshare-composer (max-width: 40em) {
  .composer-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .platform-row {
    border-radius: var(--radius);
  }

  .composer-editor,
  .composer-editor.joins-top {
    border-radius: var(--radius);
    margin-top: var(--gutter-space-half);
  }
}
</style>
<template>
  <PublicationPanelComponent
    :enabled="publishable"
    :icon="icon"
    :icon-hover="icon"
    :plugin="pluginName"
    :publish="publish"
  >
    <template v-slot:panel>
      <div class="ayrshare-composer">
        <!-- choosing the platforms: a dropdown of checkboxes, and the badges of what's
             picked to the right of it -->
        <div class="platform-picker">
          <span class="picker-label">{{ composerT('platforms') }}</span>
          <Dropdown :disabled="publishing">
            <template #trigger>{{
              draft.selected.length ? composerT('change') : composerT('choose')
            }}</template>
            <fieldset class="picker-choices">
              <legend class="visually-hidden">{{ composerT('platforms') }}</legend>
              <label v-for="c in compositions" :key="c.platform" class="picker-choice">
                <input
                  v-model="selected"
                  :value="c.platform"
                  :aria-label="platformLabel(c.platform)"
                  :disabled="publishing"
                  type="checkbox"
                />
                <span class="badge" aria-hidden="true" :style="badgeStyle(c.platform)">{{
                  badgeFor(c.platform).initials
                }}</span>
                <span class="picker-name" :title="platformLabel(c.platform)">{{
                  platformShortLabel(c.platform)
                }}</span>
                <span class="limit" aria-hidden="true">{{
                  composerT('limitShort', { num: formattedLimit(c.platform) })
                }}</span>
              </label>
            </fieldset>
          </Dropdown>
          <ul
            v-if="draft.selected.length"
            class="picked-badges"
            :aria-label="composerT('platforms')"
          >
            <li v-for="p in draft.selected" :key="p">
              <span
                class="badge"
                role="img"
                :aria-label="platformLabel(p)"
                :title="platformLabel(p)"
                :style="badgeStyle(p)"
                >{{ badgeFor(p).initials }}</span
              >
            </li>
          </ul>
        </div>

        <div class="composer-body">
          <ul class="platform-list" :aria-label="composerT('list')">
            <li :class="['platform-row', { open: open === SHARED }]">
              <span class="badge badge-everywhere" aria-hidden="true">*</span>
              <button
                :id="rowId(SHARED)"
                type="button"
                class="row-button"
                :aria-current="open === SHARED ? 'true' : undefined"
                :aria-controls="editorId"
                @click="openRow(SHARED)"
              >
                <span class="name">{{ composerT('shared') }}</span>
                <span class="status">{{
                  draft.selected.length
                    ? composerTc('sharedStatus', draft.selected.length)
                    : composerT('pickPlatforms')
                }}</span>
              </button>
            </li>
            <li
              v-for="p in draft.selected"
              :key="p"
              :class="['platform-row', { open: open === p }]"
            >
              <span class="badge" aria-hidden="true" :style="badgeStyle(p)">{{
                badgeFor(p).initials
              }}</span>
              <button
                :id="rowId(p)"
                type="button"
                class="row-button"
                :title="platformLabel(p)"
                :aria-current="open === p ? 'true' : undefined"
                :aria-controls="editorId"
                @click="openRow(p)"
              >
                <span class="name">{{ platformShortLabel(p) }}</span>
                <span class="limit">{{ composerT('limitShort', { num: formattedLimit(p) }) }}</span>
                <span class="status">
                  <span :class="rowStatus(p).kind">{{ rowStatus(p).text }}</span>
                  <template v-if="attachmentCount(p)">
                    · {{ composerTc('attachments', attachmentCount(p)) }}
                  </template>
                </span>
              </button>
            </li>
          </ul>

          <div
            :id="editorId"
            ref="editor"
            :style="editorMinHeight ? { minHeight: `${editorMinHeight}px` } : undefined"
            role="region"
            :aria-labelledby="rowId(open)"
            :class="['composer-editor', { 'joins-top': open === SHARED }]"
          >
            <!-- the shared text. a new InputWrapper per row, since it binds to whichever
                 textarea it finds when it mounts -->
            <template v-if="open === SHARED">
              <InputWrapper
                :key="SHARED"
                :model-value="draft.shared"
                @update:model-value="setShared"
              >
                <textarea
                  :value="draft.shared"
                  :aria-label="composerT('sharedLabel')"
                  :disabled="publishing"
                  rows="8"
                  @input="setShared(($event.target as HTMLTextAreaElement).value)"
                />
                <InputTools :model-value="draft.shared" @update:model-value="setShared" />
              </InputWrapper>
              <div class="composer-notes">
                <p v-if="sharedPlatforms.length">
                  <i18n-t :keypath="composerKey('usedBy')" tag="span" scope="global">
                    <template #platforms>
                      <template v-for="(p, i) in sharedPlatforms" :key="p">
                        <span v-if="i > 0">, </span>
                        <span :class="{ over: charactersOver(draft, p) > 0 }">{{
                          platformShortLabel(p)
                        }}</span>
                        <span v-if="charactersOver(draft, p) > 0" class="over">
                          ({{ composerT('overShort') }})</span
                        >
                      </template>
                    </template>
                  </i18n-t>
                </p>
                <p v-else-if="draft.selected.length">{{ composerT('usedByNone') }}</p>
                <p v-else>{{ composerT('pickPlatforms') }}</p>
                <p>{{ composerT('media') }}</p>
              </div>
            </template>

            <!-- one platform. it shows the shared text until it's edited; the first edit
                 gives the platform text of its own -->
            <template v-else>
              <div class="composer-status">
                <p v-if="isCustomized(draft, open)">
                  {{ composerT('customized', { platform: platformShortLabel(open) }) }}
                </p>
                <p v-else>
                  {{
                    composerT('inherited', {
                      platform: platformShortLabel(open),
                      shared: composerT('shared')
                    })
                  }}
                </p>
                <button
                  v-if="isCustomized(draft, open)"
                  class="pure-button pure-button-primary"
                  type="button"
                  :disabled="publishing"
                  @click="useShared(open)"
                >
                  {{ composerT('useShared', { shared: composerT('shared') }) }}
                </button>
              </div>
              <InputWrapper
                :key="open"
                :model-value="effectiveText(draft, open)"
                @update:model-value="(text: string) => setPlatformText(open, text)"
              >
                <textarea
                  :value="effectiveText(draft, open)"
                  :class="{ inherited: !isCustomized(draft, open) }"
                  :aria-label="composerT('platformLabel', { platform: platformLabel(open) })"
                  :disabled="publishing"
                  rows="8"
                  @input="setPlatformText(open, ($event.target as HTMLTextAreaElement).value)"
                />
                <CompositionComponent :composition-id="compositionIdFor(open)" />
                <InputTools
                  :model-value="effectiveText(draft, open)"
                  @update:model-value="(text: string) => setPlatformText(open, text)"
                />
              </InputWrapper>
              <div class="composer-notes">
                <p v-if="charactersOver(draft, open) > 0" class="over">
                  {{
                    composerT('over', {
                      num: formatNumber(charactersOver(draft, open)),
                      platform: platformShortLabel(open)
                    })
                  }}
                </p>
                <p v-else-if="formattedLimit(open)">
                  {{ composerT('limit', { num: formattedLimit(open) }) }}
                </p>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>
  </PublicationPanelComponent>
</template>
<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import PublicationPanelComponent from '@/publications/PublicationPanelComponent.vue'
import { computed, inject, onMounted, reactive, ref, watch } from 'vue'
import {
  type GetPublicationContextFunction,
  type IsPluginReadyFunction,
  PublicationContext,
  type PublishFunction
} from '@/publications/input'
import { ayrshare, AyrsharePublicationComposition } from '@/services'
import CompositionComponent from '@/compositions/CompositionComponent.vue'
import InputTools from '@/ui/InputTools.vue'
import InputWrapper from '@/ui/input/InputWrapper.vue'
import Dropdown from '@/ui/Dropdown.vue'
import { useNotificationListeners } from '@/composables/useNotificationListeners'
import {
  AYRSHARE_PLATFORM_BADGES,
  AYRSHARE_PLATFORM_LIMITS,
  type AyrsharePlatformBadge,
  type AyrshareDraft,
  buildClientContext,
  charactersOver,
  effectiveText,
  isBlank,
  isCustomized,
  isPublishable
} from '@/publications/ayrshare'

const { listenForCategory } = useNotificationListeners()

const props = defineProps<{
  pluginName: string
  icon: string
  readyEventCategory?: string
}>()

const pluginName = props.pluginName

const { t } = useI18n()

// the shared text's row. no platform is called this
const SHARED = '*'

const composerKey = (key: string) => `publications.plugins.${pluginName}.composer.${key}`
const composerT = (key: string, params: Record<string, unknown> = {}) => t(composerKey(key), params)
const composerTc = (key: string, n: number) => t(composerKey(key), { n }, n)

const formatNumber = (n: number) => new Intl.NumberFormat().format(n)

function platformLabel(platform: string): string {
  return t(`publications.plugins.${pluginName}.platforms.${platform}.label`)
}

function platformShortLabel(platform: string): string {
  return t(`publications.plugins.${pluginName}.platforms.${platform}.shortLabel`)
}

function formattedLimit(platform: string): string {
  const max = AYRSHARE_PLATFORM_LIMITS[platform]
  return max ? formatNumber(max) : ''
}

const publishing = ref<boolean>(false)
const pluginReady = ref<boolean>(false)
const compositions = ref<Array<AyrsharePublicationComposition>>([])

// selected is a v-model for the checkboxes, so it lives in its own ref; the draft the
// pure functions in ayrshare.ts read is put together from it
const selected = ref<Array<string>>([])
const text = reactive<{ shared: string; overrides: Record<string, string> }>({
  shared: '',
  overrides: {}
})
const draft = computed<AyrshareDraft>(() => ({
  shared: text.shared,
  overrides: text.overrides,
  // in the order the platforms are listed, not the order they were ticked
  selected: compositions.value.map((c) => c.platform).filter((p) => selected.value.includes(p))
}))

// the row whose text is in the editor
const open = ref<string>(SHARED)

function badgeFor(platform: string): AyrsharePlatformBadge {
  return AYRSHARE_PLATFORM_BADGES[platform] ?? { initials: '?', color: '#405069', ink: '#ffffff' }
}

function badgeStyle(platform: string) {
  const badge = badgeFor(platform)
  return { backgroundColor: badge.color, color: badge.ink }
}
const sharedPlatforms = computed(() =>
  draft.value.selected.filter((p) => !isCustomized(draft.value, p))
)

const publishable = computed(
  () => !publishing.value && pluginReady.value && isPublishable(draft.value)
)

// a platform that's unticked while it's open hands the editor back to the shared text
watch(draft, (current) => {
  if (open.value !== SHARED && !current.selected.includes(open.value)) open.value = SHARED
})

// the drafts are read again on the way out of a platform's row, so it shows any
// attachments it was just given
function openRow(row: string) {
  if (open.value !== SHARED && open.value !== row) refresh()
  holdEditorHeight()
  open.value = row
}

// switching rows never makes the editor shorter. one row can be much taller than the next
// (its attachments open, say), and when the page is scrolled down near the bottom, losing
// that height drags the whole page up under the pointer, since the browser has to pull the
// scroll position in to fit the shorter page. so the editor keeps the tallest height it's
// had, and only starts over when the composer does
const editor = ref<HTMLElement>()
const editorMinHeight = ref<number>(0)

function holdEditorHeight() {
  const height = editor.value?.offsetHeight ?? 0
  if (height > editorMinHeight.value) editorMinHeight.value = height
}

// the panel has always asked again whether the plugin is ready when a platform is ticked
watch(selected, async () => {
  pluginReady.value = await isPluginReady()
})

function setShared(value: string) {
  text.shared = value
}

// the first edit on a platform's tab gives that platform text of its own. an "edit" that
// changes nothing (the input wrapper repeats the value back on focus and change) doesn't
function setPlatformText(platform: string, value: string) {
  if (isCustomized(draft.value, platform) || value !== text.shared) {
    text.overrides[platform] = value
  }
}

function useShared(platform: string) {
  delete text.overrides[platform]
}

// what a ticked platform's row says about its text. a platform still on the shared text
// isn't flagged for being empty: before anything is written that would flag every row,
// and the shared text is where the fix goes anyway
function rowStatus(platform: string): { kind: string; text: string } {
  const d = draft.value
  const own = isCustomized(d, platform)
  if (own && isBlank(d, platform)) return { kind: 'problem', text: composerT('rowEmpty') }
  const over = charactersOver(d, platform)
  if (over > 0) return { kind: 'problem', text: composerT('rowOver', { num: formatNumber(over) }) }
  if (own) return { kind: 'own', text: composerT('rowOwn') }
  return { kind: 'shared', text: composerT('rowShared', { shared: composerT('shared') }) }
}

function attachmentCount(platform: string): number {
  return (
    compositions.value.find((c) => c.platform === platform)?.composition.attachments?.length ?? 0
  )
}

function compositionIdFor(platform: string): number {
  return compositions.value.find((c) => c.platform === platform)!.composition.id
}

// several Ayrshare panels can be on one page (the home page's and an episode's), so the
// ids that tie the rows to the editor carry the plugin's name
const editorId = `ayrshare-composer-${pluginName}`
const rowId = (row: string) => `${editorId}-row-${row === SHARED ? 'shared' : row}`

function clearDraft() {
  selected.value = []
  text.shared = ''
  text.overrides = {}
  open.value = SHARED
  editorMinHeight.value = 0
}

const isPluginReadyFunction = inject<IsPluginReadyFunction>('isPluginReady')!
const publishFunction = inject<PublishFunction>('publish')!
const getPublicationContextFunction =
  inject<GetPublicationContextFunction>('getPublicationContext')!

// resolves with the id of the publication that was started, not with its success.
async function publish(scheduled: Date | null): Promise<number> {
  publishing.value = true
  const publicationContext: PublicationContext = getPublicationContextFunction()
  const clientContext = buildClientContext(draft.value, compositions.value)
  try {
    const publicationId = await publishFunction(
      publicationContext.type,
      publicationContext.publishableId,
      clientContext,
      pluginName,
      scheduled
    )
    // a scheduled post is as done as it's going to be for days, so the composer starts
    // over now. left filled in, it looks like the schedule never happened
    if (scheduled) clearDraft()
    return publicationId
  } finally {
    // a post for right now holds the panel until ayrshare says it's out. one for later
    // would hold it for days, so the panel comes back once it's been scheduled.
    if (scheduled) publishing.value = false
  }
}

if (props.readyEventCategory) {
  listenForCategory(props.readyEventCategory, async () => {
    pluginReady.value = await isPluginReady()
  })
}

// a file finished uploading into one of the drafts' attachments
listenForCategory('attachment-managed-file-updated-event', async () => {
  await refresh()
})

listenForCategory('ayrshare-publication-completion-event', async () => {
  // the post that just went out is done with, so the composer starts over. a scheduled
  // one going out days later leaves alone whatever is being written by then.
  const wasPublishing = publishing.value
  publishing.value = false
  await refresh()
  if (wasPublishing) clearDraft()
})

// publishing to N platforms sends N completion notifications, and every one of
// them asks us to reload. they'd all be asking for the exact same thing, so ride
// along on the request that's already in flight instead of firing N of them.
let refreshing: Promise<void> | null = null

// the drafts' compositions (one per platform, holding its media) are replaced once a post
// goes out, so the ids are read afresh; what's been written stays put
async function refresh(): Promise<void> {
  if (refreshing) {
    return refreshing
  }
  refreshing = (async () => {
    try {
      compositions.value = await ayrshare.publicationCompositions()
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

onMounted(async () => {
  await refresh()
  pluginReady.value = await isPluginReady()
})

async function isPluginReady(): Promise<boolean> {
  const publicationContext = getPublicationContextFunction()
  const ready = await isPluginReadyFunction(
    publicationContext.type,
    publicationContext.publishableId,
    {},
    pluginName
  )
  return !!ready
}
</script>
