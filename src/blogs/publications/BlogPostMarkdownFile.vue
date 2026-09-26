<template>
  <PublicationPanelComponent
    :icon="downloadMarkdownIcon"
    :icon-hover="downloadMarkdownIcon"
    :plugin="pluginName"
  >
    <template v-slot:panel>
      <div>
        <button
          :disabled="disabled || producing"
          class="pure-button pure-button-primary publish-button"
          type="button"
          @click.prevent="downloadMarkdown()"
        >
          {{
            producing
              ? t('publications.plugins.blogPostMarkdownFile.producing')
              : t('publications.plugins.blogPostMarkdownFile.download')
          }}
        </button>
        <!--
          the auto-open below is a popup as far as the browser is concerned, and the click
          that started it stops counting as a gesture once we've waited on the server, so
          it can be blocked. this link is the fallback, and it costs nothing to leave up.
        -->
        <a v-if="readyUrl" :href="readyUrl" class="ready-link">
          {{ t('publications.plugins.blogPostMarkdownFile.ready') }}
        </a>
      </div>
    </template>
  </PublicationPanelComponent>
</template>
<script lang="ts" setup>
import downloadMarkdownIcon from '@/assets/images/publications/blogs/download-blog-post-as-markdown.png'

import PublicationPanelComponent from '@/publications/PublicationPanelComponent.vue'
import { useI18n } from 'vue-i18n'
import { inject, onMounted, ref } from 'vue'
import type {
  GetPublicationContextFunction,
  IsPluginReadyFunction,
  PublishAndAwaitFunction
} from '@/publications/input'

const { t } = useI18n()

const pluginName = 'blogPostMarkdownFile'

const isPluginReadyFunction = inject<IsPluginReadyFunction>('isPluginReady')!
const publishAndAwaitFunction = inject<PublishAndAwaitFunction>('publishAndAwait')!
const getPublicationContextFunction =
  inject<GetPublicationContextFunction>('getPublicationContext')!

const disabled = ref<boolean>(false)
const producing = ref<boolean>(false)
const readyUrl = ref<string | null>(null)

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
 * the file the user is asking for doesn't exist until the plugin has run, and the publish
 * mutation returns as soon as the work is queued -- which is why this used to publish and
 * then do nothing at all, leaving the user to go find the link in the publications list.
 * wait for the publication to finish and take the URL off its outcome.
 */
async function downloadMarkdown() {
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
