<style>
.search-input-panel input {
  width: max(400px, 100%);
}

/* hidden by default; JS will add .is-open */
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

/* the actual raised background that fades in */
.expanding-panel__bg {
  min-height: 100vh;
  /* start transparent at the top-right, go to the raised color */
  background: var(--raised-color);
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

/* optional: close button inside */
.panel-close {
  position: sticky;
  top: 0;
  right: 0;
  display: inline-block;
  margin-left: auto;
  background: var(--panel-bg-color);
  color: var(--ink-color);
  border: none;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 4px;
}
</style>
<template>
  <div ref="openPanelElement">
    <slot :open="openPanelFunction"> {{ t('popup.default-content') }} </slot>
  </div>

  <div class="expanding-panel" ref="expandingPanel" aria-hidden="true">
    <div class="expanding-panel__bg">
      <button class="panel-close" ref="closePanel">{{ t('popup.close') }}</button>
      <div>
        <!-- the search forms -->

        <!-- the search forms -->
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
/*
  todo could we extract out the component machinery behind this for some thing more reusable?
       wouldn't that be more fun than actually building a feature? yes. yes it would.
 */

import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const openPanelElement = ref<HTMLElement>()
const expandingPanel = ref<HTMLElement>()
const closePanel = ref<HTMLElement>()

onMounted(() => {
  closePanel!!.value!!.addEventListener('click', closePanelFunction)
})

function openPanelFunction() {
  const element = expandingPanel!!.value!!
  element.classList.add('is-open')
  element.setAttribute('aria-hidden', 'false')
}

function closePanelFunction() {
  const element = expandingPanel!!.value!!
  element.classList.remove('is-open')
  element.setAttribute('aria-hidden', 'true')
}
</script>
