<template>
  <div class="tab-bar-wrapper">
    <!-- Tab Bar UI (visible on mobile only) -->
    <nav class="tab-bar-container" :aria-label="t('app.tabs.label')">
      <div v-if="$slots.header" class="tab-bar-header">
        <slot name="header"></slot>
      </div>
      <!-- eslint-disable-next-line vuejs-accessibility/interactive-supports-focus -- the tabs inside it take focus, not the list -->
      <div class="tab-bar" role="tablist" @keydown="onKeydown">
        <button
          v-for="tab in registeredTabs"
          :id="tabIdFor(tab.id)"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :aria-controls="panelIdFor(tab.id)"
          :tabindex="activeTab === tab.id ? 0 : -1"
          :class="['tab', { 'tab-active': activeTab === tab.id }]"
          @click="selectTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="tab-bar-bumper"><div class="tab-bar-bumper-corners"></div></div>
    </nav>
    <slot></slot>
  </div>
</template>

<style scoped>
.tab-bar-bumper {
  background-color: var(--topbar-color);
  position: relative;
  margin-bottom: var(--gutter-space);
}

.tab-bar-bumper-corners {
  border-top-left-radius: var(--radius);
  border-top-right-radius: var(--radius);
  background-color: var(--bg-color);
  height: var(--gutter-space);
}

.tab-bar-container {
  display: block;
}

/* the same near-black as the wide layout's top bar, with the header (the wordmark)
   centered above the tabs */
.tab-bar-header {
  background-color: var(--topbar-color);
  display: flex;
  justify-content: center;
  padding: var(--gutter-space-half) var(--gutter-space) var(--gutter-space-third);
  --brand-size: 1.375rem;
}

.tab-bar {
  display: flex;
  background-color: var(--topbar-color);
  padding-left: var(--gutter-space);
  gap: var(--gutter-space-half);
  padding-top: var(--gutter-space-third);
  padding-bottom: 0;
}

.tab {
  /* a button, so undo what the browser and base.css give one */
  border: 0;
  margin: 0;
  line-height: inherit;
  background-color: transparent;
  cursor: pointer;
  text-align: center;
  font-size: var(--font-size-sm);
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--chrome-ink-color);
  font-family: var(--font-mono);
  padding: var(--gutter-space-third);
  padding-bottom: var(--gutter-space);
  text-decoration: none;
  border-radius: var(--radius) var(--radius) 0 0;
}

.tab-active {
  background-color: var(--raised-color);
  color: var(--ink-color);
}

.tab:hover:not(.tab-active) {
  background-color: var(--chrome-hover-color);
  color: var(--chrome-ink-color);
}

/* Hide on desktop */
@container app (min-width: 900px) {
  .tab-bar-container {
    display: none;
  }

  .tab-bar-wrapper {
    display: contents;
  }
}
</style>

<script lang="ts" setup>
import { onUnmounted, provide, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { TabRegistration } from '@/layout/tabbar'
import { panelIdFor, tabIdFor } from '@/layout/tabbar'

const { t } = useI18n()

const route = useRoute()
const registeredTabs = ref<TabRegistration[]>([])
const activeTab = ref<string>('')
const lastManualActivation = ref<number>(0)

const registerTab = (tab: TabRegistration) => {
  // Prevent duplicate registration
  const exists = registeredTabs.value.find((t) => t.id === tab.id)
  if (exists) {
    return
  }

  registeredTabs.value.push(tab)
  // Set first registered tab as active
  if (registeredTabs.value.length === 1) {
    activeTab.value = tab.id
  }
}

const getActiveTab = () => {
  return activeTab.value
}

const selectTab = (tabId: string) => {
  activeTab.value = tabId
}

const setActiveTab = (tabId: string) => {
  // Track manual tab activation (from sidebar-panel-opened events)
  lastManualActivation.value = Date.now()
  activeTab.value = tabId
}

// Watch for route changes and activate the first (main) tab
// but only if a tab wasn't just manually activated
watch(
  () => route.path,
  () => {
    const timeSinceManualActivation = Date.now() - lastManualActivation.value
    // Only auto-activate main tab if no manual activation in last 100ms
    if (registeredTabs.value.length > 0 && timeSinceManualActivation > 100) {
      activeTab.value = registeredTabs.value[0].id
    }
  }
)

// the tabs only exist below the desktop break; above it every tab's content is on screen
// at once, and calling them tab panels would describe a widget nobody can see. .frame
// fills the window, so the window's width stands in for the container's
const narrowQuery = window.matchMedia('(max-width: 899.98px)')
const narrow = ref(narrowQuery.matches)
const onNarrowChange = (e: MediaQueryListEvent) => (narrow.value = e.matches)
narrowQuery.addEventListener('change', onNarrowChange)
onUnmounted(() => narrowQuery.removeEventListener('change', onNarrowChange))

// the arrow keys move between tabs, as they do in any tab strip; only the active tab is
// in the tab order, so tab leaves the strip rather than walking through it
function onKeydown(event: KeyboardEvent) {
  const tabs = registeredTabs.value
  const current = tabs.findIndex((tab) => tab.id === activeTab.value)
  if (current < 0) return
  let next: number
  switch (event.key) {
    case 'ArrowRight':
      next = (current + 1) % tabs.length
      break
    case 'ArrowLeft':
      next = (current - 1 + tabs.length) % tabs.length
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = tabs.length - 1
      break
    default:
      return
  }
  event.preventDefault()
  selectTab(tabs[next].id)
  document.getElementById(tabIdFor(tabs[next].id))?.focus()
}

provide('tabsNarrow', narrow)
provide('registerTab', registerTab)
provide('getActiveTab', getActiveTab)
provide('setActiveTab', setActiveTab)
</script>
