<template>
  <div class="calendar">
    <div class="calendar-toolbar">
      <div class="calendar-range">
        <h2>{{ rangeTitle }}</h2>
        <span class="calendar-range-sub">
          <template v-for="(part, i) in summary" :key="part.text">
            <span v-if="i > 0"> · </span>
            <span :class="{ 'range-failures': part.failed }">{{ part.text }}</span>
          </template>
        </span>
      </div>
      <div class="calendar-controls">
        <span class="calendar-views" role="group" :aria-label="t('home.calendar.view')">
          <button
            v-for="v in views"
            :key="v"
            :aria-pressed="view === v"
            :class="{ 'is-selected': view === v }"
            class="pure-button"
            type="button"
            @click="setView(v)"
          >
            {{ t('home.calendar.' + v) }}
          </button>
        </span>
        <span class="calendar-nav">
          <button
            :aria-label="t('home.calendar.previous')"
            class="pure-button calendar-step"
            type="button"
            @click="move(-1)"
          >
            ‹
          </button>
          <button class="pure-button" type="button" @click="emit('update:anchor', startOfDay(now))">
            {{ t('home.calendar.today') }}
          </button>
          <button
            :aria-label="t('home.calendar.next')"
            class="pure-button calendar-step"
            type="button"
            @click="move(1)"
          >
            ›
          </button>
        </span>
      </div>
    </div>

    <!-- a week: a column a day, a card a publishable -->
    <div v-if="view === 'week'" class="week">
      <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- a mouse shortcut for the day number, which is the button -->
      <section
        v-for="d in days"
        :key="dayKey(d)"
        :aria-label="d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })"
        :class="[dayClass(d), { 'is-selected': isSelected(d) }]"
        class="week-day"
        @click="emit('select', d)"
      >
        <header class="day-head">
          <span class="day-name">{{ d.toLocaleDateString([], { weekday: 'short' }) }}</span>
          <button class="day-number" type="button" @click.stop="emit('select', d)">
            {{ d.getDate() }}
          </button>
        </header>
        <div class="day-entries">
          <div v-if="!entriesFor(d).length" class="day-empty">
            {{
              startOfDay(d) < startOfDay(now)
                ? t('home.calendar.nothing-went-out')
                : t('home.calendar.nothing-scheduled')
            }}
          </div>
          <button
            v-for="e in entriesFor(d)"
            :key="e.key"
            :class="entryClass(e)"
            class="entry"
            type="button"
            @click.stop="emit('select', d)"
          >
            <span class="entry-meta">
              <Icon
                v-if="typeIcon(e)"
                :icon="typeIcon(e)!"
                :icon-hover="typeIcon(e)!"
                alt=""
                class="entry-type-icon"
              />
              <span>{{ typeLabel(e) }}</span>
              <span class="entry-time">{{ time(e.when) }}</span>
            </span>
            <span class="entry-title">{{ titleOf(e) }}</span>
            <span class="entry-plugins">
              <span
                v-for="p in e.publications"
                :key="p.id"
                :class="'plugin-badge-' + statusOf(p, now)"
                :title="pluginTitle(p.plugin)"
                class="plugin-badge"
              >
                <span :class="{ 'plugin-tile-image': !!iconFor(p.plugin) }" class="plugin-tile">
                  <img v-if="iconFor(p.plugin)" :src="iconFor(p.plugin)" alt="" />
                  <span v-else class="plugin-tile-mono">{{
                    pluginTitle(p.plugin).slice(0, 2)
                  }}</span>
                </span>
                <span
                  v-if="hasFailure(statusOf(p, now))"
                  class="plugin-badge-mark plugin-badge-failed"
                  aria-hidden="true"
                  >!</span
                >
                <span v-else-if="statusOf(p, now) === 'publishing'" class="plugin-badge-mark"
                  >🕒</span
                >
              </span>
            </span>
          </button>
        </div>
      </section>
    </div>

    <!-- a month: a cell a day, a line a publishable -->
    <template v-else>
      <div class="month-head">
        <div v-for="d in days.slice(0, 7)" :key="d.getDay()" class="day-name">
          {{ d.toLocaleDateString([], { weekday: 'short' }) }}
        </div>
      </div>
      <div class="month">
        <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- a mouse shortcut for the day number, which is the button -->
        <div
          v-for="d in days"
          :key="dayKey(d)"
          :class="[
            dayClass(d),
            { 'is-outside': d.getMonth() !== anchor.getMonth(), 'is-selected': isSelected(d) }
          ]"
          class="month-day"
          @click="emit('select', d)"
        >
          <button class="day-number" type="button" @click.stop="emit('select', d)">
            {{ d.getDate() }}
          </button>
          <button
            v-for="e in entriesFor(d).slice(0, MONTH_LINES)"
            :key="e.key"
            :class="entryClass(e)"
            :title="titleOf(e)"
            class="month-entry"
            type="button"
            @click.stop="emit('select', d)"
          >
            <span class="entry-time">{{ shortTime(e.when) }}</span>
            <span class="entry-title">{{ titleOf(e) }}</span>
            <span v-if="entryFlags(e, now).failed" class="month-entry-mark" aria-hidden="true"
              >!</span
            >
          </button>
          <span v-if="entriesFor(d).length > MONTH_LINES" class="month-more">
            {{ t('home.calendar.more', { n: entriesFor(d).length - MONTH_LINES }) }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Publication } from '@/services'
import Icon from '@/ui/Icon.vue'
import { PLUGIN_ICONS } from '@/publications/plugins'
import podcastIcon from '@/assets/images/icons/podcast.svg'
import blogIcon from '@/assets/images/icons/rss.svg'
import statusIcon from '@/assets/images/icons/edit.svg'
import {
  type CalendarEntry,
  type CalendarView,
  dayKey,
  entriesByDay,
  entryFlags,
  hasFailure,
  sameDay,
  startOfDay,
  statusOf,
  step,
  visibleDays,
  visibleRange
} from '@/home/calendar'

const props = defineProps<{
  publications: Array<Publication>
  view: CalendarView
  anchor: Date
  selected: Date | null
  now: Date
}>()

const emit = defineEmits<{
  'update:view': [view: CalendarView]
  'update:anchor': [anchor: Date]
  select: [day: Date]
}>()

const { t, te } = useI18n()

const views: Array<CalendarView> = ['week', 'month']
const MONTH_LINES = 4

const TYPE_ICONS: Record<string, string> = {
  episode: podcastIcon,
  post: blogIcon,
  mogulStatus: statusIcon
}

const days = computed(() => visibleDays(props.view, props.anchor))
const byDay = computed(() => entriesByDay(props.publications))
const entriesFor = (d: Date) => byDay.value.get(dayKey(d)) ?? []

const dayClass = (d: Date) => {
  const today = startOfDay(props.now)
  return sameDay(d, today) ? 'is-today' : d < today ? 'is-past' : 'is-future'
}
const isSelected = (d: Date) => !!props.selected && sameDay(d, props.selected)

const entryClass = (e: CalendarEntry) => {
  const f = entryFlags(e, props.now)
  return { 'is-upcoming': f.upcoming, 'is-failed': f.failed, 'is-withdrawn': f.withdrawn }
}

const typeIcon = (e: CalendarEntry) =>
  e.publishable ? TYPE_ICONS[e.publishable.type] ?? null : null

function typeLabel(e: CalendarEntry): string {
  const type = e.publishable?.type
  if (!type) return ''
  const key = `home.calendar.types.${type}`
  return te(key) ? t(key) : type
}

// a status has no title of its own, so it goes by what it said: the first post's preview
function titleOf(e: CalendarEntry): string {
  if (e.publishable?.type === 'mogulStatus') {
    const preview = e.publications.flatMap((p) => p.outcomes ?? []).find((o) => o.preview)?.preview
    return preview ?? pluginTitle(e.publications[0].plugin)
  }
  return e.publishable?.title ?? t('home.calendar.untitled')
}

function pluginTitle(plugin: string): string {
  const key = `publications.plugins.${plugin}.title`
  return te(key) ? t(key) : plugin
}

const iconFor = (plugin: string) => PLUGIN_ICONS.get(plugin)?.icon

const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const shortTime = (d: Date) => time(d).replace(':00', '').replace(' ', '').toLowerCase()

const rangeTitle = computed(() => {
  if (props.view === 'month')
    return props.anchor.toLocaleDateString([], { month: 'long', year: 'numeric' })
  const s = days.value[0]
  const e = days.value[6]
  const end = e.toLocaleDateString(
    [],
    s.getMonth() === e.getMonth() ? { day: 'numeric' } : { month: 'long', day: 'numeric' }
  )
  return `${s.toLocaleDateString([], {
    month: 'long',
    day: 'numeric'
  })} - ${end}, ${e.getFullYear()}`
})

// a line about the range: how much went out, how much is still to go
const summary = computed(() => {
  const [from, to] = visibleRange(props.view, props.anchor)
  const statuses = props.publications
    .filter((p) => {
      const when = new Date(p.published ?? p.scheduled ?? p.created)
      return when >= from && when < to
    })
    .map((p) => statusOf(p, props.now))
  const n = (...ss: Array<string>) => statuses.filter((s) => ss.includes(s)).length
  const parts: Array<{ text: string; failed: boolean }> = []
  if (n('published', 'partial'))
    parts.push({
      text: t('home.calendar.summary.published', { n: n('published', 'partial') }),
      failed: false
    })
  if (n('scheduled', 'publishing'))
    parts.push({
      text: t('home.calendar.summary.pending', { n: n('scheduled', 'publishing') }),
      failed: false
    })
  if (n('failed', 'partial'))
    parts.push({
      text: t('home.calendar.summary.failed', { n: n('failed', 'partial') }),
      failed: true
    })
  return parts.length ? parts : [{ text: t('home.calendar.summary.none'), failed: false }]
})

function move(direction: number) {
  emit('update:anchor', step(props.view, props.anchor, direction))
}

function setView(v: CalendarView) {
  // back to today's week when today is in the month being looked at
  const today = startOfDay(props.now)
  if (
    v === 'week' &&
    props.view === 'month' &&
    props.anchor.getMonth() === today.getMonth() &&
    props.anchor.getFullYear() === today.getFullYear()
  )
    emit('update:anchor', today)
  emit('update:view', v)
}
</script>

<style scoped>
/* every color, size and font comes from base.css's tokens, so it follows the palette the
   way the rest of the studio does */
.calendar-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--gutter-space);
  padding-bottom: var(--gutter-space);
}

.calendar-range h2 {
  margin: 0;
  font-size: var(--font-size-lg);
}

.calendar-range-sub {
  font-size: var(--font-size-sm);
  color: var(--muted-color);
}

.range-failures {
  color: var(--danger-color);
}

.calendar-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--gutter-space);
}

.calendar-controls button {
  margin: 0;
}

.calendar-views,
.calendar-nav {
  display: inline-flex;
  gap: var(--gutter-space-third);
}

/* week and month: two chrome buttons, the unselected one hollow */
.calendar-views .pure-button:not(.is-selected) {
  background-color: transparent;
  color: var(--ink-color);
}

.calendar-step {
  padding-inline: 0.8em;
}

/* ------------------------------------------------------------------ days, shared */
.day-name {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted-color);
}

.day-number {
  /* a button, so undo what the browser and base.css give one */
  all: unset;
  cursor: pointer;
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
  /* every day's number is padded like today's pill, so today's header is no taller than
     the rest and the line under the headers runs straight across */
  border-radius: var(--radius);
  padding: 0.1em 0.3em;
}

.day-number:focus-visible {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}

.is-today .day-number {
  color: var(--accent-ink-color);
  background-color: var(--accent-color);
}

.is-past {
  background-color: var(--hover-tint);
}

.day-empty {
  font-size: var(--font-size-xs);
  font-style: italic;
  color: var(--muted-color);
  text-align: center;
  padding-top: var(--gutter-space);
}

/* ------------------------------------------------------------------ week */
.week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  border: 1px solid var(--rule-color);
  border-radius: var(--radius);
  overflow: hidden;
  min-height: 28rem;
}

.week-day {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-left: 1px solid var(--rule-color);
  cursor: pointer;
}

.week-day:first-child {
  border-left: 0;
}

.week-day:hover,
.week-day.is-selected {
  box-shadow: inset 0 0 0 2px var(--field-border-color);
}

.week-day .day-head {
  display: flex;
  align-items: baseline;
  gap: var(--gutter-space-half);
  padding: var(--gutter-space-half);
  border-bottom: 1px solid var(--rule-color);
}

.week-day .day-number {
  font-size: var(--font-size-lg);
}

.day-entries {
  display: flex;
  flex-direction: column;
  gap: var(--gutter-space-half);
  padding: var(--gutter-space-half);
}

/* one publishable on one day */
.entry {
  all: unset;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--gutter-space-third);
  padding: var(--gutter-space-half);
  border-radius: var(--radius);
  border: 1px solid var(--rule-color);
  background-color: var(--raised-color);
  cursor: pointer;
  min-width: 0;
}

.entry:hover {
  border-color: var(--field-border-color);
}

.entry:focus-visible {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}

/* not gone out yet: drawn as an outline, the way a placeholder is */
.entry.is-upcoming {
  background-color: transparent;
  border-style: dashed;
  border-color: var(--field-border-color);
}

.entry.is-failed {
  border-color: var(--danger-color);
}

.entry.is-withdrawn {
  opacity: 0.5;
}

.entry.is-withdrawn .entry-title {
  text-decoration: line-through;
}

.entry-meta {
  display: flex;
  align-items: center;
  gap: var(--gutter-space-third);
  font-size: var(--font-size-xs);
  color: var(--muted-color);
  min-width: 0;
}

.entry-type-icon {
  width: 1.1em;
  flex: none;
  cursor: inherit;
}

.entry-time {
  margin-left: auto;
  font-family: var(--font-mono);
  white-space: nowrap;
}

.entry-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.entry-plugins {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gutter-space-third);
  padding-top: var(--gutter-space-third);
}

/* a plugin's tile, as on the publications list, with what happened to it pinned to its
   corner */
.plugin-badge {
  position: relative;
  display: inline-flex;
}

.plugin-tile {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 1.75rem;
  height: 1.75rem;
  background-color: var(--chrome-color);
  color: var(--chrome-ink-color);
  border-radius: calc(var(--radius) * 0.6);
  overflow: hidden;
}

/* the plugins' artwork is drawn for the top bar's near-black, as in the publish toolbar */
.plugin-tile-image {
  background-color: var(--topbar-color);
}

.plugin-tile img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.plugin-tile-mono {
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 0.625rem;
  letter-spacing: 0.04em;
}

.plugin-badge-mark {
  position: absolute;
  right: -0.35rem;
  top: -0.35rem;
  width: 0.95rem;
  height: 0.95rem;
  display: grid;
  place-items: center;
  font-size: 0.65rem;
  line-height: 1;
  border-radius: 50%;
  background-color: var(--raised-color);
}

.plugin-badge-failed {
  background-color: var(--danger-color);
  color: #fff;
  font-weight: 700;
}

.plugin-badge-scheduled .plugin-tile {
  opacity: 0.45;
}

.plugin-badge-withdrawn .plugin-tile {
  filter: grayscale(100%);
  opacity: 0.3;
}

/* ------------------------------------------------------------------ month */
.month-head,
.month {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.month-head .day-name {
  padding: 0 var(--gutter-space-half) var(--gutter-space-third);
}

.month {
  border: 1px solid var(--rule-color);
  border-radius: var(--radius);
  overflow: hidden;
}

.month-day {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  min-height: 7rem;
  padding: var(--gutter-space-third);
  border-left: 1px solid var(--rule-color);
  border-top: 1px solid var(--rule-color);
  cursor: pointer;
}

.month-day:nth-child(7n + 1) {
  border-left: 0;
}

.month-day:nth-child(-n + 7) {
  border-top: 0;
}

.month-day:hover {
  background-color: var(--hover-tint);
}

.month-day.is-today,
.month-day.is-selected {
  box-shadow: inset 0 0 0 2px var(--accent-color);
}

.month-day.is-outside > * {
  opacity: 0.45;
}

.month-day .day-number {
  font-size: var(--font-size-sm);
  align-self: flex-start;
  margin-bottom: 2px;
}

.month-entry {
  all: unset;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: var(--gutter-space-third);
  padding: 1px var(--gutter-space-third);
  border-radius: calc(var(--radius) * 0.6);
  border: 1px solid transparent;
  background-color: var(--raised-color);
  font-size: var(--font-size-xs);
  min-width: 0;
  cursor: pointer;
}

.month-entry:hover {
  border-color: var(--field-border-color);
}

.month-entry:focus-visible {
  outline: 2px solid var(--focus-color);
}

.month-entry.is-upcoming {
  background-color: transparent;
  border: 1px dashed var(--field-border-color);
}

.month-entry.is-failed {
  border-color: var(--danger-color);
}

.month-entry.is-withdrawn {
  opacity: 0.5;
  text-decoration: line-through;
}

.month-entry .entry-time {
  margin-left: 0;
  color: var(--muted-color);
}

.month-entry .entry-title {
  font-size: inherit;
  font-weight: 500;
  display: block;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  flex: 1;
}

.month-entry-mark {
  flex: none;
  color: var(--danger-color);
  font-weight: 700;
}

.month-more {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--accent-color);
  padding-left: var(--gutter-space-third);
}

@container app (max-width: 899.98px) {
  .week {
    grid-template-columns: minmax(0, 1fr);
  }

  .week-day {
    border-left: 0;
    border-top: 1px solid var(--rule-color);
  }
}
</style>
