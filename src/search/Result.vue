<script lang="ts" setup>
import Icon from '@/ui/Icon.vue'

import noteIconAsset from '@/assets/images/icons/notes.svg'
import segmentIconAsset from '@/assets/images/icons/podcast.svg'
import postIconAsset from '@/assets/images/icons/rss.svg'

import editAsset from '@/assets/images/icons/edit.svg'
import deleteAsset from '@/assets/images/icons/delete.svg'

import { useRouter } from 'vue-router'
import { results, type ResultType, utils } from '@/services'
import { useI18n } from 'vue-i18n'

import { dateTimeToString } from '@/dates'
import WatermarkedImage from '@/ui/WatermarkedImage.vue'

const { t } = useI18n()

const emit = defineEmits<{
  delete: [context: Map<string, number>]
  navigate: [context: Map<string, number>]
}>()

const props = defineProps<{
  id: number
  context: Map<string, number>
  type: ResultType
  created: number | string | null
  title: string
  aggregateId: number | undefined
  allowDeletion: boolean | undefined
}>()

async function deleteEntity() {
  const msg = t('confirm.deletion', { title: props?.title ?? '' })

  if (!utils.confirmDeletion(msg)) return

  const context = props.context
  const func = results.deletion(props.type as ResultType)!!
  func(context)
  emit('delete', context)
}
const router = useRouter()

async function navigateToEntity() {
  const context = props.context
  await router.push({
    name: 'entity',
    params: { id: context.get('id'), type: context.get('type') }
  })
  emit('navigate', context)
}

function sourceFor(type: string): string {
  const map = new Map<string, string>()
  map.set('segment', segmentIconAsset)
  map.set('post', postIconAsset)
  map.set('note', noteIconAsset)
  return map.get(type)!!
}
</script>
<template>
  <div class="result-container">
    <div class="result">
      <div class="edit-button">
        <Icon
          :alt="t('icons.edit', { name: props.title })"
          highlight="hover"
          @click.prevent="navigateToEntity()"
          :icon="editAsset"
          :icon-hover="editAsset"
        />
      </div>
      <div class="id-column">#{{ id }}</div>
      <div class="delete-button">
        <Icon
          :alt="t('icons.delete', { name: props.title })"
          highlight="hover"
          v-if="props.allowDeletion"
          :icon="deleteAsset"
          :icon-hover="deleteAsset"
          @click.prevent="deleteEntity()"
        />
      </div>
      <div class="created-column">
        {{ dateTimeToString(props.created) }}
      </div>
      <div class="title">{{ props.title }}</div>
    </div>
    <div class="watermark">
      <WatermarkedImage
        class="watermark-image"
        :invert="false"
        :watermark-image="sourceFor(type)"
      />
    </div>
  </div>
</template>

<style scoped>
.result-container {
  --watermark-image-dimension: calc(3 * var(--gutter-space));
  display: grid;
  grid-template-areas: 'watermark result';
  grid-template-columns: calc(var(--gutter-space-half) + var(--watermark-image-dimension)) auto;
  border-top: 1px solid var(--rule-color);
  padding-bottom: var(--gutter-space-half);
  padding-top: var(--gutter-space-half);

  .result {
    grid-area: result;
    position: relative;
    grid-template-areas:
      ' title       title          title     title          '
      ' edit-button created-column id-column delete-button  ';
    grid-template-columns: var(--icon-width) 1fr 1fr var(--icon-width);
    grid-template-rows: min-content min-content;
    grid-row-gap: var(--gutter-space);
    display: grid;

    .edit-button {
      grid-area: edit-button;
      width: var(--icon-width);
    }

    .title {
      grid-area: title;
      text-align: left;
    }
    .id-column {
      grid-area: id-column;
      padding-left: calc(0.5 * var(--gutter-space));
      border-left: 0.5px solid var(--rule-color);
    }
    .created-column {
      grid-area: created-column;
      text-align: right;
      border-right: 0.5px solid var(--rule-color);
      padding-right: calc(0.5 * var(--gutter-space));
    }
    .delete-button {
      grid-area: delete-button;
      width: var(--icon-width);
    }
  }

  .watermark {
    display: flex;
    grid-area: watermark;
    align-items: start;
    .watermark-image {
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      width: var(--watermark-image-dimension);
      height: var(--watermark-image-dimension);
    }
  }
}
</style>
