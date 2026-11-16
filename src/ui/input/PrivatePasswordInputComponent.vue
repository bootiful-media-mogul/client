<style scoped>
/* sits inside the right end of its field (the caller wraps both in a position: relative
   box and pads the field). it used to be position: fixed beside the field, which put it
   off the screen on a phone, where the field is already full width, and over the
   floating bottom bar while scrolling */
.reveal {
  position: absolute;
  top: 50%;
  right: var(--gutter-space-half);
  transform: translateY(-50%);
  z-index: 21;
}
</style>
<template>
  <Icon
    :alt="t('icons.show-password')"
    highlight="rest"
    :icon="eyeAsset"
    :icon-hover="eyeOffAsset"
    class="reveal"
    sticky
    @click.prevent="togglePreview"
  />
</template>

<script lang="ts" setup>
import eyeOffAsset from '@/assets/images/icons/eye-off.svg'
import eyeAsset from '@/assets/images/icons/eye.svg'

import Icon from '@/ui/Icon.vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  // the id of the password input this shows and hides
  readonly for: string
}>()

const { t } = useI18n()

function togglePreview() {
  const input = document.getElementById(props.for) as HTMLInputElement | null
  if (input) input.type = input.type.toLowerCase() === 'password' ? 'text' : 'password'
}
</script>
