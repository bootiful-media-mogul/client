<style>
.rendered-preview {
  font-size: var(--font-size-sm);
  padding: calc(var(--gutter-space) / 3);
}

.rendered-preview {
  & h1,
  & h2,
  & h3,
  & h4,
  & h5,
  & h6 {
    margin-top: 0;
    margin-bottom: 0;
    line-height: 1;
  }
}

/* fixes #40 */
.rendered-preview img {
  width: 100%;
}

.formatting-menu-toolbar {
  display: grid;
  grid-template-areas: ' . toolbar . ';
  grid-template-columns: auto auto auto;
  /*grid-template-rows: fit-content(100%) auto ;*/
}

.formatting-menu {
  display: grid;
  grid-auto-flow: column;
  gap: 0;
  grid-area: toolbar;
  justify-self: center;
  max-width: fit-content;
  align-items: center;
  padding-bottom: var(--gutter-space);
}

.formatting-menu .icon {
  max-width: calc(var(--icon-width) * 0.7);
  /*max-height: calc(var(--icon-width) * 0.5);*/
  padding: 0 calc(var(--icon-width) / 2);
  padding-top: var(--gutter-space-half);
  padding-bottom: var(--gutter-space-half);
}
</style>
<template>
  <InputWrapperChild>
    <template v-slot:panel>
      <div>
        <div class="rendered-preview">
          <div v-if="props.modelValue.trim() !== ''" v-html="rendered"></div>
          <div v-if="props.modelValue.trim() === ''">{{ t('markdown.nothing-to-preview') }}</div>
        </div>
      </div>
    </template>
    <template v-slot:toolbar>
      <div class="formatting-menu-toolbar">
        <div class="formatting-menu">
          <Icon
            highlight="hover"
            :icon="boldAsset"
            :icon-hover="boldAsset"
            @click.prevent="formatText('strong')"
          />
          <Icon
            highlight="hover"
            :icon="italicAsset"
            :icon-hover="italicAsset"
            @click.prevent="formatText('em')"
          />
          <Icon
            highlight="hover"
            :icon="linkAsset"
            :icon-hover="linkAsset"
            @click.prevent="formatText('link')"
          />
          <Icon
            highlight="hover"
            :icon="listAsset"
            :icon-hover="listAsset"
            @click.prevent="formatText('list')"
          />
          <Icon
            highlight="hover"
            :icon="h1Asset"
            :icon-hover="h1Asset"
            @click.prevent="formatText('h1')"
          />
          <Icon
            highlight="hover"
            :icon="h2Asset"
            :icon-hover="h2Asset"
            @click.prevent="formatText('h2')"
          />
          <Icon
            highlight="hover"
            :icon="h3Asset"
            :icon-hover="h3Asset"
            @click.prevent="formatText('h3')"
          />

          <Icon
            highlight="hover"
            :icon="imageAsset"
            :icon-hover="imageAsset"
            @click.prevent="formatText('image')"
          />
        </div>
      </div>
    </template>
    <template v-slot:icon>
      <Icon highlight="rest" :icon="asset" :icon-hover="asset" />
    </template>
  </InputWrapperChild>
</template>
<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import imageAsset from '@/assets/images/icons/image.svg'

import asset from '@/assets/images/icons/markdown.svg'

import listAsset from '@/assets/images/icons/list.svg'

import linkAsset from '@/assets/images/icons/link.svg'

import h1Asset from '@/assets/images/icons/h1.svg'

import h2Asset from '@/assets/images/icons/h2.svg'
import h3Asset from '@/assets/images/icons/h3.svg'

import boldAsset from '@/assets/images/icons/bold.svg'

import italicAsset from '@/assets/images/icons/italic.svg'

import InputWrapperChild from '@/ui/input/InputWrapperChild.vue'
import { markdown } from '@/services'
import { inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { GetInputElementFunction, UpdateValueFunction } from '@/ui/input/input'
import Icon from '@/ui/Icon.vue'

const { t } = useI18n()

const updateValue = inject<UpdateValueFunction>('updateInputValue')!
const getInputElement = inject<GetInputElementFunction>('getInputElement')!

interface Props {
  readonly modelValue: string
}

let timer = -1
const needed = ref<boolean>(false)
const props = defineProps<Props>()
const rendered = ref<string>('')

const render = async (md: string) => {
  if (!md || md.trim() === '' || !needed.value) return

  rendered.value = await markdown.render(md)
}

/* new editor capabilities */

const formatText = (format: string) => {
  const value: string = getInputElement()!!.value
  const selection = getSelection()
  if (!selection) return

  const { text, start, end } = selection

  const handleListificationOf = function () {
    // several scenarios:
    // 1. the text is all the text on a given line
    // 2. the text is part of a body of text before and after it
    // 3. there are several lines with newlines in the text selected

    // 1. simply add a bullet point before the line and call it good
    if (start!! > 0 && value.charAt(start!! - 1) == '\n') insertAtCursor(`* ${text}`)

    // 2. add a newline before, a bullet, and a newline after
    if (text.indexOf('\n') == -1) {
      insertAtCursor(`\n * ${text}\n`)
    } //
    else {
      // 3. add bullets before each line
      insertAtCursor(
        text
          .split('\n')
          .map((line) => `* ${line}`)
          .join('\n')
      )
    }
  }

  switch (format) {
    case 'image':
      insertAtCursor(`![${window.prompt(t('markdown.add-image-prompt'))?.trim()}](${text.trim()})`)
      break
    case 'link':
      insertAtCursor(`[${text}](${window.prompt(t('markdown.add-link-prompt'))})`)
      break
    case 'list':
      handleListificationOf()
      break
    case 'h1':
      insertAtCursor(`# ${text}`)
      break
    case 'h2':
      insertAtCursor(`## ${text}`)
      break
    case 'h3':
      insertAtCursor(`### ${text}`)
      break
    case 'strong':
      insertAtCursor(`**${text}**`)
      break
    case 'em':
      insertAtCursor(`*${text}*`)
      break
    default:
      insertAtCursor(text)
  }
}

const getSelection = () => {
  const element = getInputElement()
  if (!element) return null
  return {
    text: element.value.substring(element.selectionStart!!, element.selectionEnd!!),
    range: null,
    start: element.selectionStart,
    end: element.selectionEnd,
    isContentEditable: false
  }
}

const insertAtCursor = async (text: string, movePosition: number = 0) => {
  const element = getInputElement()
  if (!element) return
  const start = element.selectionStart!!
  const end = element.selectionEnd!!
  const before = element.value.substring(0, start)
  const after = element.value.substring(end)

  updateValue(before + text + after)
  await render(props.modelValue)
  // Set cursor position
  await nextTick(() => {
    const newPosition = start + text.length + movePosition
    element.selectionStart = newPosition
    element.selectionEnd = newPosition
  })
}

const debouncingRender = async () => {
  if (timer && timer > -1) {
    clearTimeout(timer)
  }
  timer = window.setTimeout(async () => {
    await render(props.modelValue)
  }, 100)
}

onMounted(() => {
  needed.value = true
})

onUnmounted(() => {
  needed.value = false
})

watch(
  () => props.modelValue,
  (o: string, n: string) => {
    debouncingRender()
  }
)
</script>
