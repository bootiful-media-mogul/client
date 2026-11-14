<template>
  <h1>{{ t('home.title') }}</h1>

  <div class="form-section">
    <div class="form-section-title">{{ t('home.publications') }}</div>
    <PopupPage v-model:open="dayOpen" :label="selectedLabel">
      <PublicationsCalendar
        v-model:anchor="anchor"
        v-model:view="view"
        :now="now"
        :publications="shown"
        :selected="selected"
        @select="select"
      />
      <template #panel>
        <DayPanel
          v-if="selected"
          :day="selected"
          :now="now"
          :publications="shown"
          @unpublish="unpublish"
        />
      </template>
    </PopupPage>
  </div>
</template>
<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { publications, type Publication } from '@/services'
import PublicationsCalendar from '@/home/PublicationsCalendar.vue'
import DayPanel from '@/home/DayPanel.vue'
import PopupPage from '@/layout/PopupPage.vue'
import { type CalendarView, startOfDay, visibleRange } from '@/home/calendar'
import { useNotificationListeners } from '@/composables/useNotificationListeners'

const { t } = useI18n()
const { listenForCategory } = useNotificationListeners()

const now = ref<Date>(new Date())
const view = ref<CalendarView>('week')
const anchor = ref<Date>(startOfDay(now.value))
const selected = ref<Date | null>(null)
const dayOpen = ref<boolean>(false)
const selectedLabel = computed(
  () => selected.value?.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
)

function select(day: Date) {
  selected.value = day
  dayOpen.value = true
}

// every publication in the days the calendar is showing, about anything at all. the day
// panel reads the picked day's from here too: a day can only be picked from what's shown
const shown = ref<Array<Publication>>([])

// a later range asked for while an earlier one was loading wins, whichever answers first
let generation = 0

async function refresh() {
  const mine = ++generation
  now.value = new Date()
  const [from, to] = visibleRange(view.value, anchor.value)
  const found = await publications.between(from, to)
  if (mine === generation) shown.value = found
}

async function unpublish(publicationId: number) {
  await publications.unpublish(publicationId)
  await refresh()
}

watch([view, anchor], refresh)
onMounted(refresh)

// the line between what has gone out and what's still to go moves with the clock
const tick = setInterval(() => (now.value = new Date()), 60_000)
onUnmounted(() => clearInterval(tick))

// started, so a new row (a scheduled one especially, which won't complete for days) shows
// up as soon as it exists; completed, so its outcome does
listenForCategory('publication-started-event', refresh)
listenForCategory('publication-completed-event', refresh)
</script>
