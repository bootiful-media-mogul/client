<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const emit = defineEmits(['update:modelValue', 'validated'])

function onChange(e: any) {
  const v = e.target.value == '' || e.target.value.trimEnd() == '' ? null : e.target.value
  emit('update:modelValue', v)
  emit('validated', v != null)
}
const props = defineProps({
  modelValue: { type: [String, null], default: '' },
  disabled: { type: Boolean, default: false }
})

const value = ref<string | null>(props.modelValue)
</script>

<template>
  <input
    type="text"
    @change="onChange"
    v-model="value"
    :placeholder="t('components.input.enter-a-value')"
  />
</template>

<style scoped></style>
