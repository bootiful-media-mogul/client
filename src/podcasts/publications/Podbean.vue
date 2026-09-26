<template>
  <PublicationPanelComponent :icon="podbeanIcon" :icon-hover="podbeanIcon" plugin="podbean">
    <template v-slot:panel>
      <div>
        <button
          :disabled="disabled"
          class="pure-button pure-button-primary publish-button"
          type="button"
          @click.prevent="publish()"
        >
          {{ t('publications.plugins.publish') }}
        </button>
      </div>
    </template>
  </PublicationPanelComponent>
</template>
<script lang="ts" setup>
import podbeanIcon from '@/assets/images/publications/podcasts/publish-to-podbean.png'
import PublicationPanelComponent from '@/publications/PublicationPanelComponent.vue'
import { inject, onMounted, ref } from 'vue'
import type {
  GetPublicationContextFunction,
  IsPluginReadyFunction,
  PublishFunction
} from '@/publications/input'
import { useI18n } from 'vue-i18n'

import { useNotificationListeners } from '@/composables/useNotificationListeners'

const { listenForCategory } = useNotificationListeners()
const { t } = useI18n()

const pluginName = 'podbean'

const isPluginReadyFunction = inject<IsPluginReadyFunction>('isPluginReady')!
const publishFunction = inject<PublishFunction>('publish')!
const getPublicationContextFunction =
  inject<GetPublicationContextFunction>('getPublicationContext')!

// resolves with the id of the publication that was started, not with its success.
async function publish(): Promise<number> {
  const clientContext = {}
  const publicationContext = getPublicationContextFunction()
  return await publishFunction(
    publicationContext.type,
    publicationContext.publishableId,
    clientContext,
    pluginName
  )
}

const disabled = ref<boolean>(false)

listenForCategory('podcast-episode-completed-event', async (evt) => {
  disabled.value = await isPluginDisabled()
})

onMounted(async () => {
  disabled.value = await isPluginDisabled()
})

async function isPluginDisabled() {
  const clientContext = {}
  const publicationContext = getPublicationContextFunction()
  const ready = await isPluginReadyFunction(
    publicationContext.type,
    publicationContext.publishableId,
    clientContext,
    pluginName
  )
  return !ready!
}
</script>
