<template>
  <div class="form-section">
    <div class="form-section-title">{{ t('home.history.title') }}</div>

    <div class="history-controls">
      <label for="history-days">{{ t('home.history.events') }}</label>
      <select id="history-days" v-model.number="limit">
        <option v-for="choice in dayChoices" :key="choice" :value="choice">{{ choice }}</option>
      </select>
    </div>

    <div v-if="days.length === 0" class="history-empty">
      {{ t('home.history.nothing') }}
    </div>

    <!-- the query only returns days that published something, so there is no empty
         day to render here -->
    <div v-for="day in days" :key="day.status.id" class="history-day">
      <div class="history-day-date">{{ day.status.date }}</div>
      <PublicationsListComponent
        :icons="icons"
        :publications="day.publications"
        unpublishable
        @unpublish="unpublish"
      />
    </div>
  </div>
</template>

<style scoped>
.history-controls {
  display: flex;
  align-items: center;
  gap: var(--gutter-space-half);
  padding-bottom: var(--gutter-space);
}

.history-day {
  padding-top: var(--gutter-space);
}

.history-day-date {
  font-weight: bolder;
}

.history-empty {
  font-style: italic;
}
</style>

<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { mogulStatuses, publications, type MogulStatusPublications } from '@/services'
import { PanelSlotIcon } from '@/publications/input'
import PublicationsListComponent from '@/publications/PublicationsListComponent.vue'
import ayrshareIcon from '@/assets/images/publications/mogul/publish-to-ayrshare.png'
import { useNotificationListeners } from '@/composables/useNotificationListeners'

const { t } = useI18n()
const { listenForCategory } = useNotificationListeners()

const dayChoices = [7, 10, 30, 90]
const limit = ref<number>(10)
const days = ref<Array<MogulStatusPublications>>([])

// past days have no publish panels to register icons, so name the plugins that can
// appear against a mogul status directly. a plugin missing from here still renders,
// just without its icon.
const icons = new Map<string, PanelSlotIcon>([
  ['mogulAyrshare', new PanelSlotIcon(ayrshareIcon, ayrshareIcon)]
])

async function refresh() {
  // one request for the whole window: the server batch-loads each day's publications
  // together, so raising this from 7 to 90 doesn't multiply the queries.
  days.value = await mogulStatuses.recent(limit.value)
}

// the publish panel above hides its own copy of these rows, so the withdraw control
// lives here now.
async function unpublish(publicationId: number) {
  await publications.unpublish(publicationId)
  await refresh()
}

onMounted(refresh)
watch(limit, refresh)

listenForCategory('publication-completed-event', refresh)
</script>
