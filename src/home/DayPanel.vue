<template>
  <div class="day-page">
    <h1>{{ title }}</h1>
    <!-- publishing about this day: the same tabbed bar of plugins as under an episode -->
    <div class="form-section">
      <div class="form-section-title">
        {{ isToday ? t('home.day.publish') : t('home.day.schedule') }}
      </div>
      <p v-if="isPast" class="day-past">{{ t('home.day.past') }}</p>
      <template v-else>
        <label v-if="!isToday" class="day-time">
          {{ t('home.day.time') }}
          <input v-model="time" required type="time" />
        </label>
        <PublicationsSectionComponent
          v-if="status"
          :key="status.id"
          :disabled="false"
          :publishable="status.id + ''"
          :scheduled="scheduled"
          :show-existing-publications="false"
          type="mogulStatus"
        >
          <Ayrshare />
        </PublicationsSectionComponent>
      </template>
    </div>

    <!-- everything that went out, or is due to, on this day, a block per publishable -->
    <div class="form-section">
      <div class="form-section-title">{{ t('home.day.publications') }}</div>
      <p v-if="!entries.length" class="day-past">{{ t('home.day.nothing') }}</p>
      <div v-for="e in entries" :key="e.key" class="day-entry">
        <div class="day-entry-head">
          <span class="day-entry-type">{{ typeLabel(e) }}</span>
          <span class="day-entry-title">{{ e.publishable?.title ?? '' }}</span>
          <RouterLink
            v-if="linkable(e)"
            :to="{
              name: 'entity',
              params: { type: e.publishable!.type, id: e.publishable!.id }
            }"
            class="day-entry-open"
          >
            {{ t('home.day.open') }}
          </RouterLink>
        </div>
        <PublicationsListComponent
          :icons="PLUGIN_ICONS"
          :publications="e.publications"
          unpublishable
          @unpublish="(id: number) => emit('unpublish', id)"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { mogul } from '@/services'
import type { MogulStatus } from '@/mogul'
import type { Publication } from '@/services'
import PublicationsSectionComponent from '@/publications/PublicationsSectionComponent.vue'
import PublicationsListComponent from '@/publications/PublicationsListComponent.vue'
import Ayrshare from '@/home/publications/Ayrshare.vue'
import { PLUGIN_ICONS } from '@/publications/plugins'
import { type CalendarEntry, dayKey, entriesByDay, startOfDay } from '@/home/calendar'

const props = defineProps<{
  day: Date
  publications: Array<Publication>
  now: Date
}>()

const emit = defineEmits<{
  unpublish: [publicationId: number]
}>()

const { t, te } = useI18n()

const title = computed(() =>
  props.day.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
)
const isToday = computed(() => dayKey(props.day) === dayKey(props.now))
const isPast = computed(() => startOfDay(props.day) < startOfDay(props.now))

const entries = computed(() => entriesByDay(props.publications).get(dayKey(props.day)) ?? [])

// a day ahead goes out at this time on it; today goes out now
const time = ref<string>('09:00')
const scheduled = computed<Date | null>(() => {
  if (isToday.value || !time.value) return null
  const [h, m] = time.value.split(':').map(Number)
  const d = startOfDay(props.day)
  d.setHours(h, m, 0, 0)
  return d
})

// what a publication about a day hangs off: that day's status, made if it's not there yet.
// a past day has nothing more to publish, so there's no reason to make one for it
const status = ref<MogulStatus | null>(null)

async function loadStatus() {
  status.value = null
  if (isPast.value) return
  const day = dayKey(props.day)
  const found = await mogul.statusForDate(day)
  // a click on another day while that was in flight wins
  if (dayKey(props.day) === day) status.value = found
}

watch(
  () => dayKey(props.day),
  async () => {
    time.value = '09:00'
    await loadStatus()
  }
)

onMounted(loadStatus)

function typeLabel(e: CalendarEntry): string {
  const type = e.publishable?.type
  if (!type) return ''
  const key = `home.calendar.types.${type}`
  return te(key) ? t(key) : type
}

// a status is this page; episodes and posts have editors to go to
const linkable = (e: CalendarEntry) =>
  !!e.publishable && e.publishable.type !== 'mogulStatus' && e.publishable.title !== null
</script>

<style scoped>
/* a page, but a narrow one: the composer reads best at about this width */
.day-page {
  max-width: 60rem;
  margin: 0 auto;
}

.day-page h1 {
  margin-top: 0;
}

.day-past {
  font-style: italic;
  color: var(--muted-color);
}

.day-time {
  display: inline-flex;
  align-items: center;
  gap: var(--gutter-space-half);
  font-weight: bolder;
}

.day-entry {
  padding-top: var(--gutter-space);
}

.day-entry + .day-entry {
  border-top: 1px solid var(--rule-color);
  margin-top: var(--gutter-space);
}

.day-entry-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--gutter-space-half);
}

.day-entry-type {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted-color);
}

.day-entry-title {
  font-weight: 600;
}

.day-entry-open {
  margin-left: auto;
  font-size: var(--font-size-sm);
}
</style>
