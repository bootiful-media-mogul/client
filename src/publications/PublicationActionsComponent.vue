<template>
  <div ref="container" class="publication-actions">
    <div class="publication-buttons">
      <button
        v-if="action.schedulable()"
        ref="scheduleButton"
        :aria-expanded="scheduling"
        :class="{ 'schedule-button-open': scheduling }"
        :disabled="!action.enabled() || busy"
        class="pure-button publish-button schedule-button"
        type="button"
        @click.prevent="toggleScheduling"
      >
        {{ t('publications.schedule.schedule') }}
      </button>
      <button
        :disabled="!action.enabled() || busy || scheduling"
        class="pure-button pure-button-primary publish-button"
        type="button"
        @click.prevent="run(scheduledFor)"
      >
        {{
          scheduledFor
            ? t('publications.schedule.for', { when: dateTimeToString(scheduledFor.getTime()) })
            : action.label() || t('publications.plugins.publish')
        }}
      </button>
    </div>
    <div
      v-if="scheduling"
      :style="{ marginLeft: scheduleOffset + 'px' }"
      class="schedule-panel"
      role="group"
      :aria-label="t('publications.schedule.when')"
    >
      <div class="schedule-panel-title">{{ t('publications.schedule.when') }}</div>
      <!-- inline, not the popover the editors use: the publication panel clips what
           overflows it, and a calendar that pops out of a panel would be cut off -->
      <VDatePicker
        v-model="scheduled"
        :is-dark="appliedTheme !== 'light'"
        :min-date="now"
        is24hr
        mode="dateTime"
      />
      <div class="schedule-panel-buttons">
        <button
          :disabled="!canSchedule || busy"
          class="pure-button pure-button-primary publish-button"
          type="button"
          @click.prevent="run(scheduled)"
        >
          {{ t('publications.schedule.confirm') }}
        </button>
        <button class="pure-button publish-button" type="button" @click.prevent="cancel">
          {{ t('publications.schedule.cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PanelAction } from '@/publications/input'
import { appliedTheme } from '@/theme'
import { dateTimeToString } from '@/dates'

/**
 * the buttons beneath every publication panel: publish now, or pick a time and publish
 * then. the panel above decides what the main button says, when it can be pressed and
 * what pressing it does; how the buttons look, and the scheduling, are the same for
 * every plugin.
 */
const props = withDefaults(
  defineProps<{
    action: PanelAction
    /**
     * when the main button sends the publication, if not now. the home page's calendar
     * sets it from the day that was picked, and then the main button schedules.
     */
    scheduledFor?: Date | null
  }>(),
  { scheduledFor: null }
)

/** the press went through: the publication exists, whether it's out yet or scheduled */
const emit = defineEmits<{ published: [] }>()

const { t } = useI18n()

const container = ref<HTMLElement | null>(null)
const scheduleButton = ref<HTMLElement | null>(null)

/** a press is in flight; the buttons stay down so one click can't publish twice */
const busy = ref<boolean>(false)
const scheduling = ref<boolean>(false)
const scheduled = ref<Date | null>(null)
const now = ref<Date>(new Date())
/** how far in from the panel's edge the schedule button sits, so its panel can too */
const scheduleOffset = ref<number>(0)

const canSchedule = computed(
  () => props.action.enabled() && scheduled.value !== null && scheduled.value > new Date()
)

async function toggleScheduling() {
  if (scheduling.value) {
    cancel()
    return
  }
  now.value = new Date()
  // the top of the next hour: the time fields show something sensible straight away,
  // instead of sitting blank until a day is clicked
  const nextHour = new Date(now.value)
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
  scheduled.value = nextHour
  scheduling.value = true
  await nextTick()
  if (scheduleButton.value && container.value)
    scheduleOffset.value =
      scheduleButton.value.getBoundingClientRect().left -
      container.value.getBoundingClientRect().left
}

function cancel() {
  scheduling.value = false
  scheduled.value = null
}

async function run(when: Date | null) {
  if (busy.value) return
  busy.value = true
  try {
    await props.action.publish(when)
    if (when) cancel()
    emit('published')
  } finally {
    busy.value = false
  }
}
</script>
<style scoped>
.publication-actions {
  margin-top: var(--gutter-space-half);
  /* between the buttons and the schedule panel, which the open tab spans: the same
     0.3 gutter that separates the buttons from one another */
  --schedule-gap: var(--form-buttons-gutter-space);
}

/* no gap of their own: every button already carries the form-buttons margin, which is
   what spaces save and cancel in the editors above, so these match them */
.publication-buttons {
  display: flex;
  flex-wrap: wrap;
}

/* open, it's the tab of the panel beneath it: white, rounded at the top, and flat
   whether or not the pointer is over it or it still has the focus from the click */
.schedule-button.schedule-button-open,
.schedule-button.schedule-button-open:hover,
.schedule-button.schedule-button-open:focus,
.schedule-button.schedule-button-open:active {
  position: relative;
  background-color: var(--raised-color);
  background-image: none;
  box-shadow: none;
  color: var(--ink-color);
  border-color: var(--raised-color);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

/* and its sides carry on down across the gutter into the panel, so the two read as one
   shape. drawn rather than padded, so the button row keeps its height and the publish
   button beside it doesn't move */
.schedule-button.schedule-button-open::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: var(--schedule-gap);
  background-color: var(--raised-color);
}

/* a little under the schedule button, a gap its tab fills, and out to the panel's far
   edge. it's a block in the flow, so its right edge is the panel's padding, and it pushes
   the panel taller rather than spilling out of it. the corner under the tab is square:
   the tab runs straight into it */
.schedule-panel {
  margin-top: var(--schedule-gap);
  background-color: var(--raised-color);
  color: var(--ink-color);
  border-radius: var(--radius);
  border-top-left-radius: 0;
  padding: var(--gutter-space-half);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--gutter-space-half);
}

.schedule-panel-title {
  font-weight: bold;
  font-size: var(--font-size-sm);
}

.schedule-panel-buttons {
  display: flex;
}
</style>
