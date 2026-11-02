<script lang="ts" setup>
import { inject, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Attachment, compositions, Notification } from '@/services'
import ManagedFileComponent from '@/managedfiles/ManagedFileComponent.vue'
import type {
  GetInputElementFunction,
  ReadValueFunction,
  UpdateValueFunction
} from '@/ui/input/input'
import InputWrapperChild from '@/ui/input/InputWrapperChild.vue'
import asset from '@/assets/images/icons/attachment.svg'
import Icon from '@/ui/Icon.vue'
import deleteAsset from '@/assets/images/icons/delete.svg'

import { useNotificationListeners } from '@/composables/useNotificationListeners'

const { listenForCategory } = useNotificationListeners()

const { t } = useI18n()
const updateValue = inject<UpdateValueFunction>('updateInputValue')!
const getInputElement = inject<GetInputElementFunction>('getInputElement')!
const readValue = inject<ReadValueFunction>('readInputValue')!

onMounted(async () => {
  await reload()

  const ti = getInputElement()
  textareaRef.value = ti

  ti.addEventListener('change', handleTextChange)
  ti.addEventListener('focus', handleTextareaFocus)
  ti.addEventListener('click', handleTextareaFocus)
  ti.addEventListener('drop', handleDrop)
  ti.addEventListener('dragover', handleDragOver)
})

const attachments = ref<Array<Attachment>>()

const props = defineProps<{
  compositionId: number
}>()

listenForCategory('attachment-managed-file-updated-event', async (notification: Notification) => {
  const managedFileId = parseInt(notification.key)
  const composition = await compositions.getCompositionById(props.compositionId)
  composition.attachments.forEach((attachment) => {
    if (attachment.managedFile.id == managedFileId) {
      const newMarkdown = attachment.markdown
      const newContentType = attachment.managedFile.contentType
      attachments.value?.forEach((existingAttachment) => {
        if (existingAttachment.managedFile.id == managedFileId) {
          existingAttachment.managedFile.contentType = newContentType
          existingAttachment.markdown = newMarkdown
        }
      })
    }
  })
})

const text = ref<string>()
const textareaRef = ref<HTMLInputElement>()
const lastCursorPos = ref<number>(0)

const setText = (txt: string) => {
  text.value = txt

  updateValue(txt)
}

const handleTextareaFocus = () => {
  lastCursorPos.value = textareaRef.value!!.selectionStart!!
}

// Update text state and maintain cursor position
const handleTextChange = (e: Event) => {
  const t = (e.target as HTMLInputElement)!!
  setText(t.value)
  lastCursorPos.value = t.selectionStart || 0
}

// Handle the drop event
const handleDrop = (e: DragEvent) => {
  e.preventDefault()

  const droppedText = e.dataTransfer!!.getData('text')
  const dropPosition = textareaRef.value!!.selectionStart!!
  const newText =
    readValue()!!.slice(0, dropPosition) + droppedText + readValue()!!.slice(dropPosition)
  setText(newText)

  // After setState, focus and set cursor position after inserted text
  setTimeout(() => {
    const tav = textareaRef.value!!
    tav.focus()
    const newPosition = dropPosition + droppedText.length
    tav.setSelectionRange(newPosition, newPosition)
  }, 0)
}

// Prevent default drag over behavior
const handleDragOver = (e: Event) => {
  e.preventDefault()
}

// todo
// not sure if this is the right play.
// all this just to have the draggable handle visible on mouseover,
// which only works on a computer with a mouse in the first place.
// how else could this be achieved?
const activeAttachment = ref<Attachment | null>()

const handleMouseLeave = (e: Event, attachment: Attachment) => {
  activeAttachment.value = null
}

const handleMouseEnter = (e: Event, attachment: Attachment) => {
  activeAttachment.value = attachment
}
//

// Make the draggable div
const handleDragStart = (event: DragEvent, attachment: Attachment) => {
  event.dataTransfer!!.setData('text', attachment.markdown)

  // Create a clean clone of just this element
  let dragEl = event.target as HTMLElement

  // we want to have ghost-image of the attachment row, no matter which node gets picked up for dragging. so if were on an inner element, lets keep looking up

  const attachmentRowClassName = 'attachment-row'
  if (dragEl.className.indexOf(attachmentRowClassName) < 0) {
    let parent = dragEl.parentElement
    while (parent && parent.className.indexOf(attachmentRowClassName) < 0) {
      parent = parent.parentElement
    }
    if (parent) {
      dragEl = parent
    }
  }

  const clone = dragEl.cloneNode(true) as HTMLElement
  clone.style.width = `${dragEl.offsetWidth}px`
  clone.style.height = `${dragEl.offsetHeight}px`
  clone.style.position = 'fixed'
  clone.style.top = '-1000px' // Position off-screen
  clone.style.opacity = '0.8'

  // Add to DOM temporarily
  document.body.appendChild(clone)

  // Set as drag image
  event.dataTransfer!!.setDragImage(clone, 0, 0)

  // Clean up the clone after drag starts
  requestAnimationFrame(() => {
    document.body.removeChild(clone)
  })
}

async function reload() {
  const composition = await compositions.getCompositionById(props.compositionId)
  attachments.value = composition.attachments
}

async function deleteCompositionAttachment(attachmentId: number) {
  await compositions.deleteCompositionAttachment(attachmentId)
  await reload()
}

function attachmentClasses(attachment: Attachment) {
  return (
    'draggable attachment-row ' +
    (activeAttachment.value == attachment ? 'attachment-row-active' : '')
  )
}

async function addCompositionAttachment(compositionId: number) {
  await compositions.createCompositionAttachment(compositionId)
  await reload()
}
</script>
<template>
  <InputWrapperChild>
    <template v-slot:icon>
      <Icon :icon="asset" :icon-hover="asset" />
    </template>
    <template v-slot:panel>
      <div>
        <div v-if="attachments?.length ?? 0 > 0" class="compositions-attachments-prompt">
          {{ t('compositions.attachments.drag-and-drop-attachments') }}
        </div>
        <div v-for="attachment in attachments" :key="attachment.id">
          <div
            :class="attachmentClasses(attachment)"
            draggable="true"
            @dragstart="handleDragStart($event, attachment)"
            @mouseenter="handleMouseEnter($event, attachment)"
            @mouseleave="handleMouseLeave($event, attachment)"
          >
            <div class="draggable-handle dot-grid">
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
            <div class="delete-icon">
              <Icon
                :icon="deleteAsset"
                :icon-hover="deleteAsset"
                @click.prevent="deleteCompositionAttachment(attachment.id)"
              />
            </div>
            <div class="managed-file">
              <ManagedFileComponent
                :managed-file-id="attachment.managedFile.id"
                accept=".jpg,.png"
              />
            </div>
          </div>
        </div>
        <div>
          <button
            class="pure-button pure-button-primary"
            type="submit"
            @click.prevent="addCompositionAttachment(compositionId)"
          >
            {{ t('compositions.buttons.add-attachment') }}
          </button>
        </div>
      </div>
    </template>
  </InputWrapperChild>
</template>
<style>
.compositions-attachments-prompt {
  margin-top: 1em;
  margin-bottom: 1em;
}

.attachment-row {
  align-items: center;
  display: grid;
  grid-template-areas: 'draggable-handle delete managed-file';
  grid-template-columns: var(--gutter-space) var(--icon-column) auto;
  border-top: 1px solid black;
}

.managed-file {
  grid-area: managed-file;
}

.draggable {
  cursor: grab;
  position: relative;
  user-select: none;
}

.draggable a,
.draggable button,
.draggable input,
.draggable .draggable-handle {
  pointer-events: auto;
}

.draggable-handle {
  width: 30px;

  grid-area: draggable-handle;
  visibility: hidden;
  background-size: 30px auto;
}

.attachment-row-active > .draggable-handle {
  visibility: visible;
}

.dot-grid {
  display: grid;
  grid-template-columns: repeat(2, 5px); /* 2 columns, each 5px wide */
  grid-template-rows: repeat(3, 5px); /* 3 rows, each  5px tall */
  gap: 2px; /* Space between dots */
  width: 12px; /* Total width: 2 columns x 15px */
  height: 19px; /* Total height: 3 rows x 15px + gaps */
}

.dot {
  width: 3px;
  height: 3px;
  background-color: white;
  border-radius: 50%;
  opacity: 0.8;
}
</style>
