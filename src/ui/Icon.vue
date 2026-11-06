<script lang="ts">
// each svg is fetched once, then shared by every Icon that shows it
const markupCache = new Map<string, Promise<string>>()
let instances = 0

function markupFor(url: string): Promise<string> {
  if (!markupCache.has(url)) {
    markupCache.set(
      url,
      fetch(url).then((response) => (response.ok ? response.text() : ''))
    )
  }
  return markupCache.get(url)!
}
</script>
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  readonly alt?: string
  readonly iconHover: string
  readonly icon: string
  readonly disabled?: boolean | string
  readonly sticky?: boolean | string
  readonly width?: number
  // when an svg shows its white highlight ("paper"): at rest and hollow on hover, hollow
  // at rest and white on hover, or always. without it the svg is ink only
  readonly highlight?: 'rest' | 'hover' | 'always'
}

const props = defineProps<Props>()
const element = ref<HTMLElement>()
const src = ref<string>()

// an svg is inlined rather than shown as an <img>, so it can be styled from here: its ink
// takes the current text color, and its paper (the white highlight under the ink) is the
// --icon-paper variable, toggled by the highlight prop. vite may inline small svgs as data
// uris, so both forms of url are recognized.
const svg = computed(() => {
  const url = src.value ?? props.icon
  return url.startsWith('data:image/svg+xml') || /\.svg($|\?)/.test(url)
})
const markup = ref<string>('')
// masks and filters are found by id, and the same svg appears many times on a page, so
// every copy gets its own ids
const suffix = `-icon${++instances}`

watch(
  () => (svg.value ? src.value ?? props.icon : null),
  async (url) => {
    if (!url) return
    const text = await markupFor(url)
    if (url === (src.value ?? props.icon)) {
      markup.value = text
        .replace(/\bid="([\w-]+)"/g, `id="$1${suffix}"`)
        .replace(/url\(#([\w-]+)\)/g, `url(#$1${suffix})`)
    }
  },
  { immediate: true }
)

const svgClasses = computed(() => ({
  icon: true,
  'icon-disabled': !!props.disabled,
  unselectable: !!props.disabled,
  [`icon-paper-${props.highlight}`]: !!props.highlight && !props.disabled
}))

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

// an empty alt marks the icon as decorative, for one that sits beside text saying the
// same thing: a screen reader skips it rather than reading the label twice
const decorative = computed(() => props.alt === '')
const altText = computed(() =>
  decorative.value ? '' : props.alt || t('icon.alt.default', { image: src.value ?? props.icon })
)

onMounted(() => {
  src.value = props.icon
  if (props.width) element.value!!.style.width = props.width + 'px'
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

/* :where() drops these defaults to the weakest specificity, so the rules parents
   already use to size and space png icons win over them */
:where(span.icon) {
  display: inline-block;
  vertical-align: middle;
  cursor: pointer;
  width: var(--icon-width);
  aspect-ratio: 1;
  --icon-paper: transparent;
}

:where(span.icon) :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

/* the paper is white unless a dark surface asks for another --icon-paper-color */
:where(span.icon-paper-rest),
:where(span.icon-paper-always),
:where(span.icon-paper-hover):hover {
  --icon-paper: var(--icon-paper-color, white);
}

:where(span.icon-paper-rest):hover {
  --icon-paper: transparent;
}

:where(span.icon-disabled) {
  cursor: unset;
  opacity: 0.2;
}
</style>
<template>
  <span
    v-if="svg"
    ref="element"
    :aria-label="decorative ? undefined : altText"
    :aria-hidden="decorative ? 'true' : undefined"
    :class="svgClasses"
    :role="decorative ? undefined : 'img'"
    @click="disabled ? undefined : clickDelegate($event)"
    @mouseout="disabled ? undefined : mouseSwap()"
    @mouseover="disabled ? undefined : mouseSwap()"
    v-html="markup"
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
