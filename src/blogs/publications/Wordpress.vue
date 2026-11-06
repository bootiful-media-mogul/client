<template>
  <PublicationPanelComponent
    :enabled="!publishDisabled"
    :icon="wordpressIcon"
    :icon-hover="wordpressIcon"
    :label="t('publications.plugins.wordpress.publish')"
    :plugin="pluginName"
    :publish="publishToWordpress"
  >
    <template v-slot:panel>
      <div>
        <button
          :disabled="connected"
          class="pure-button publish-button"
          type="button"
          @click.prevent="attemptConnection()"
        >
          {{
            connected
              ? t('publications.plugins.wordpress.connected')
              : t('publications.plugins.wordpress.connect')
          }}
        </button>
      </div>
    </template>
  </PublicationPanelComponent>
</template>
<script lang="ts" setup>
import wordpressIcon from '@/assets/images/publications/blogs/wordpress-og.png'
// import connectedIcon from '@/assets/images/publications/blogs/linked-icon.png'
// import disconnectedIcon from '@/assets/images/publications/blogs/unlinked-icon.png'
import PublicationPanelComponent from '@/publications/PublicationPanelComponent.vue'
import { useI18n } from 'vue-i18n'
import { inject, onMounted, ref } from 'vue'
import type {
  GetPublicationContextFunction,
  IsPluginReadyFunction,
  PublishFunction
} from '@/publications/input'
import { entityNavigationContexts, wordpress } from '@/services'

const { t } = useI18n()
const pluginName = 'wordpress'
const isPluginReadyFunction = inject<IsPluginReadyFunction>('isPluginReady')!
const publishFunction = inject<PublishFunction>('publish')!
const getPublicationContextFunction =
  inject<GetPublicationContextFunction>('getPublicationContext')!

async function attemptConnection() {
  const publicationContext = getPublicationContextFunction()
  const context = await entityNavigationContexts.buildEntityContextFor(
    publicationContext.type,
    publicationContext.publishableId
  )
  const serialized = {
    resolvedType: context.resolvedType,
    context: Object.fromEntries(context.context)
  }
  const json = JSON.stringify(serialized)
  sessionStorage.setItem('pending_action', json)
  // todo when the user is redirected back we and we detect it on the router config, we need to
  //      publish an event and the plugins on this page can detect the event and expand themselves
  window.location.href = '/oauth2/authorization/wordpress'
}

async function connectedToWordpress(): Promise<boolean> {
  return (await wordpress.wordPressStatus()).connected
}

async function fullyConfigured(): Promise<boolean> {
  const clientContext = {}
  const publicationContext = getPublicationContextFunction()
  const ready = await isPluginReadyFunction(
    publicationContext.type,
    publicationContext.publishableId,
    clientContext,
    pluginName
  )
  return ready!
}

async function readyToPublish(): Promise<boolean> {
  configured.value = await fullyConfigured()
  connected.value = await connectedToWordpress()
  console.log('configured ' + configured.value + ', connected ' + connected.value)
  return configured.value && connected.value
}

async function publishToWordpress(scheduled: Date | null) {
  const publicationContext = getPublicationContextFunction()
  const clientContext = {}
  await publishFunction(
    publicationContext.type,
    publicationContext.publishableId,
    clientContext,
    pluginName,
    scheduled
  )
}

// rules: the publish button should _never_ be active UNLESS the user is both (configured && connected)
// the connection button should show connected if the user is connected, not connected otherwise.

const connected = ref<boolean>(false)
const configured = ref<boolean>(false)
const publishDisabled = ref<boolean>(false)

onMounted(async () => {
  publishDisabled.value = !(await readyToPublish())

  console.log('onMounted evaluating: ' + publishDisabled.value)
})
</script>
