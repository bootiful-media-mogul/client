<template>
  <slot />

  <div class="publications">
    <div class="publications-toolbar">
      <div v-for="(slot, index) in childSlots" :key="index">
        <div
          :class="{
            'toolbar-icon-selected': slot.selected,
            'toolbar-icon-disabled': isAnyPanelSelected
          }"
          class="toolbar-icon"
        >
          <Icon
            :alt="slot.plugin"
            :icon="slot.icon.icon"
            :icon-hover="slot.icon.iconHover"
            :width="50"
            @click.prevent="showPanelForSlot(slot)"
          />
        </div>
      </div>
    </div>
    <div v-for="(slot, index) in childSlots" :key="index">
      <div
        v-if="slot.selected"
        :class="{ 'publication-panel-selected': isAnyPanelSelected }"
        class="publication-panel"
      >
        <div>
          {{ t('publications.plugins.' + slot.plugin + '.description') }}
        </div>
        <component :is="slot.panel" />
      </div>
    </div>
  </div>

  <PublicationsListComponent
    v-if="showExistingPublications"
    :icons="icons"
    :publications="existingPublications"
    unpublishable
    @unpublish="unpublish"
  />
</template>
<style scoped>
.publications-toolbar {
  display: grid;
  grid-template-columns: repeat(auto-fill, 50px);
  gap: var(--gutter-space-half);
}

.toolbar-icon {
  border-radius: var(--radius);
  background-color: black;
}

.toolbar-icon:hover {
  background-color: white;
}

.toolbar-icon-selected {
  background-color: var(--panel-bg-color);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.publication-panel {
  border-radius: var(--radius);
  background-color: var(--panel-bg-color);
  padding: calc(var(--gutter-space) / 2);
  margin: 0;
  overflow: hidden;
}

.publication-panel .plugin {
  background-color: lightgray;
  padding: var(--gutter-space-half);
  border-bottom-right-radius: var(--radius);
  border-top-right-radius: var(--radius);
  margin-left: calc(var(--gutter-space-half) * -1);
  margin-bottom: var(--gutter-space-half);
  font-weight: bold;
  font-size: var(--font-size-sm);
}

.publication-panel-selected {
  border-top-left-radius: 0;
}

.toolbar-icons {
  padding-left: var(--gutter-space);
}

.toolbar-icon-disabled {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.publications {
  margin-top: var(--gutter-space);
}
</style>

<script lang="ts" setup>
import Icon from '@/ui/Icon.vue'
import PublicationsListComponent from '@/publications/PublicationsListComponent.vue'
import { onMounted, onUnmounted, provide, ref } from 'vue'
import { type PanelSlot, PanelSlotIcon, PublicationContext } from '@/publications/input'
import { Notification, Publication, publications } from '@/services'
import { useI18n } from 'vue-i18n'

import { useNotificationListeners } from '@/composables/useNotificationListeners'

const { listenForCategory } = useNotificationListeners()

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    disabled: boolean
    publishable: string
    type: string
    /**
     * set false where something else on the page already lists these publications --
     * the home page renders them per-day -- so they aren't shown twice.
     */
    showExistingPublications?: boolean
  }>(),
  { showExistingPublications: true }
)

const existingPublications = ref<Array<Publication>>([])

/**
 * the callers of publishAndAwait, keyed by the publication they're waiting on. the
 * publish mutation only queues the work; the completed-notification is what says it
 * actually happened, and its key is the publication id -- which is the only way to tell
 * our own publication apart from one another tab, or another plugin, just finished.
 */
const pendingPublications = new Map<number, (publication: Publication | null) => void>()

onUnmounted(() => {
  // whoever was waiting has nobody left to hand a result to. settle them anyway, so an
  // awaiting caller isn't left holding a promise that can never resolve.
  pendingPublications.forEach((resolve) => resolve(null))
  pendingPublications.clear()
})
const childSlots = ref<Array<PanelSlot>>([])
const isAnyPanelSelected = ref<boolean>(false)
const icons = ref<Map<string, PanelSlotIcon>>(new Map<string, PanelSlotIcon>())

async function refresh() {
  const ctx = getPublicationContext()
  await refreshPublications(ctx.publishableId, ctx.type)
}

onMounted(async () => {
  await refresh()
  childSlots.value.forEach((slot) => {
    icons.value.set(slot.plugin, slot.icon)
  })
})

listenForCategory('publication-started-event', async (notification: Notification) => {
  await refresh()
  existingPublications.value
    .filter((pub) => pub.id === parseInt(notification.key))
    .forEach((p) => {
      p.publishing = true
    })
})

listenForCategory('publication-completed-event', async (notification: Notification) => {
  await refresh()
  const publicationId = parseInt(notification.key)
  const resolve = pendingPublications.get(publicationId)
  if (resolve) {
    pendingPublications.delete(publicationId)
    resolve(existingPublications.value.find((p) => p.id === publicationId) ?? null)
  }
})

async function refreshPublications(publishableId: number, type: string) {
  existingPublications.value = await publications.publications(publishableId, type)
}

async function unpublish(id: number) {
  await publications.unpublish(id)
  await refresh()
}

async function publish(
  type: string,
  id: number,
  context: Map<string, any>,
  plugin: string
): Promise<number> {
  const publicationId = await publications.publish(type, id, JSON.stringify(context), plugin)
  await refresh()
  return publicationId
}

async function publishAndAwait(
  type: string,
  id: number,
  context: Map<string, any>,
  plugin: string
): Promise<Publication | null> {
  const publicationId = await publish(type, id, context, plugin)
  // a plugin with nothing to render finishes in milliseconds, so the notification can
  // have been and gone before the mutation even returned. the refresh inside publish()
  // has the publication as it now stands; if it's already done, there is no event left
  // to wait for.
  const published = existingPublications.value.find(
    (p) => p.id === publicationId && p.state === 'PUBLISHED'
  )
  if (published) return published
  return new Promise((resolve) => pendingPublications.set(publicationId, resolve))
}

function showPanelForSlot(slot: PanelSlot) {
  const selected = childSlots.value.filter((s) => s.plugin === slot.plugin && s.selected)
  if (selected.length > 0) {
    selected[0].selected = false
  } //
  else {
    childSlots.value.forEach((s) => {
      s.selected = slot.plugin === s.plugin
    })
  }
  isAnyPanelSelected.value = childSlots.value.filter((cs) => cs.selected).length > 0
}

function registerPublicationPanel(slotPair: PanelSlot) {
  if (childSlots.value.filter((slot) => slot.plugin == slotPair.plugin).length == 0)
    childSlots.value.push(slotPair)
}

function getPublicationContext(): PublicationContext {
  return new PublicationContext(parseInt(props.publishable), props.type)
}

async function isPluginReady(type: string, id: number, context: Map<string, any>, plugin: string) {
  return await publications.canPublish(id, type, JSON.stringify(context), plugin)
}

provide('getPublicationContext', getPublicationContext)
provide('isPluginReady', isPluginReady)
provide('publish', publish)
provide('publishAndAwait', publishAndAwait)
provide('registerPublicationPanel', registerPublicationPanel)
</script>
