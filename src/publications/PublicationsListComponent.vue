<template>
  <div class="publications">
    <div v-for="publication in publications" v-bind:key="publication.id">
      <div class="publications-row row">
        <div class="plugin-column">
          <div class="plugin-icon-container">
            <Icon
              highlight="always"
              v-if="iconFor(publication.plugin)"
              :icon="iconFor(publication.plugin)!.icon"
              :icon-hover="iconFor(publication.plugin)!.iconHover"
              :width="40"
            />
          </div>
        </div>
        <div class="created-column">{{ dateTimeToString(publication.created) }}</div>
        <div class="published-column">
          {{ dateTimeToString(publication.published) }}
        </div>
        <div class="delete-column">
          <Icon
            highlight="rest"
            v-if="unpublishable"
            :disabled="withdrawn(publication)"
            :icon="deleteAsset"
            :icon-hover="deleteAsset"
            class="delete-icon"
            @click.prevent="emit('unpublish', publication.id)"
          />
        </div>
        <div class="url-column preview">
          <span v-if="publication.publishing"> 🕒 </span>
        </div>
      </div>
      <div class="publications-outcomes">
        <div
          v-for="outcome in publication.outcomes"
          v-bind:key="outcome.id"
          class="publications-outcome row"
        >
          <div class="uri">
            <a :class="{ disabled: withdrawn(publication) }" :href="outcome.url" target="_blank">
              <Icon
                :icon="previewAsset"
                :icon-hover="previewAsset"
                :highlight="withdrawn(publication) ? 'always' : 'rest'"
              />
            </a>
          </div>
          <div class="success">
            <Icon v-if="outcome.success" :icon="checkmarkAsset" :icon-hover="checkmarkAsset" />
            <Icon
              highlight="hover"
              v-else
              :icon="errorAsset"
              :icon-hover="errorAsset"
              class="failed-outcome"
            />
          </div>
          <div class="key">
            {{ t('publications.outcomes.keys.' + outcome.key) }}
          </div>
          <div v-if="!outcome.success" class="server-error-message">
            <a
              v-if="outcome.serverErrorMessage"
              href="#"
              @click.prevent="popupErrorMessage(outcome.serverErrorMessage)"
            >
              {{ t('publications.outcomes.error-message') }}
            </a>
            <span v-else>{{ t('publications.outcomes.no-error-message') }}</span>
          </div>
          <div v-else-if="outcome.preview" :title="outcome.preview" class="preview">
            {{ outcome.preview }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* svg icons take the text color, so a failure is tinted rather than drawn in red */
.failed-outcome {
  color: var(--danger-color);
}

.publications {
  --icon-column: 40px;
  /* fits the longest outcome label, "X (formerly known as Twitter)", with room to spare. */
  --key-column: 15em;
  margin-top: var(--gutter-space);
}

.publications .publications-row {
  display: grid;
  grid-template-areas: ' plugin . delete   url  created published   ';
  grid-template-columns:
    min-content var(--gutter-space) var(--icon-column) var(--icon-column) var(--date-column)
    auto;
  padding-top: calc(var(--radius) * 1);
  padding-bottom: var(--gutter-space-half);
  border-top: 1px solid var(--rule-color);
  border-bottom: 1px solid var(--rule-color);
}

.publications .publications-row .plugin-column {
  grid-area: plugin;
}

.publications .publications-row .created-column {
  grid-area: created;
}

.publications .publications-row .published-column {
  grid-area: published;
}

.publications .publications-row .delete-column {
  grid-area: delete;
}

.publications .publications-row .url-column {
  grid-area: url;
}

.publications .publications-row .plugin-icon-container {
  background-color: var(--chrome-color);
  border-radius: var(--radius);
  overflow: hidden;

  width: 40px;
  height: 40px;
}

.publications .publications-outcome {
  margin-top: calc(var(--radius) * -1);
  height: var(--row-height);
  border-radius: var(--radius);
  border-top-left-radius: 0;
  padding-left: var(--gutter-space);
  padding-top: var(--radius);
  border: 1px solid var(--rule-color);
  border-top: 0;
  border-right: none;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  display: grid;
  grid-template-areas: ' uri success key detail ';
  grid-column-gap: calc(var(--gutter-space) / 2);
  /*
   * every track before the detail column is a fixed width, which is the whole point:
   * each outcome row is its own grid, so a key column that sized itself to its own text
   * started "Facebook"'s preview and "X (formerly known as Twitter)"'s preview at
   * different offsets. fixed tracks are the one thing separate grids can agree on.
   */
  grid-template-columns:
    var(--icon-column) var(--icon-column) var(--key-column)
    minmax(0, 1fr);
  margin-left: var(--icon-column);
}

.publications .publications-outcome:last-child {
  margin-bottom: calc(var(--radius) * 1);
}

.publications .publications-outcome:first-child {
  margin-top: 0;
  padding-top: 0;
}

.publications .publications-outcome .success {
  grid-area: success;
}

/* a label longer than the column clips rather than crowding the detail beside it. */
.publications .publications-outcome .key {
  grid-area: key;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.publications .publications-outcome .uri {
  grid-area: uri;
}

/*
 * the two alternatives share the one column. the preview is the only thing in the row
 * allowed to lose space -- hence the 0 minimum and the ellipsis -- while the error
 * message holds its line, since wrapping would spill out of the row's fixed height.
 */
.publications .publications-outcome .preview,
.publications .publications-outcome .server-error-message {
  grid-area: detail;
  min-width: 0;
  white-space: nowrap;
}

.publications .publications-outcome .preview {
  overflow: hidden;
  text-overflow: ellipsis;
  font-style: italic;
  opacity: 0.75;
}
</style>

<script lang="ts" setup>
import Icon from '@/ui/Icon.vue'
import { useI18n } from 'vue-i18n'
import { PanelSlotIcon } from '@/publications/input'
import { Publication } from '@/services'
import { dateTimeToString } from '@/dates'
import deleteAsset from '@/assets/images/icons/delete.svg'
import errorAsset from '@/assets/images/icons/error.svg'
import previewAsset from '@/assets/images/icons/preview.svg'
import checkmarkAsset from '@/assets/images/icons/checkbox.svg'

const { t } = useI18n()

/**
 * renders publications that already happened. deliberately dumb: it owns no fetching
 * and no publishing, so the same rows render next to the publish controls for one
 * publishable and, read-only, in the mogul's day-by-day history.
 */
const props = withDefaults(
  defineProps<{
    publications: Array<Publication>
    icons?: Map<string, PanelSlotIcon>
    unpublishable?: boolean
  }>(),
  { icons: () => new Map<string, PanelSlotIcon>(), unpublishable: false }
)

const emit = defineEmits<{ (e: 'unpublish', publicationId: number): void }>()

// a plugin whose panel isn't mounted here has no registered icon; render the row
// without one rather than blowing up.
function iconFor(plugin: string): PanelSlotIcon | undefined {
  return props.icons.get(plugin)
}

function withdrawn(publication: Publication) {
  return (
    publication.url === '' || publication.state == 'draft' || publication.state == 'unpublished'
  )
}

async function popupErrorMessage(message: string) {
  if (message !== null) window.alert(message)
}
</script>
