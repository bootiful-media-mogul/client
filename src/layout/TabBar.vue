<template>
  <div class="tab-bar-wrapper">
    <!-- Tab Bar UI (visible on mobile only) -->
    <div class="tab-bar-container">
      <div v-if="$slots.header" class="tab-bar-header">
        <slot name="header"></slot>
      </div>
      <div class="tab-bar">
        <a
          href="#"
          v-for="tab in registeredTabs"
          :key="tab.id"
          :class="['tab', { 'tab-active': activeTab === tab.id }]"
          @click.prevent="selectTab(tab.id)"
          >{{ tab.label }}</a
        >
      </div>
      <div class="tab-bar-bumper"><div class="tab-bar-bumper-corners"></div></div>
    </div>
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
import { provide, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { TabRegistration } from '@/layout/tabbar'

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

provide('registerTab', registerTab)
provide('getActiveTab', getActiveTab)
provide('setActiveTab', setActiveTab)
</script>
