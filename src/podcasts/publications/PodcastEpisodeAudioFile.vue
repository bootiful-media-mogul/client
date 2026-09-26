<template>
  <PublicationPanelComponent
    :icon="downloadAudioIcon"
    :icon-hover="downloadAudioIcon"
    plugin="audioFile"
  >
    <template v-slot:panel>
      <div>
        <button
          :disabled="disabled || producing"
          class="pure-button pure-button-primary publish-button"
          type="button"
          @click.prevent="downloadAudio()"
        >
          {{
            producing
              ? t('publications.plugins.audioFile.producing')
              : t('publications.plugins.audioFile.download')
          }}
        </button>
        <!--
          the auto-open below is a popup as far as the browser is concerned, and a render
          takes long enough that the click that started it no longer counts as a gesture,
          so it can be blocked. this link is the fallback, and it costs nothing to leave up.
        -->
        <a v-if="readyUrl" :href="readyUrl" class="ready-link">
          {{ t('publications.plugins.audioFile.ready') }}
        </a>
      </div>
    </template>
  </PublicationPanelComponent>
</template>
<script lang="ts" setup>
import downloadAudioIcon from '@/assets/images/publications/podcasts/publish-download-produced-audio.png'
import PublicationPanelComponent from '@/publications/PublicationPanelComponent.vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

import { inject, onMounted, ref } from 'vue'
import type {
  GetPublicationContextFunction,
  IsPluginReadyFunction,
  PublishAndAwaitFunction
} from '@/publications/input'

import { useNotificationListeners } from '@/composables/useNotificationListeners'

const { listenForCategory } = useNotificationListeners()

const pluginName = 'audioFile'

const isPluginReadyFunction = inject<IsPluginReadyFunction>('isPluginReady')!
const publishAndAwaitFunction = inject<PublishAndAwaitFunction>('publishAndAwait')!
const getPublicationContextFunction =
  inject<GetPublicationContextFunction>('getPublicationContext')!

const disabled = ref<boolean>(false)
const producing = ref<boolean>(false)
const readyUrl = ref<string | null>(null)

listenForCategory('podcast-episode-completed-event', async () => {
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

/**
 * publishing this plugin re-produces the episode from whatever segments it has now, and
 * the produced audio lives at a URL that doesn't change from one render to the next. so
 * asking for that URL before the render finishes -- which is what awaiting the publish
 * mutation alone gets you -- hands back the previous composite, missing whichever segment
 * was just added or removed. wait for the publication to complete instead, and take the
 * URL off its outcome: that one was recorded after the render, and carries the new file's
 * etag.
 */
async function downloadAudio() {
  const publicationContext = getPublicationContextFunction()
  producing.value = true
  readyUrl.value = null
  try {
    const publication = await publishAndAwaitFunction(
      publicationContext.type,
      publicationContext.publishableId,
      {},
      pluginName
    )
    if (!publication) return
    const outcome = publication.outcomes?.find((o) => o.success && o.url)
    if (!outcome) {
      console.error('the publication finished with nothing to download', publication)
      return
    }
    readyUrl.value = outcome.url
    window.open(outcome.url, '_blank')
  } finally {
    producing.value = false
  }
}

onMounted(async () => {
  disabled.value = await isPluginDisabled()
})
</script>
<style scoped>
.ready-link {
  display: inline-block;
  margin-left: 1em;
}
</style>
