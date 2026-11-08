<!--
  a button that drops a panel down under itself, over whatever follows it on the page. the
  trigger slot is what the button says; the default slot is what drops down.

  it closes the way a dropdown should: escape (from anywhere, since Safari doesn't focus a
  button that's clicked and the key can come from wherever focus was before), a click
  outside it, or focus moving outside it. escape puts focus back on the button.

  `v-model:open` is there for a parent that needs to know or set whether it's open; leave
  it off and the dropdown keeps track itself.

  mind where it goes: a container with `overflow: hidden` (a publication panel, say) cuts
  the panel off, so the panel is capped in height and scrolls, and the space under the
  button should be at least that tall.
-->
<template>
  <div ref="root" class="dropdown" @focusout="onFocusOut">
    <button
      ref="trigger"
      type="button"
      class="pure-button dropdown-trigger"
      :aria-expanded="open"
      :aria-controls="panelId"
      :disabled="disabled"
      @click="open = !open"
    >
      <slot name="trigger"></slot>
      <span class="dropdown-caret" aria-hidden="true">▾</span>
    </button>
    <div v-if="open" :id="panelId" class="dropdown-panel">
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onUnmounted, ref, useId, watch } from 'vue'

const props = withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })

const open = defineModel<boolean>('open', { default: false })

const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const panelId = `dropdown-${useId()}`

function close(refocus: boolean) {
  open.value = false
  if (refocus) trigger.value?.focus()
}

function onFocusOut(event: FocusEvent) {
  // focus going nowhere (the window losing it, say) isn't a reason to close
  const next = event.relatedTarget as Node | null
  if (next && !root.value?.contains(next)) close(false)
}

function onPointerDown(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) close(false)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close(true)
}

function stopListening() {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
}

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeydown)
  } else {
    stopListening()
  }
})

// a dropdown that's disabled while it's open (the form it's in starts submitting) closes
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) close(false)
  }
)

onUnmounted(stopListening)
</script>

<style scoped>
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  margin: 0;
}

.dropdown-caret {
  margin-left: var(--gutter-space-third);
}

/* raised over what follows. base.css lifts every input and textarea to z-index 20, so the
   panel sits above that or a field after the dropdown draws through it */
.dropdown-panel {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 30;
  margin-top: var(--gutter-space-third);
  width: max-content;
  min-width: 100%;
  max-width: min(24em, 90vw);
  max-height: min(24em, 60vh);
  overflow-y: auto;
  background-color: var(--raised-color);
  color: var(--ink-color);
  border-radius: var(--radius);
  box-shadow: var(--box-shadow);
  padding: var(--gutter-space-third);
}
</style>
