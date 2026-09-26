<style scoped>
.platform-panel {
  display: grid;
  grid-template-areas:
    ' platform-enabled . platform-name   '
    ' . . platform-post ';
  grid-template-columns: min-content calc(var(--gutter-space) / 2) auto;
}

.platform-panel .platform-enabled {
  grid-area: platform-enabled;
}

.platform-panel .platform-post {
  grid-area: platform-post;
  width: 100%;
  /* grid items are min-width:auto by default, so this one refuses to shrink below
     the intrinsic width of the textarea inside it and pushes the auto track -- and
     the panel with it -- wider than the container. */
  min-width: 0;
}

.platform-panel .platform-post textarea {
  width: 100%;
}

.platform-panel .platform-name {
  grid-area: platform-name;
  font-weight: bolder;
  .notes {
    display: inline;
    font-weight: normal;
  }
}

.platform-panels {
  padding-bottom: var(--gutter-space);
  padding-top: var(--gutter-space);
}
</style>
<template>
  <PublicationPanelComponent :icon="icon" :icon-hover="icon" :plugin="pluginName">
    <template v-slot:panel>
      <div class="platform-panels">
        <div
          v-for="p in posts"
          v-bind:key="p.ayrsharePublicationComposition.platform"
          class="platform-panel"
        >
          <div class="platform-enabled">
            <input v-model="p.enabled" :disabled="publishing" type="checkbox" @change="reset(p)" />
          </div>
          <div class="platform-name">
            {{ getPlatformLabel(p.ayrsharePublicationComposition.platform) }}
            <div class="notes">
              {{ getMaxCharactersAllowed(p.ayrsharePublicationComposition.platform) }}
            </div>
          </div>
          <div class="platform-post">
            <div v-if="p.enabled">
              <InputWrapper v-model="p.post">
                <textarea v-model="p.post" :disabled="publishing" required rows="5" />
                <CompositionComponent
                  :composition-id="p.ayrsharePublicationComposition.composition.id"
                />
                <InputTools v-model="p.post" />
              </InputWrapper>
            </div>
          </div>
        </div>
      </div>
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
import { useI18n } from 'vue-i18n'

import PublicationPanelComponent from '@/publications/PublicationPanelComponent.vue'
import { inject, onMounted, ref } from 'vue'
import {
  type GetPublicationContextFunction,
  type IsPluginReadyFunction,
  PublicationContext,
  type PublishFunction
} from '@/publications/input'
import { ayrshare, AyrsharePublicationComposition } from '@/services'
import CompositionComponent from '@/compositions/CompositionComponent.vue'
import InputTools from '@/ui/InputTools.vue'
import InputWrapper from '@/ui/input/InputWrapper.vue'
import { useNotificationListeners } from '@/composables/useNotificationListeners'

const { listenForCategory } = useNotificationListeners()

const props = defineProps<{
  pluginName: string
  icon: string
  readyEventCategory?: string
}>()

const pluginName = props.pluginName

const { t } = useI18n()

function getMaxCharactersAllowed(platform: string): string {
  let msg = t(
    'publications.plugins.' + pluginName + '.platforms.' + platform + '.maxCharactersAllowed'
  )
  if (msg == '' || msg == '0') {
    msg = ''
  }
  if (msg != '') {
    const charsOrLess = t('publications.plugins.' + pluginName + '.charactersOrLess', { num: msg })
    if (charsOrLess && charsOrLess != '') return '(' + charsOrLess + ')'
  }
  return ''
}

function getPlatformLabel(platform: string): string {
  return t('publications.plugins.' + pluginName + '.platforms.' + platform + '.label')
}

class EnableAyrsharePublicationComposition {
  public enabled: boolean = false
  public ayrsharePublicationComposition: AyrsharePublicationComposition
  public post: string = ''

  constructor(ayrsharePublicationComposition: AyrsharePublicationComposition) {
    this.ayrsharePublicationComposition = ayrsharePublicationComposition
  }
}

const publishing = ref<boolean>(false)

const posts = ref<Array<EnableAyrsharePublicationComposition>>([])
const disabled = ref<boolean>(false)
const isPluginReadyFunction = inject<IsPluginReadyFunction>('isPluginReady')!
const publishFunction = inject<PublishFunction>('publish')!
const getPublicationContextFunction =
  inject<GetPublicationContextFunction>('getPublicationContext')!

// resolves with the id of the publication that was started, not with its success.
async function publish(): Promise<number> {
  publishing.value = true
  const publicationContext: PublicationContext = getPublicationContextFunction()

  const clientContext: any = {}

  posts.value.forEach((p) => {
    if (p.enabled) {
      clientContext[p.ayrsharePublicationComposition.platform] = p.post
      clientContext[p.ayrsharePublicationComposition.platform + 'CompositionId'] =
        p.ayrsharePublicationComposition.composition.id
    }
  })

  return await publishFunction(
    publicationContext.type,
    publicationContext.publishableId,
    clientContext,
    pluginName
  )
}

async function reset(post: EnableAyrsharePublicationComposition) {
  if (!post.enabled) {
    post.post = ''
  }
  disabled.value = await isPluginDisabled()
}

if (props.readyEventCategory) {
  listenForCategory(props.readyEventCategory, async (evt) => {
    disabled.value = await isPluginDisabled()
  })
}

listenForCategory('ayrshare-publication-completion-event', async (evt) => {
  publishing.value = false
  await refresh()
})

// publishing to N platforms sends N completion notifications, and every one of
// them asks us to reload. they'd all be asking for the exact same thing, so ride
// along on the request that's already in flight instead of firing N of them.
let refreshing: Promise<void> | null = null

async function refresh(): Promise<void> {
  if (refreshing) {
    return refreshing
  }
  refreshing = (async () => {
    try {
      posts.value = (await ayrshare.publicationCompositions()).map(
        (x) => new EnableAyrsharePublicationComposition(x)
      )
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

onMounted(async () => {
  await refresh()
  disabled.value = await isPluginDisabled()
})

async function isPluginDisabled() {
  const selected = posts.value.filter((p) => p.enabled).length > 0
  if (!selected) {
    return true
  }

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
