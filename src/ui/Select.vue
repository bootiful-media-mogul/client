<template>
  <div class="select">
    <label v-if="label" :for="id">{{ label }}</label>

    <select
      :id="id"
      :aria-label="label ? undefined : placeholder"
      :disabled="disabled"
      :value="selectedKey"
      @change="onChange"
    >
      <option v-if="placeholder" disabled value="">
        {{ placeholder }}
      </option>

      <option v-for="opt in options" :key="keyFor(opt)" :value="keyFor(opt)">
        {{ opt.label }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'

export type SelectOption = { label: string; value: string | number }

const props = withDefaults(
  defineProps<{
    modelValue: SelectOption | null
    options: SelectOption[]
    placeholder?: string
    label?: string
    disabled?: boolean
    // the select's own id, so a label outside this component can point at it
    id?: string
  }>(),
  {
    modelValue: null,
    placeholder: undefined,
    label: undefined,
    disabled: false,
    id: undefined
  }
)

const id = props.id ?? useId()

const emit = defineEmits<{
  (e: 'update:modelValue', value: SelectOption | null): void
}>()

// Key strategy:
// - If `value` is guaranteed unique, you can just use opt.value.
// - This uses value by default; if you worry about duplicates, use value+label.
function keyFor(opt: SelectOption) {
  return '' + opt.value + opt.label
}

const selectedKey = computed(() => {
  return props.modelValue ? keyFor(props.modelValue) : ''
})

function onChange(e: Event) {
  const target = e.target as HTMLSelectElement
  const k = target.value
  if (k === '') {
    emit('update:modelValue', null)
    return
  }

  const match = props.options.find((o) => keyFor(o) === k) ?? null
  emit('update:modelValue', match)
}
</script>

<style scoped></style>
