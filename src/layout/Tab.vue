<script lang="ts" setup>
import { inject, onMounted, useSlots, computed, ref } from 'vue'
import type { Ref } from 'vue'
import { panelIdFor, tabIdFor } from '@/layout/tabbar'
import type {
  RegisterTabFunction,
  GetActiveTabFunction,
  SetActiveTabFunction
} from '@/layout/tabbar'
import { events } from '@/services'

interface Props {
  label: string
}

const props = defineProps<Props>()
const slots = useSlots()
const element = ref<HTMLElement>()
const registerTab = inject<RegisterTabFunction>('registerTab')
const getActiveTab = inject<GetActiveTabFunction>('getActiveTab')
const setActiveTab = inject<SetActiveTabFunction>('setActiveTab')
const narrow = inject<Ref<boolean>>('tabsNarrow', ref(false))

// Generate a unique ID based on the label
const tabId = computed(() => {
  return props.label.toLowerCase().replace(/\s+/g, '-')
})

const isActive = computed(() => {
  return getActiveTab?.() === tabId.value
})

onMounted(() => {
  if (slots.default && registerTab) {
    registerTab({
      id: tabId.value,
      label: props.label,
      slot: slots.default,
      visible: true
    })
  }
})

// Listen for sidebar panel events and activate this tab if the panel is within it
events.on('sidebar-panel-opened', (event: any) => {
  if (element.value && element.value.contains(event)) {
    setActiveTab?.(tabId.value)
  }
})
</script>

<template>
  <div
    ref="element"
    :id="panelIdFor(tabId)"
    class="tab-wrapper"
    :class="{ 'tab-hidden': !isActive }"
    :role="narrow ? 'tabpanel' : undefined"
    :aria-labelledby="narrow ? tabIdFor(tabId) : undefined"
  >
    <slot></slot>
  </div>
</template>

<style scoped>
/* Mobile: hide inactive tabs */
.tab-hidden {
  display: none !important;
}

/* Desktop: show all tabs, use contents to not interfere with grid */
@container app (min-width: 900px) {
  .tab-wrapper {
    display: contents;
  }

  .tab-hidden {
    display: contents !important;
  }
}
</style>
