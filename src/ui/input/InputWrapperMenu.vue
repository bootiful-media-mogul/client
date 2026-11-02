<template>
  <div class="menu">
    <div ref="up" :class="'unselectable arrow up ' + upArrowCss()" @click="emit('up')">◀</div>
    <div class="unselectable icons">
      <slot>{{ t('inputWrapperMenu.default-content') }}</slot>
    </div>
    <div ref="down" :class="'unselectable arrow down ' + downArrowCss()" @click="emit('down')">
      ▶
    </div>
  </div>
</template>
<style scoped>
.menu {
  display: grid;
  grid-template-areas: ' . up icons down  . ';
  grid-template-columns: auto var(--gutter-space) var(--icon-width) var(--gutter-space) auto;
  justify-content: center;
  align-items: center;
  width: var(--icon-column-width);
}

.arrow {
  text-align: center;
  cursor: pointer;
}

.arrow.down {
  grid-area: down;
}

/* centered as a box: laid out as inline content, the icon sat on the text baseline and
   hung below the arrows */
.icons {
  grid-area: icons;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow.up {
  grid-area: up;
  text-align: right;
}

.arrow.disabled {
  opacity: 0.3;
  pointer-events: none;
}
</style>
<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  readonly disabled: boolean
  readonly enableUpArrow: boolean
  readonly enableDownArrow: boolean
}

const emit = defineEmits<{
  (e: 'down'): void
  (e: 'up'): void
}>()

const props = defineProps<Props>()

const downArrowCss = function () {
  if (props.disabled) return 'disabled'
  if (!props.enableDownArrow) return 'disabled'
  return ''
}
const upArrowCss = () => {
  if (props.disabled) return 'disabled'
  if (!props.enableUpArrow) return 'disabled'
  return ''
}
const disable = function (r: HTMLElement) {
  r.classList.add('disabled')
}
const up = ref<HTMLElement>()
const down = ref<HTMLElement>()

watch(
  () => props.disabled,
  (_, newValue) => {
    if (!newValue) {
      ;[up, down].forEach((el) => disable(el.value!!))
    }
  }
)
</script>
