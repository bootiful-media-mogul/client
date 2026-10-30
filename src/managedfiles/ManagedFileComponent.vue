<style scoped>
.managed-file-row {
  display: grid;
  grid-template-areas: 'controls choose visible written preview contentType filename';
  grid-template-columns:
    min-content var(--icon-column) var(--icon-column) var(--icon-column) var(--icon-column)
    5em auto;
  grid-gap: var(--gutter-space-half);
}

.managed-file-row .visible {
  grid-area: visible;
}

.managed-file-row .controls {
  grid-area: controls;
  display: contents;
}

.managed-file-row .filename {
  grid-area: filename;
  font-size: 1em;
  padding: var(--gutter-space-half) 0;
}

.managed-file-row .contentType {
  grid-area: contentType;
  font-size: var(--font-size-sm);
  text-align: left;
}

.managed-file-row .written {
  grid-area: written;
}

.managed-file-row .preview {
  grid-area: preview;
  justify-self: start;
}

.managed-file-row .choose {
  grid-area: choose;
}

.managed-file-row a:hover {
  text-decoration: none;
}

/*
  hide the file upload off screen so it doesn't ruin the ui.
  (display: none doesn't work)
*/
.managed-file-file-upload {
  display: none;
  z-index: -1;
  opacity: 10;
  position: absolute;
  top: -1000px;
  left: -1000px;
}
</style>

<template>
  <input
    ref="realFileUploadInputField"
    :accept="accept ? accept : '*/*'"
    class="managed-file-file-upload"
    type="file"
    @change="uploadFile($event)"
  />

  <div class="managed-file-row row">
    <span class="controls">
      <slot></slot>
    </span>

    <a class="choose" href="#" @click="launchFileUpload">
      <span :title="t('managedfiles.upload')" class="folder-icon"></span>
    </a>
    <a class="visible" href="#">
      <div v-if="visible">
        <Icon
          ref="icon"
          :icon-hover="privacy"
          :icon="privacy"
          class="icon"
          sticky
          @click.prevent="visible = false"
        />
      </div>
      <div v-else>
        <Icon
          ref="icon"
          :icon-hover="privacyHighlight"
          :icon="privacyHighlight"
          class="icon"
          sticky
          @click.prevent="visible = true"
        />
      </div>
    </a>

    <div class="written">
      <span v-if="uploading"> 🕒 </span>
      <span v-else>
        <Icon v-if="written" :icon="checkmarkAsset" :icon-hover="checkmarkAsset" />
      </span>
    </div>
    <div class="preview">
      <a
        :class="'mogul-icon preview-icon ' + (written ? '' : ' disabled')"
        :title="t('managedfiles.preview')"
        href="#"
        @click.prevent="preview"
      >
      </a>
    </div>

    <div class="contentType">
      <span v-if="contentType">
        <code :title="t('managedfiles.content-type')">{{ contentType }}</code>
      </span>
    </div>

    <div class="filename">
      <span v-if="filename" :title="t('managedfiles.file-name')" class="form-prompt"
        >{{ filename }}
      </span>
      <span v-else class="form-prompt">{{ t('managedfiles.please-upload-a-file') }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import axios from 'axios'
import { managedFiles, previewManagedFile } from '@/services'
import { onMounted, ref, watch } from 'vue'
import checkmarkAsset from '@/assets/images/checkbox.png'
import Icon from '@/ui/Icon.vue'
import { useI18n } from 'vue-i18n'
import privacy from '@/assets/images/privacy-preview-highlight.png'
import privacyHighlight from '@/assets/images/privacy-preview.png'

const { t } = useI18n()

const props = defineProps<{
  readonly disabled?: boolean
  readonly accept: string
  readonly managedFileId: number
}>()

const emit = defineEmits<{
  (e: 'hasData', managedFileId: number): void
}>()

const filename = ref<string>('')
const contentType = ref<string>('')
const size = ref<number>(0)
const uploading = ref<boolean>(false)
const written = ref<boolean>(false)
const realFileUploadInputField = ref<HTMLElement>()
const visible = ref<boolean>(false)
const loaded = ref<boolean>(false)

onMounted(async () => {
  await loadManagedFileIntoEditor()
  loaded.value = true
})

watch(
  () => visible.value,
  async (n: boolean, o: boolean) => {
    if (!loaded.value) return

    console.log(
      'setting managed file visibility because the old value was ',
      o,
      'and the new value is ',
      n
    )
    await managedFiles.setManagedFileVisibility(props.managedFileId, n)
  }
)

watch(
  () => size.value,
  (newSize: number, oldSize: number) => {
    if (oldSize === 0 && newSize > 0) {
      emit('hasData', props.managedFileId)
    }
  }
)

watch(
  () => props.managedFileId,
  async (o: any, n: any) => {
    await loadManagedFileIntoEditor()
  }
)

function mfId(): number {
  // sigh. typescript is not great at types.
  function isNumber(value: any): value is number {
    return typeof value === 'number' && !isNaN(value)
  }

  const m: any = props.managedFileId
  if (isNumber(m)) return m as number
  else return props.managedFileId
}

const preview = async () => {
  if (written.value) {
    previewManagedFile(mfId())
  }
}

const launchFileUpload = async () => {
  realFileUploadInputField.value!!.click()
}

const loadManagedFileIntoEditor = async () => {
  const managedFile = await managedFiles.managedFileById(mfId())
  filename.value = managedFile.filename
  written.value = managedFile.written
  if (managedFile.contentType && managedFile.contentType.indexOf('/') != -1) {
    contentType.value = managedFile.contentType.split('/')[1]
  }
  size.value = managedFile.size
  visible.value = managedFile.visible
}

const uploadFile = async (event: Event) => {
  event.preventDefault()
  const target = event.target as HTMLInputElement
  const data = new FormData()
  const file = target!!.files!![0] as File
  data.set('file', file)
  const uploadPath: string = '/api/managedfiles/' + props.managedFileId
  uploading.value = true
  const response = await axios.post(uploadPath, data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  console.assert(
    response.status >= 200 && response.status <= 300,
    'the http post to upload the archive did not succeed.'
  )
  written.value = true
  uploading.value = false

  emit('hasData', props.managedFileId)

  await loadManagedFileIntoEditor()
}
</script>
