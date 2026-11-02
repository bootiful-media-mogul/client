<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  readonly alt?: string
  readonly iconHover: string
  readonly icon: string
  readonly disabled?: boolean | string
  readonly sticky?: boolean | string
  readonly width?: number
}

const props = defineProps<Props>()
const element = ref<HTMLElement>()
const src = ref<string>()

// an svg is drawn as a mask over the current text color rather than as an <img>, so a
// single file works on light forms and in the black panel bar alike. vite inlines
// small svgs as data uris, so both forms of url have to be recognized.
const svg = computed(() => {
  const url = src.value ?? props.icon
  return url.startsWith('data:image/svg+xml') || /\.svg($|\?)/.test(url)
})
const svgStyle = computed(() => {
  const url = `url("${src.value ?? props.icon}")`
  return { maskImage: url, webkitMaskImage: url }
})

const swap = function () {
  if (props.iconHover) src.value = props.icon == src.value ? props.iconHover : props.icon
}
const mouseSwap = function () {
  if (props.sticky === true) return
  swap()
}

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const clickDelegate = (e: MouseEvent): void => {
  if (props.sticky) swap()
  emit('click', e)
}

const altText = ref<string>()

onMounted(() => {
  src.value = props.icon
  if (props.width) element.value!!.style.width = props.width + 'px'

  if (props.alt) {
    altText.value = props.alt
  } else {
    altText.value = t('icon.alt.default', { image: src.value })
  }
})
</script>
<style scoped>
img.icon {
  cursor: pointer;
  width: var(--icon-width);
}

img.icon-disabled {
  cursor: unset;
  opacity: 0.2;
  max-width: var(--icon-width);
  height: var(--icon-width);
}

span.icon {
  display: inline-block;
  vertical-align: middle;
  cursor: pointer;
  width: var(--icon-width);
  aspect-ratio: 1;
  background-color: currentColor;
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
}

/* the png icons swap to a hollow variant on hover; one-color svgs dim instead */
span.icon:hover {
  opacity: 0.6;
}

span.icon-disabled,
span.icon-disabled:hover {
  cursor: unset;
  opacity: 0.2;
}
</style>
<template>
  <span
    v-if="svg && disabled"
    ref="element"
    :aria-label="altText"
    :style="svgStyle"
    class="icon icon-disabled unselectable"
    role="img"
  />
  <span
    v-else-if="svg"
    ref="element"
    :aria-label="altText"
    :style="svgStyle"
    class="icon"
    role="img"
    @click="clickDelegate"
    @mouseout="mouseSwap"
    @mouseover="mouseSwap"
  />
  <img
    v-else-if="disabled"
    ref="element"
    :alt="altText"
    :src="src"
    class="icon icon-disabled unselectable"
  />
  <img
    v-else
    ref="element"
    :alt="altText"
    :src="src"
    class="icon"
    @click="clickDelegate"
    @mouseout="mouseSwap"
    @mouseover="mouseSwap"
  />
</template>
