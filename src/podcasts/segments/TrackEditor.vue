<script lang="ts">
// Several editors can be open at once (one per segment row). Keyboard shortcuts are
// window-wide, so only the editor the user last interacted with handles them.
let activeEditor: symbol | null = null

export interface TrackClip {
  id: string | number
  name: string
  duration: number // seconds
  waveform?: number[]
  audioUrl?: string
}

// A segment maps sourceStart..sourceEnd in the original file to timelineStart.
export interface TrackSegment {
  id: string
  timelineStart: number
  sourceStart: number
  sourceEnd: number
}

export interface TrackSelection {
  start: number
  end: number
}

// edit events: { operation, clipId, segments, timelineDuration, ...operationDetails }
export interface TrackEdit {
  operation: string
  clipId: string | number
  segments: TrackSegment[]
  timelineDuration: number
  [detail: string]: unknown
}

type Gesture =
  | { type: 'range'; pointerId: number; moved: boolean; start: number }
  | {
      type: 'move' | 'trim'
      pointerId: number
      moved: boolean
      id: string
      startX: number
      original: number
    }
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  ChevronDown,
  GripVertical,
  Minus,
  MousePointer2,
  MoveHorizontal,
  Pause,
  Play,
  Plus,
  Redo2,
  Scissors,
  SkipBack,
  Trash2,
  Undo2,
  Volume2
} from 'lucide-vue-next'
import Waveform from './Waveform.vue'

const props = defineProps<{ clip: TrackClip }>()
const emit = defineEmits<{
  edit: [edit: TrackEdit]
  'selection-change': [selection: TrackSelection | null]
}>()

const segments = ref<TrackSegment[]>([])
const selection = ref<TrackSelection | null>(null)
const playhead = ref(0)
const zoom = ref(4)
const tool = ref<'range' | 'move'>('range')
const scrollArea = ref<HTMLElement | null>(null)
const ruler = ref<HTMLElement | null>(null)
const isPlaying = ref(false)
const canUndo = ref(false)
const canRedo = ref(false)
const history: TrackSegment[][] = []
const future: TrackSegment[][] = []
let gesture: Gesture | null = null
let audio: HTMLAudioElement | null = null
let frame: number | null = null
let playbackStart = 0
let playbackAt = 0
let idSequence = 0
const editorToken = Symbol('track-editor')
function activate() {
  activeEditor = editorToken
}
activate()

const EPSILON = 0.02
const round = (value: number) => Math.round(value * 1000) / 1000
const endOf = (segment: TrackSegment) =>
  segment.timelineStart + segment.sourceEnd - segment.sourceStart
const timelineDuration = computed(() => Math.max(0, ...segments.value.map(endOf)))
const timelineWidth = computed(() =>
  Math.max(1100, (Math.max(props.clip.duration, timelineDuration.value) + 15) * zoom.value)
)
const selectedDuration = computed(() =>
  selection.value ? Math.max(0, selection.value.end - selection.value.start) : 0
)
const ticks = computed(() => {
  const interval = zoom.value < 4 ? 30 : zoom.value < 8 ? 15 : 10
  const count = Math.ceil(timelineWidth.value / zoom.value / interval)
  return Array.from({ length: count + 1 }, (_, index) => ({
    time: index * interval,
    x: index * interval * zoom.value
  }))
})

function formatTime(seconds: number, precise = false) {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const whole = Math.floor(safe % 60)
  const base = `${String(minutes).padStart(2, '0')}:${String(whole).padStart(2, '0')}`
  return precise ? `${base}.${String(Math.floor((safe % 1) * 100)).padStart(2, '0')}` : base
}

function cloneSegments() {
  return segments.value.map((segment) => ({ ...segment }))
}
function sorted(list: TrackSegment[]) {
  return list.sort((a, b) => a.timelineStart - b.timelineStart)
}
function publish(operation: string, details: Record<string, unknown> = {}) {
  emit('edit', {
    operation,
    clipId: props.clip.id,
    segments: cloneSegments(),
    timelineDuration: round(timelineDuration.value),
    ...details
  })
}
function remember() {
  history.push(cloneSegments())
  if (history.length > 50) history.shift()
  future.length = 0
  canUndo.value = true
  canRedo.value = false
}
function undo() {
  if (!history.length) return
  pause()
  future.push(cloneSegments())
  segments.value = history.pop()!
  canUndo.value = history.length > 0
  canRedo.value = true
  selection.value = null
  publish('undo')
}
function redo() {
  if (!future.length) return
  pause()
  history.push(cloneSegments())
  segments.value = future.pop()!
  canUndo.value = true
  canRedo.value = future.length > 0
  publish('redo')
}
function setSelection(start: number, end: number) {
  selection.value = {
    start: round(Math.max(0, Math.min(start, end))),
    end: round(Math.min(timelineDuration.value, Math.max(start, end)))
  }
  emit('selection-change', selection.value)
}
function clearSelection() {
  selection.value = null
  emit('selection-change', null)
}
function deleteSelection() {
  if (!selection.value || selectedDuration.value < EPSILON) return
  pause()
  const { start, end } = selection.value
  const removed = end - start
  remember()
  const next: TrackSegment[] = []
  for (const segment of segments.value) {
    const from = segment.timelineStart
    const to = endOf(segment)
    if (to <= start + EPSILON) next.push({ ...segment })
    else if (from >= end - EPSILON) next.push({ ...segment, timelineStart: round(from - removed) })
    else {
      if (from < start - EPSILON)
        next.push({ ...segment, sourceEnd: round(segment.sourceStart + start - from) })
      if (to > end + EPSILON)
        next.push({
          ...segment,
          id: `segment-${++idSequence}`,
          sourceStart: round(segment.sourceStart + end - from),
          timelineStart: round(start)
        })
    }
  }
  segments.value = sorted(next)
  playhead.value = Math.min(start, timelineDuration.value)
  clearSelection()
  publish('ripple-delete', { range: { start, end }, removedDuration: round(removed) })
}

function timeFromEvent(event: PointerEvent) {
  const rect = ruler.value!.getBoundingClientRect()
  return Math.max(
    0,
    Math.min(timelineWidth.value / zoom.value, (event.clientX - rect.left) / zoom.value)
  )
}
function capturePointer(event: PointerEvent) {
  ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
}
function startRange(event: PointerEvent) {
  if (event.button !== 0) return
  const start = Math.min(timelineDuration.value, timeFromEvent(event))
  pause()
  gesture = { type: 'range', start, moved: false, pointerId: event.pointerId }
  capturePointer(event)
  setSelection(start, start)
}
function startMove(event: PointerEvent, segment: TrackSegment) {
  if (event.button !== 0) return
  event.stopPropagation()
  pause()
  clearSelection()
  gesture = {
    type: 'move',
    id: segment.id,
    startX: event.clientX,
    original: segment.timelineStart,
    moved: false,
    pointerId: event.pointerId
  }
  capturePointer(event)
}
function startTrim(event: PointerEvent, segment: TrackSegment) {
  if (event.button !== 0) return
  event.stopPropagation()
  pause()
  clearSelection()
  gesture = {
    type: 'trim',
    id: segment.id,
    startX: event.clientX,
    original: segment.sourceEnd,
    moved: false,
    pointerId: event.pointerId
  }
  capturePointer(event)
}
function moveGesture(event: PointerEvent) {
  const current = gesture
  if (!current || current.pointerId !== event.pointerId) return
  if (current.type === 'range') {
    const end = Math.min(timelineDuration.value, timeFromEvent(event))
    if (Math.abs(end - current.start) > 0.05) current.moved = true
    setSelection(current.start, end)
    return
  }
  const segment = segments.value.find((item) => item.id === current.id)
  if (!segment) return
  const delta = (event.clientX - current.startX) / zoom.value
  if (Math.abs(delta) > 0.05) current.moved = true
  const order = sorted([...segments.value])
  const index = order.findIndex((item) => item.id === segment.id)
  const previous = order[index - 1]
  const next = order[index + 1]
  if (current.type === 'move') {
    const minimum = previous ? endOf(previous) : 0
    const maximum = next ? next.timelineStart - (segment.sourceEnd - segment.sourceStart) : Infinity
    segment.timelineStart = round(Math.min(maximum, Math.max(minimum, current.original + delta)))
  } else {
    const maximum = Math.min(
      props.clip.duration,
      next ? segment.sourceStart + next.timelineStart - segment.timelineStart : Infinity
    )
    segment.sourceEnd = round(
      Math.min(maximum, Math.max(segment.sourceStart + 0.1, current.original + delta))
    )
  }
}
function finishGesture(event: PointerEvent) {
  const current = gesture
  if (!current || current.pointerId !== event.pointerId) return
  if (current.type === 'range') {
    if (!current.moved) {
      playhead.value = current.start
      clearSelection()
    } else if (selectedDuration.value < EPSILON) clearSelection()
  } else {
    const segment = segments.value.find((item) => item.id === current.id)
    if (segment) {
      const field = current.type === 'move' ? 'timelineStart' : 'sourceEnd'
      if (Math.abs(segment[field] - current.original) > EPSILON) {
        // Store the state before the gesture, since the visual edit happened while dragging.
        const previous = cloneSegments()
        previous.find((item) => item.id === current.id)![field] = current.original
        history.push(previous)
        if (history.length > 50) history.shift()
        future.length = 0
        canUndo.value = true
        canRedo.value = false
        segments.value = sorted(cloneSegments())
        publish(current.type === 'move' ? 'move-segment' : 'trim-segment', {
          segmentId: segment.id,
          before: round(current.original),
          after: round(segment[field])
        })
      }
    }
  }
  gesture = null
}

function segmentAt(time: number) {
  return segments.value.find(
    (segment) => time >= segment.timelineStart && time < endOf(segment) - EPSILON
  )
}
function pause() {
  isPlaying.value = false
  if (frame) cancelAnimationFrame(frame)
  frame = null
  audio?.pause()
}
function playbackFrame(now: number) {
  if (!isPlaying.value) return
  const time = playbackAt + (now - playbackStart) / 1000
  if (time >= timelineDuration.value) {
    playhead.value = timelineDuration.value
    pause()
    return
  }
  playhead.value = time
  const segment = segmentAt(time)
  if (audio && segment) {
    const sourceTime = segment.sourceStart + time - segment.timelineStart
    if (Math.abs(audio.currentTime - sourceTime) > 0.14) audio.currentTime = sourceTime
    if (audio.paused) audio.play().catch(() => pause())
  } else audio?.pause()
  frame = requestAnimationFrame(playbackFrame)
}
function goToStart() {
  playhead.value = 0
  pause()
}
function togglePlayback() {
  if (isPlaying.value) {
    pause()
    return
  }
  if (playhead.value >= timelineDuration.value - EPSILON) playhead.value = 0
  playbackAt = playhead.value
  playbackStart = performance.now()
  isPlaying.value = true
  frame = requestAnimationFrame(playbackFrame)
}
function resetClip() {
  pause()
  if (audio) {
    audio.src = ''
    audio = null
  }
  if (props.clip.audioUrl) audio = new Audio(props.clip.audioUrl)
  segments.value = [
    {
      id: `segment-${++idSequence}`,
      timelineStart: 0,
      sourceStart: 0,
      sourceEnd: round(props.clip.duration)
    }
  ]
  history.length = 0
  future.length = 0
  canUndo.value = false
  canRedo.value = false
  playhead.value = 0
  clearSelection()
  nextTick(() => {
    if (scrollArea.value) scrollArea.value.scrollLeft = 0
  })
}
watch(() => props.clip.id, resetClip, { immediate: true })
onBeforeUnmount(() => {
  pause()
  if (audio) audio.src = ''
})

function onKeydown(event: KeyboardEvent) {
  if (activeEditor !== editorToken) return
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName ?? '')) return
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) redo()
    else undo()
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    if (selection.value) {
      event.preventDefault()
      deleteSelection()
    }
  } else if (event.code === 'Space') {
    event.preventDefault()
    togglePlayback()
  } else if (event.key.toLowerCase() === 'r') tool.value = 'range'
  else if (event.key.toLowerCase() === 'v') tool.value = 'move'
  else if (event.key === 'Escape') clearSelection()
}
window.addEventListener('keydown', onKeydown)
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (activeEditor === editorToken) activeEditor = null
})
</script>

<template>
  <section class="editor" aria-label="Audio track editor" @pointerdown.capture="activate">
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button
          class="transport-button"
          @click="goToStart"
          aria-label="Go to start"
          title="Go to start"
        >
          <SkipBack :size="17" />
        </button>
        <button
          class="play-button"
          @click="togglePlayback"
          :aria-label="isPlaying ? 'Pause' : 'Play'"
          :title="isPlaying ? 'Pause (Space)' : 'Play (Space)'"
        >
          <Pause v-if="isPlaying" :size="16" fill="currentColor" /><Play
            v-else
            :size="16"
            fill="currentColor"
          />
        </button>
        <span class="time-display"
          >{{ formatTime(playhead, true) }}
          <span>/ {{ formatTime(timelineDuration, true) }}</span></span
        >
      </div>
      <div class="toolbar-divider" />
      <div class="toolbar-group tool-group" aria-label="Timeline tools">
        <button
          :class="['tool-button', { active: tool === 'range' }]"
          @click="tool = 'range'"
          title="Range tool (R)"
        >
          <MousePointer2 :size="16" /> <span>Range</span>
        </button>
        <button
          :class="['tool-button', { active: tool === 'move' }]"
          @click="tool = 'move'"
          title="Move tool (V)"
        >
          <MoveHorizontal :size="16" /> <span>Move</span>
        </button>
      </div>
      <div class="toolbar-spacer" />
      <div class="toolbar-group">
        <button
          class="icon-button"
          :disabled="!canUndo"
          @click="undo"
          aria-label="Undo"
          title="Undo (⌘/Ctrl Z)"
        >
          <Undo2 :size="17" />
        </button>
        <button
          class="icon-button"
          :disabled="!canRedo"
          @click="redo"
          aria-label="Redo"
          title="Redo (⌘/Ctrl Shift Z)"
        >
          <Redo2 :size="17" />
        </button>
      </div>
      <div class="toolbar-divider" />
      <div class="toolbar-group zoom-group">
        <button
          class="icon-button"
          @click="zoom = Math.max(2, zoom - 1)"
          :disabled="zoom <= 2"
          aria-label="Zoom out"
        >
          <Minus :size="16" />
        </button>
        <span class="zoom-label">{{ Math.round((zoom / 4) * 100) }}%</span>
        <button
          class="icon-button"
          @click="zoom = Math.min(16, zoom + 1)"
          :disabled="zoom >= 16"
          aria-label="Zoom in"
        >
          <Plus :size="16" />
        </button>
      </div>
    </div>

    <div class="timeline-shell">
      <div class="track-sidebar">
        <div class="sidebar-ruler-label">TIMELINE</div>
        <div class="track-identity">
          <div class="track-number">01</div>
          <div>
            <strong>Audio 1</strong><small><Volume2 :size="12" /> Stereo · MP3</small>
          </div>
          <ChevronDown :size="15" class="identity-chevron" />
        </div>
        <div class="sidebar-foot">SOURCE TRACK</div>
      </div>
      <div ref="scrollArea" class="timeline-scroll">
        <div class="timeline-content" :style="{ width: `${timelineWidth}px` }">
          <div
            ref="ruler"
            class="ruler"
            @pointerdown="startRange"
            @pointermove="moveGesture"
            @pointerup="finishGesture"
            @pointercancel="finishGesture"
          >
            <div
              v-for="tick in ticks"
              :key="tick.time"
              class="tick"
              :style="{ left: `${tick.x}px` }"
            >
              <span>{{ formatTime(tick.time) }}</span>
            </div>
          </div>
          <div
            class="track-lane"
            :class="{ 'move-mode': tool === 'move' }"
            @pointerdown="tool === 'range' && startRange($event)"
            @pointermove="moveGesture"
            @pointerup="finishGesture"
            @pointercancel="finishGesture"
          >
            <div
              v-for="segment in segments"
              :key="segment.id"
              class="audio-segment"
              :style="{
                left: `${segment.timelineStart * zoom}px`,
                width: `${(segment.sourceEnd - segment.sourceStart) * zoom}px`
              }"
              @pointerdown="tool === 'move' && startMove($event, segment)"
            >
              <div class="segment-top">
                <button
                  class="segment-grip"
                  @pointerdown="startMove($event, segment)"
                  :aria-label="`Move ${clip.name}`"
                  title="Drag to move clip"
                >
                  <GripVertical :size="14" /></button
                ><span class="segment-name">{{ clip.name }}</span
                ><span class="segment-length">{{
                  formatTime(segment.sourceEnd - segment.sourceStart)
                }}</span>
              </div>
              <Waveform
                :peaks="clip.waveform || []"
                :source-start="segment.sourceStart"
                :source-end="segment.sourceEnd"
                :source-duration="clip.duration"
              />
              <div class="segment-source">
                SOURCE {{ formatTime(segment.sourceStart) }} — {{ formatTime(segment.sourceEnd) }}
              </div>
              <button
                class="trim-handle"
                @pointerdown="startTrim($event, segment)"
                @pointermove="moveGesture"
                @pointerup="finishGesture"
                @pointercancel="finishGesture"
                :aria-label="`Extend right edge of ${clip.name}`"
                title="Drag to reveal or trim source audio"
              >
                <span />
              </button>
            </div>
            <div
              v-if="selection && selectedDuration > 0"
              class="range-selection"
              :style="{
                left: `${selection.start * zoom}px`,
                width: `${selectedDuration * zoom}px`
              }"
            >
              <div class="selection-label">{{ formatTime(selectedDuration, true) }} selected</div>
            </div>
          </div>
          <div class="timeline-void"><div class="void-line" /></div>
          <div class="playhead" :style="{ left: `${playhead * zoom}px` }">
            <div class="playhead-head" />
            <div class="playhead-line" />
          </div>
        </div>
      </div>
    </div>

    <div class="editor-footer">
      <div class="selection-status">
        <Scissors :size="15" /><template v-if="selection && selectedDuration > 0"
          ><strong
            >{{ formatTime(selection.start, true) }} → {{ formatTime(selection.end, true) }}</strong
          ><span>{{ formatTime(selectedDuration, true) }} selected</span></template
        ><span v-else>Drag across the track to select a range</span>
      </div>
      <button class="delete-button" :disabled="selectedDuration < 0.02" @click="deleteSelection">
        <Trash2 :size="15" /> Delete range <kbd>⌫</kbd>
      </button>
    </div>
  </section>
</template>

<style scoped>
/* layout ported from the ~/Desktop/timeline prototype; colors follow mogul: a cadetblue
   page, lightgray panels, black controls with white text. */
.editor {
  --te-ink: black;
  --te-muted: #555;
  --te-faint: #777;
  --te-line: #c8c8c8;
  --te-surface: white;
  --te-chrome: #f2f2f2;
  --te-hover: #e2e2e2;
  --te-accent: var(--bg-color, cadetblue);
  --te-accent-light: color-mix(in srgb, var(--te-accent) 22%, white);
  --te-accent-dark: #2f6b6d;
  --te-disabled: #767676;
}
.editor,
.editor * {
  box-sizing: border-box;
}
.editor button {
  font: inherit;
  cursor: pointer;
}
.editor button:disabled {
  cursor: not-allowed;
}
.editor {
  color: var(--te-ink);
  border: 1px solid var(--te-ink);
  border-radius: var(--radius);
  background: var(--te-surface);
  overflow: hidden;
}
.editor-toolbar {
  height: 58px;
  display: flex;
  align-items: center;
  gap: 17px;
  padding: 0 17px;
  border-bottom: 1px solid var(--te-ink);
  background: var(--te-chrome);
}
.toolbar-group {
  display: flex;
  align-items: center;
  gap: 7px;
}
.toolbar-divider {
  height: 24px;
  width: 1px;
  background: var(--te-line);
}
.toolbar-spacer {
  flex: 1;
}
.transport-button,
.icon-button {
  width: 30px;
  height: 30px;
  border: 0;
  background: transparent;
  color: var(--te-ink);
  display: grid;
  place-items: center;
  border-radius: 6px;
}
.transport-button:hover,
.icon-button:not(:disabled):hover {
  background: var(--te-hover);
}
.icon-button:disabled {
  opacity: 0.35;
}
.play-button {
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  border: 0;
  background: var(--te-ink);
  border-radius: 7px;
  color: white;
}
.play-button:hover {
  background: #333;
}
.time-display {
  font-family: 'JetBrains Mono', monospace;
  color: var(--te-ink);
  font-size: 11px;
  font-weight: 600;
  margin-left: 9px;
  white-space: nowrap;
}
.time-display span {
  color: var(--te-faint);
  font-weight: 400;
}
.tool-button {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--te-muted);
  background: transparent;
  border: 1px solid transparent;
  padding: 7px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}
.tool-button.active {
  border-color: var(--te-ink);
  background: var(--te-ink);
  color: white;
}
.tool-button:hover:not(.active) {
  background: var(--te-hover);
  color: var(--te-ink);
}
.zoom-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--te-muted);
  min-width: 35px;
  text-align: center;
}
.timeline-shell {
  display: flex;
  height: 250px;
}
.track-sidebar {
  width: 154px;
  min-width: 154px;
  border-right: 1px solid var(--te-line);
  background: var(--te-chrome);
}
.sidebar-ruler-label {
  height: 36px;
  border-bottom: 1px solid var(--te-line);
  display: flex;
  align-items: center;
  padding-left: 17px;
  color: var(--te-faint);
  letter-spacing: 1.3px;
  font-size: 9px;
  font-weight: 700;
}
.track-identity {
  height: 153px;
  padding: 17px 12px;
  display: flex;
  align-items: flex-start;
  gap: 9px;
  border-bottom: 1px solid var(--te-line);
}
.track-number {
  width: 27px;
  height: 25px;
  background: var(--te-ink);
  color: white;
  border-radius: 4px;
  display: grid;
  place-items: center;
  font:
    600 10px 'JetBrains Mono',
    monospace;
}
.track-identity strong {
  font-size: 11px;
  display: block;
  color: var(--te-ink);
  margin: 1px 0 7px;
}
.track-identity small {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  color: var(--te-muted);
  white-space: nowrap;
}
.identity-chevron {
  color: var(--te-faint);
  margin-left: auto;
  margin-top: 3px;
}
.sidebar-foot {
  font-size: 9px;
  letter-spacing: 1.2px;
  color: var(--te-faint);
  padding: 15px 17px;
}
.timeline-scroll {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-color: #999 var(--te-chrome);
  scrollbar-width: thin;
}
.timeline-content {
  position: relative;
  height: 228px;
}
.ruler {
  height: 36px;
  position: relative;
  background: var(--te-chrome);
  border-bottom: 1px solid var(--te-line);
  touch-action: none;
  cursor: crosshair;
}
.tick {
  position: absolute;
  top: 0;
  height: 36px;
  border-left: 1px solid #b4b4b4;
  pointer-events: none;
}
.tick:after {
  content: '';
  position: absolute;
  left: 29px;
  bottom: 0;
  height: 6px;
  border-left: 1px solid #d4d4d4;
}
.tick span {
  position: absolute;
  left: 6px;
  top: 8px;
  color: var(--te-muted);
  font:
    10px 'JetBrains Mono',
    monospace;
  white-space: nowrap;
}
.track-lane {
  height: 153px;
  position: relative;
  background: repeating-linear-gradient(to right, transparent 0, transparent 74px, #ececec 75px),
    var(--te-surface);
  border-bottom: 1px solid var(--te-line);
  touch-action: none;
  cursor: crosshair;
}
.track-lane.move-mode {
  cursor: default;
}
.audio-segment {
  height: 132px;
  position: absolute;
  top: 10px;
  background: var(--te-accent-light);
  border: 1px solid var(--te-ink);
  border-radius: 5px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  touch-action: none;
}
.move-mode .audio-segment {
  cursor: grab;
}
.segment-top {
  height: 25px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0 20px 0 3px;
  background: var(--te-ink);
  min-width: 0;
}
.segment-grip {
  height: 21px;
  width: 17px;
  border: 0;
  background: transparent;
  color: #ccc;
  display: grid;
  place-items: center;
  padding: 0;
  cursor: grab;
  flex: none;
}
.segment-name {
  font-size: 10px;
  color: white;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.segment-length {
  font:
    9px 'JetBrains Mono',
    monospace;
  color: #ccc;
  margin-left: auto;
  white-space: nowrap;
}
.audio-segment .waveform {
  height: 70px;
  margin: 6px 0 1px;
  color: var(--te-accent-dark);
}
.segment-source {
  font:
    9px 'JetBrains Mono',
    monospace;
  color: var(--te-muted);
  padding: 3px 10px;
  white-space: nowrap;
}
.trim-handle {
  position: absolute;
  right: 0;
  top: 0;
  width: 10px;
  height: 100%;
  border: 0;
  border-left: 1px solid rgba(0, 0, 0, 0.3);
  background: rgba(0, 0, 0, 0.08);
  padding: 0;
  cursor: ew-resize;
  touch-action: none;
}
.trim-handle:hover {
  background: rgba(0, 0, 0, 0.2);
}
.trim-handle span {
  position: absolute;
  top: 57px;
  left: 3px;
  width: 2px;
  height: 17px;
  border-radius: 2px;
  background: var(--te-ink);
}
.range-selection {
  position: absolute;
  top: 0;
  height: 153px;
  background: rgba(0, 0, 0, 0.12);
  border-left: 2px solid var(--te-ink);
  border-right: 2px solid var(--te-ink);
  pointer-events: none;
  z-index: 3;
}
.selection-label {
  position: absolute;
  top: -31px;
  left: 0;
  white-space: nowrap;
  color: white;
  background: var(--te-ink);
  padding: 4px 7px;
  border-radius: 4px;
  font:
    9px 'JetBrains Mono',
    monospace;
}
.timeline-void {
  height: 39px;
  background: var(--te-chrome);
  position: relative;
}
.void-line {
  height: 1px;
  background: var(--te-line);
  position: absolute;
  top: 12px;
  width: 100%;
}
.playhead {
  position: absolute;
  top: 0;
  height: 228px;
  width: 1px;
  pointer-events: none;
  z-index: 5;
}
.playhead-head {
  position: absolute;
  top: 0;
  left: -4px;
  width: 9px;
  height: 11px;
  background: var(--te-ink);
  clip-path: polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%);
}
.playhead-line {
  position: absolute;
  top: 10px;
  bottom: 0;
  border-left: 1px solid var(--te-ink);
}
.editor-footer {
  height: 53px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 17px;
  border-top: 1px solid var(--te-ink);
  background: var(--te-chrome);
}
.selection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--te-muted);
  font-size: 11px;
}
.selection-status svg {
  color: var(--te-ink);
}
.selection-status strong {
  color: var(--te-ink);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
}
.delete-button {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--te-ink);
  background: var(--te-ink);
  color: white;
  border-radius: var(--button-radius, 6px);
  padding: 7px 9px;
  font-size: 10px;
  font-weight: 700;
}
.delete-button:hover:not(:disabled) {
  background: #333;
}
.delete-button:disabled {
  border-color: var(--te-disabled);
  background: var(--te-disabled);
  color: white;
}
.delete-button kbd {
  font-size: 12px;
  margin-left: 5px;
  color: inherit;
}
@media (max-width: 1050px) {
  .tool-group span {
    display: none;
  }
}
@media (max-width: 760px) {
  .toolbar-divider {
    display: none;
  }
  .editor-toolbar {
    gap: 6px;
    padding: 0 8px;
  }
  .time-display {
    font-size: 9px;
    margin-left: 1px;
  }
  .track-sidebar {
    width: 112px;
    min-width: 112px;
  }
  .track-identity {
    padding: 15px 6px;
    gap: 5px;
  }
  .identity-chevron {
    display: none;
  }
  .sidebar-ruler-label {
    padding-left: 7px;
  }
  .sidebar-foot {
    padding-left: 7px;
  }
  .zoom-group {
    gap: 0;
  }
}
@media (max-width: 520px) {
  .tool-button {
    padding: 5px;
  }
  .tool-button span,
  .zoom-label,
  .time-display span {
    display: none;
  }
  .editor-footer {
    padding: 0 8px;
  }
  .selection-status {
    font-size: 9px;
  }
  .delete-button {
    font-size: 0;
  }
  .delete-button svg {
    width: 15px;
  }
  .delete-button kbd {
    font-size: 10px;
  }
}
</style>
