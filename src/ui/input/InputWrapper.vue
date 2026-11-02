<template>
  <div class="writing-tools-container">
    <div v-if="panelVisible" class="toolbar">
      <div v-for="(slot, index) in childSlots" :key="index">
        <div v-if="slot.panelVisible">
          <component :is="slot.toolbar"></component>
        </div>
      </div>
    </div>
    <div ref="root" class="input-wrapper">
      <slot></slot>
    </div>
    <div class="word-count">
      <div class="status">{{ characterCount }}</div>
    </div>
    <div class="icon-column">
      <InputWrapperMenu
        :disabled="panelVisible || childSlots.length <= 1"
        :enableDownArrow="enableDownArrow()"
        :enableUpArrow="enableUpArrow()"
        class="icon-column-menu"
        @down="down"
        @up="up"
      >
        <div
          v-for="(slot, index) in childSlots"
          :key="index"
          class="icon unselectable"
          @click="togglePanel(slot)"
        >
          <div v-if="panelVisible && slot.iconVisible">
            <div class="close-icon"></div>
          </div>
          <div v-else>
            <component :is="slot.icon" v-if="slot.iconVisible"></component>
          </div>
        </div>
      </InputWrapperMenu>
    </div>
    <div v-if="panelVisible" class="input-panel">
      <div v-for="(slot, index) in childSlots" :key="index">
        <div v-if="slot.panelVisible">
          <component :is="slot.panel"></component>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
type TextInputElement = HTMLInputElement | HTMLTextAreaElement

import { computed, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import InputWrapperMenu from '@/ui/input/InputWrapperMenu.vue'
import type { PanelSlot } from './input'

import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{ modelValue: string | null }>()
const characterCount = computed(() => {
  const count = props.modelValue?.length ?? 0
  return count === 0
    ? t('components.inputWrapper.empty')
    : t('components.inputWrapper.character-count', count)
})
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()
const root = ref<HTMLElement>()
const inputElement = ref<TextInputElement>()
const childSlots = ref<Array<PanelSlot>>([])
const inputEvents = 'input,change'.split(',')
const panelVisible = ref<boolean>(false)

const updateInputValue = (txt: string) => {
  emit('update:modelValue', txt)
}

const updateValue = (event: Event) => {
  const elementTarget = event?.target as HTMLInputElement
  const txt = elementTarget.value
  updateInputValue(txt)
}

const registerChild = (slotPair: PanelSlot) => {
  childSlots.value.push(slotPair)
}

const readInputValue = () => {
  return inputElement.value!!.value
}

const current = (): PanelSlot | null => {
  const visible = childSlots.value.filter((slot) => slot.panelVisible)
  if (visible && visible.length > 0) {
    return visible[0]
  }
  return null
}

const enableUpArrow = (): boolean => {
  const c = current()

  if (c == null) return false

  return c !== childSlots.value[0]
}

const enableDownArrow = (): boolean => {
  const c = current()

  if (c == null) return true

  return c !== childSlots.value[childSlots.value.length - 1]
}

const move = (direction: number): void => {
  const currentlyVisiblePanel = childSlots.value.filter((slot) => slot.panelVisible)
  const selected =
    currentlyVisiblePanel && currentlyVisiblePanel.length > 0
      ? currentlyVisiblePanel[0]
      : childSlots.value[0]
  let index = childSlots.value.indexOf(selected)
  if (index + direction >= 0 && index + direction < childSlots.value.length) {
    index = index + direction
  }
  childSlots.value.forEach((slot) => {
    slot.iconVisible = false
    slot.panelVisible = false
  })
  childSlots.value[index].iconVisible = true
  childSlots.value[index].panelVisible = true
}

const down = () => {
  move(+1)
}

const up = () => {
  move(-1)
}

const togglePanel = (slot: PanelSlot) => {
  childSlots.value.forEach((slot) => {
    slot.panelVisible = false
  })
  childSlots.value[childSlots.value.indexOf(slot)].panelVisible = true
  panelVisible.value = !panelVisible.value
}

onMounted(() => {
  inputElement.value = root.value?.querySelector('input, textarea')!!
  if (inputElement.value) {
    const element = inputElement.value!!
    inputEvents.forEach((evt) => element.addEventListener(evt, updateValue))
  }
  childSlots.value[0].iconVisible = true
})

onBeforeUnmount(() => {
  if (inputElement.value) {
    inputEvents.forEach((evt) => inputElement.value!!.removeEventListener(evt, updateValue))
  }
})

const getInputElement = () => {
  return inputElement.value!!
}

const setInputDisabled = (disabled: boolean) => {
  if (inputElement.value) {
    inputElement.value.disabled = disabled
  }
}

provide('updateInputValue', updateInputValue)
provide('registerChild', registerChild)
provide('readInputValue', readInputValue)
provide('getInputElement', getInputElement)
provide('setInputDisabled', setInputDisabled)
</script>

<style scoped>
.writing-tools-container {
  display: grid;
  grid-template-areas:
    ' toolbar toolbar toolbar '
    ' input input  input '
    ' word-count icons .  '
    ' panel panel panel  ';
  grid-template-columns: 1fr min-content 1fr;
  grid-template-rows: auto auto auto auto;
  margin-bottom: var(--gutter-space);
}

.word-count {
  .status {
    font-size: var(--font-size-sm);
  }
  align-self: center;
  /*text-align: right ;*/
  padding-right: var(--gutter-space);
  grid-area: word-count;
}
.input-wrapper {
  grid-area: input;
  /* same reason as .platform-post: without this the full-width textarea sets a
     min-content floor for the track it sits in. */
  min-width: 0;
}

.icon-column {
  display: grid;
  grid-area: icons;
  align-self: center;
}

.input-panel {
  z-index: 8;
  --writing-tools-panel-padding: calc(var(--gutter-space) / 3);
  grid-area: panel;
  margin-top: calc(-2 * var(--icon-width));
  padding-bottom: var(--writing-tools-panel-padding);
  padding-left: var(--writing-tools-panel-padding);
  padding-right: var(--writing-tools-panel-padding);
  padding-top: calc(2.5 * var(--icon-width));
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
}

.toolbar {
  z-index: 8;
  background-color: rgba(255, 255, 255, 0.5);

  grid-area: toolbar;
  margin-bottom: calc(-1 * var(--icon-width));
  border-radius: 8px;
  --writing-tools-panel-padding: calc(var(--gutter-space) / 3);
}

.icon-column-menu {
  z-index: 10;
  height: calc(1.5 * var(--icon-width));
}

.icon {
  height: var(--icon-width);
  display: inline-block;
  background-size: var(--icon-width) var(--icon-width);
  cursor: pointer;
}
</style>
