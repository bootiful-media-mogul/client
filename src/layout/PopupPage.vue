<style>
/* hidden by default; .is-open shows it */
.expanding-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9998;
  overflow-y: auto; /* so tall content can scroll */
  transform-origin: top right;
  transform: scale(0); /* start collapsed in top-right */
  opacity: 0;
  pointer-events: none;
}

/* animation class */
.expanding-panel.is-open {
  animation: expandPanel 350ms ease-out forwards;
  pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
  .expanding-panel.is-open {
    animation: none;
    transform: none;
    opacity: 1;
  }
}

/* the actual raised background that fades in */
.expanding-panel__bg {
  min-height: 100vh;
  /* start transparent at the top-right, go to the raised color */
  background: var(--raised-color);
  color: var(--ink-color);
  padding: 24px;
  box-sizing: border-box;
}

@keyframes expandPanel {
  0% {
    transform: scale(0);
    opacity: 0;
    background: transparent;
  }
  40% {
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
    background: var(--raised-color);
  }
}

/* the close button stays at the top right as the page scrolls under it */
.expanding-panel__bar {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
}

.panel-close {
  background: var(--panel-bg-color);
  color: var(--ink-color);
  border: none;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 4px;
}
</style>
<template>
  <slot :open="openPanelFunction"> {{ t('popup.default-content') }} </slot>

  <!-- in the body, not here: the app's layout is a size container, and a size container is
       the containing block for anything fixed inside it, so the page would only cover it -->
  <Teleport to="body">
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- escape closes it from anywhere inside -->
    <div
      ref="expandingPanel"
      :aria-hidden="!isOpen"
      :aria-label="label"
      :class="{ 'is-open': isOpen }"
      :inert="!isOpen"
      aria-modal="true"
      class="expanding-panel"
      role="dialog"
      @keydown.esc="closePanelFunction"
    >
      <div class="expanding-panel__bg">
        <div class="expanding-panel__bar">
          <button ref="closePanel" class="panel-close" type="button" @click="closePanelFunction">
            {{ t('popup.close') }}
          </button>
        </div>
        <slot v-if="isOpen" name="panel" :close="closePanelFunction" />
      </div>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
/*
  a page that grows out of the top right corner over everything else. the default slot is
  what opens it, and gets an `open` function; the `panel` slot is the page, and gets a
  `close`. or drive it from outside with v-model:open.
 */

import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = withDefaults(defineProps<{ open?: boolean; label?: string }>(), {
  open: false,
  label: undefined
})
const emit = defineEmits<{ 'update:open': [open: boolean] }>()

const expandingPanel = ref<HTMLElement>()
const closePanel = ref<HTMLElement>()
const isOpen = ref<boolean>(props.open)

// whatever had the focus before it opened gets it back when it closes
let opener: HTMLElement | null = null

watch(
  () => props.open,
  (open) => (open ? openPanelFunction() : closePanelFunction())
)

watch(isOpen, async (open) => {
  emit('update:open', open)
  if (open) {
    opener = document.activeElement as HTMLElement | null
    await nextTick()
    closePanel.value?.focus()
  } else {
    opener?.focus()
    opener = null
  }
})

function openPanelFunction() {
  isOpen.value = true
}

function closePanelFunction() {
  isOpen.value = false
}
</script>
