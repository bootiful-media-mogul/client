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
import { computed, getCurrentInstance, onMounted, ref, watch } from 'vue'
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

// the hover image shows while the pointer or the keyboard focus is on the icon. a sticky
// icon is a toggle instead: each click flips it, and hovering leaves it alone
const hovered = ref(false)
const focused = ref(false)
const toggled = ref(false)
const showHover = computed(() => (props.sticky ? toggled.value : hovered.value || focused.value))
const src = computed(() => (showHover.value && props.iconHover ? props.iconHover : props.icon))

// an svg is inlined rather than shown as an <img>, so it can be styled from here: its ink
// takes the current text color, and its paper (the white highlight under the ink) is the
// --icon-paper variable, toggled by the highlight prop. vite may inline small svgs as data
// uris, so both forms of url are recognized.
const svg = computed(() => {
  const url = src.value
  return url.startsWith('data:image/svg+xml') || /\.svg($|\?)/.test(url)
})
const markup = ref<string>('')
// masks and filters are found by id, and the same svg appears many times on a page, so
// every copy gets its own ids
const suffix = `-icon${++instances}`

watch(
  () => (svg.value ? src.value : null),
  async (url) => {
    if (!url) return
    const text = await markupFor(url)
    if (url === src.value) {
      markup.value = text
        // vite writes the svgs it inlines as data uris with single quotes
        .replace(/\bid=(["'])([\w-]+)\1/g, `id="$2${suffix}"`)
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

const emit = defineEmits<{
  click: [event: MouseEvent | KeyboardEvent]
}>()

// an icon someone listens to for clicks is a control, so it has to be one for the
// keyboard and for a screen reader too: in the tab order, named a button, and pressed
// with enter or space. the element itself takes the role, rather than a <button> around
// it, because the components that use Icon style it through their own scoped css, which
// only reaches a component's root element
const interactive = !!getCurrentInstance()?.vnode.props?.onClick
const isDisabled = computed(() => !!props.disabled)

// a sticky icon whose two images differ shows an on and an off state
const pressed = computed(() =>
  interactive && props.sticky && props.iconHover && props.iconHover !== props.icon
    ? toggled.value
    : undefined
)

const clickDelegate = (e: MouseEvent | KeyboardEvent): void => {
  if (isDisabled.value) return
  if (props.sticky) toggled.value = !toggled.value
  emit('click', e)
}

// a native button fires on enter as the key goes down and on space as it comes up
const onKeydown = (e: KeyboardEvent) => {
  if (!interactive) return
  if (e.key === 'Enter') {
    e.preventDefault()
    clickDelegate(e)
  } else if (e.key === ' ') {
    e.preventDefault() // no page scroll
  }
}
const onKeyup = (e: KeyboardEvent) => {
  if (interactive && e.key === ' ') clickDelegate(e)
}

// a picture's role, or a button's when someone listens for clicks
const role = computed(() => (interactive ? 'button' : decorative.value ? undefined : 'img'))
const tabindex = computed(() => (interactive ? (isDisabled.value ? -1 : 0) : undefined))

// an empty alt marks the icon as decorative, for one that sits beside text saying the
// same thing: a screen reader skips it rather than reading the label twice
const decorative = computed(() => props.alt === '')
const altText = computed(() =>
  decorative.value ? '' : props.alt || t('icon.alt.default', { image: src.value })
)

onMounted(() => {
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
:where(span.icon-paper-hover):hover,
:where(span.icon-paper-hover):focus-visible {
  --icon-paper: var(--icon-paper-color, white);
}

:where(span.icon-paper-rest):hover,
:where(span.icon-paper-rest):focus-visible {
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
    :aria-label="role ? altText : undefined"
    :aria-hidden="role ? undefined : 'true'"
    :aria-disabled="interactive && isDisabled ? 'true' : undefined"
    :aria-pressed="pressed"
    :class="svgClasses"
    :role="role"
    :tabindex="tabindex"
    @click="clickDelegate"
    @keydown="onKeydown"
    @keyup="onKeyup"
    @mouseenter="hovered = !isDisabled"
    @mouseleave="hovered = false"
    @focus="focused = !isDisabled"
    @blur="focused = false"
    v-html="markup"
  />
  <img
    v-else
    ref="element"
    :alt="altText"
    :aria-label="interactive ? altText : undefined"
    :src="src"
    :class="{ icon: true, 'icon-disabled': isDisabled, unselectable: isDisabled }"
    :role="interactive ? 'button' : undefined"
    :tabindex="tabindex"
    :aria-disabled="interactive && isDisabled ? 'true' : undefined"
    :aria-pressed="pressed"
    @click="clickDelegate"
    @keydown="onKeydown"
    @keyup="onKeyup"
    @mouseenter="hovered = !isDisabled"
    @mouseleave="hovered = false"
    @focus="focused = !isDisabled"
    @blur="focused = false"
  />
</template>
