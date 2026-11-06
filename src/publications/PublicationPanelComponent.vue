<script lang="ts" setup>
import { inject, onMounted, useSlots } from 'vue'
import type { RegisterChildFunction } from '@/publications/input'

const slots = useSlots()

/**
 * a plugin's panel. the panel slot holds whatever the plugin needs the user to fill in;
 * the publish and schedule buttons beneath it come from the section, so they're the same
 * under every plugin. pass `publish` to get them, and `label` and `enabled` to say what
 * the main button says and when it can be pressed. a panel with no `publish` (one that
 * has nothing to publish yet) gets no buttons at all.
 */
const props = withDefaults(
  defineProps<{
    plugin: string
    icon?: string
    iconHover?: string
    label?: string
    enabled?: boolean
    schedulable?: boolean
    publish?: (scheduled: Date | null) => Promise<unknown> | unknown
  }>(),
  { enabled: true, schedulable: true }
)

const registerChild = inject<RegisterChildFunction>('registerPublicationPanel')!

onMounted(() => {
  if (slots.panel) {
    const publish = props.publish
    registerChild({
      icon: { icon: props.icon!, iconHover: props.iconHover! },
      panel: slots.panel,
      selected: false,
      plugin: props.plugin,
      action: publish
        ? {
            label: () => props.label,
            enabled: () => props.enabled,
            schedulable: () => props.schedulable,
            publish: async (scheduled: Date | null) => await props.publish!(scheduled)
          }
        : undefined
    })
  }
})
</script>
<template>
  <div></div>
</template>
