<template>
  <Select v-model="model" :options="podcastSelections" :placeholder="t('selections.podcasts')" />
</template>

<script setup lang="ts">
import { podcasts } from '@/services'
import Select, { type SelectOption } from '@/ui/Select.vue'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const props = defineProps<{ modelValue: number | null }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: string | number | null): void
  (e: 'validated', valid: boolean): void
}>()

const model = computed<SelectOption | null>({
  get: () => podcastSelections.value.find((o) => o.value === props.modelValue) ?? null,
  set: (v) => {
    emit('update:modelValue', v?.value ?? null)
    emit('validated', v != null)
  }
})

const podcastSelections = ref<SelectOption[]>([])

onMounted(async () => {
  podcastSelections.value = (await podcasts.podcasts()).map((p) => ({
    value: p.id,
    label: p.title
  }))
})
</script>
