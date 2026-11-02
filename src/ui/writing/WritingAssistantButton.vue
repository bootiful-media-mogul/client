<template>
  <div class="writing-tools-button unselectable">
    <div class="writing-tools-button-content">
      <div class="writing-tools-button-content-icon">
        <slot />
      </div>
      <div class="writing-tools-button-content-label">{{ label }}</div>
    </div>
  </div>
</template>
<style>
.writing-tools-button {
  cursor: pointer;
  display: grid;
  grid-template-areas: '   content  ';

  border-radius: var(--button-radius);
  background-color: var(--panel-bg-color);
  color: var(--ink-color);
  padding: calc(var(--gutter-space) / 3);
  font-size: var(--font-size-sm);
}

.writing-tools-button-content {
  display: grid;
  grid-area: content;
  grid-template-areas:
    '. icon . '
    'label label label';
  grid-template-columns: auto auto auto;
  place-items: center;
}

.writing-tools-button-content-label {
  grid-area: label;
}

.writing-tools-button-content-icon {
  grid-area: icon;
  height: var(--writing-tools-panel-icon-size);
}

.writing-tools-button-content-icon img,
.writing-tools-button-content-icon .icon {
  width: var(--writing-tools-panel-icon-size);
}
</style>
<script lang="ts" setup>
import { ref } from 'vue'

interface Props {
  readonly label: string
}

const props = defineProps<Props>()
const label = ref<string>(props.label)
</script>
