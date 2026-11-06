<template>
  <button
    type="button"
    class="writing-tools-button unselectable"
    :aria-expanded="expanded === undefined ? undefined : expanded"
  >
    <span class="writing-tools-button-content">
      <span class="writing-tools-button-content-icon">
        <slot />
      </span>
      <span class="writing-tools-button-content-label">{{ label }}</span>
    </span>
  </button>
</template>
<style>
.writing-tools-button {
  /* a button, so undo what the browser and base.css give one */
  border: 0;
  margin: 0;
  font-family: inherit;
  line-height: inherit;
  text-align: center;
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
  // for a button that opens more tools below it: whether they are open
  readonly expanded?: boolean
}

const props = withDefaults(defineProps<Props>(), { expanded: undefined })
const label = ref<string>(props.label)
</script>
