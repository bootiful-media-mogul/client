<script lang="ts" setup>
import { mogul } from '@/services'
import PreviewComponent from '@/managedfiles/PreviewComponent.vue'
import NotificationBoxComponent from '@/notifications/NotificationBoxComponent.vue'
import { onMounted, ref } from 'vue'
import TranscriptComponent from '@/transcripts/TranscriptComponent.vue'
import ServerTimeFooter from '@/diagnostics/ServerTimeFooter.vue'
import PanelComponent from '@/layout/PanelComponent.vue'
import Search from '@/search/Search.vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import NotesComponent from '@/notes/NotesComponent.vue'
import TabBar from '@/layout/TabBar.vue'
import Tab from '@/layout/Tab.vue'
import Icon from '@/ui/Icon.vue'

import homeIconAsset from '@/assets/images/navbar/home-icon.png'
import homeIconAssetHighlight from '@/assets/images/navbar/home-icon-highlight.png'

import settingsIconAsset from '@/assets/images/navbar/settings-icon.png'
import settingsIconAssetHighlight from '@/assets/images/navbar/settings-icon-highlight.png'

import podcastIconAsset from '@/assets/images/navbar/podcast-icon.png'
import podcastIconAssetHighlight from '@/assets/images/navbar/podcast-icon-highlight.png'

import blogIconAsset from '@/assets/images/navbar/blogs-icon.png'
import blogIconAssetHighlight from '@/assets/images/navbar/blogs-icon-highlight.png'

import jobsIconAsset from '@/assets/images/navbar/jobs-icon.png'
import jobsIconAssetHighlight from '@/assets/images/navbar/jobs-icon-highlight.png'

import router from '@/index'
import { usePendingAction } from '@/composables/usePendingAction'

const { t } = useI18n()
const route = useRoute()
const mogulUsername = ref<string | null>(null)

function goPodcasts() {
  router.push({
    path: '/podcasts',
    query: {
      when: Date.now()
    }
  })
}
function go(view: string) {
  router.push({ name: view })
}

const { resume } = usePendingAction()
onMounted(async () => await resume())

onMounted(async () => {
  const res = await mogul.user()
  if (res && res.email) {
    mogulUsername.value = `${res.givenName} ${res.familyName} (${res.email})`
    // here rather than in a view: this runs once per session whatever page you land
    // on, and it reuses the user we just fetched. anything that resolves "today"
    // server-side -- the home page's status, publishing from the ayrshare panel --
    // needs the zone on record, and none of them go through the home page first.
    await mogul.adoptBrowserTimeZoneIfUnset(res)
  } //
  else {
    console.log('could not get user info from mogul.user()')
  }
})
</script>
<style scoped>
.global-toolbar {
  margin-bottom: var(--gutter-space);
  margin-top: var(--gutter-space);
  display: flex;
  grid-area: global-toolbar;
  place-self: center;

  gap: var(--gutter-space);
  & img {
    max-height: calc(3 * var(--gutter-space));
    width: auto;
  }
}
/* Mobile-first: Default styles for mobile */
.toolbar-container {
  color: white;
  border-radius: var(--radius);
  padding: var(--gutter-space);
  background-color: black;
  position: fixed;
  bottom: var(--gutter-space);
  left: var(--gutter-space);
  right: var(--gutter-space);
  z-index: 1000;
  display: grid;
  grid-template-areas:
    'hello'
    'search'
    'global-toolbar';
  grid-gap: var(--gutter-space-half);
}

.toolbar-container .hello {
  grid-area: hello;
  text-align: center;
}

.toolbar-container .search {
  grid-area: search;
  width: 100%;
  padding-bottom: 0;
}

.toolbar-container .global-toolbar {
  grid-area: global-toolbar;
  margin: 0;
  justify-content: center;
}

.toolbar-container img {
  filter: invert(0.5);
}

.toolbar-container img:hover {
  filter: invert(1);
}

.page-content-buffer {
  grid-area: buffer;
  height: calc(var(--global-toolbar-height) + var(--gutter-space) * 4);
}

/* Desktop overrides */
@container app (min-width: 900px) {
  .toolbar-container {
    color: black;
    background-color: transparent;
    position: static;
    padding: var(--gutter-space);
    border: none;
    border-radius: 0;
    z-index: auto;
    left: auto;
    right: auto;
    bottom: auto;
    display: grid;
    grid-template-areas:
      'hello hello hello'
      'global-toolbar global-toolbar global-toolbar'
      'search search search';
    grid-template-rows: auto auto auto;
    gap: 0;
    box-shadow: none;
  }

  .toolbar-container .hello {
    text-align: center;
    padding: var(--gutter-space-half) 0;
  }

  .toolbar-container .search {
    width: 50%;
    justify-self: center;
    padding-bottom: var(--gutter-space);
  }

  .toolbar-container .global-toolbar {
    margin: var(--gutter-space) 0;
    place-self: center;
  }

  .toolbar-container img {
    filter: none;
  }

  .toolbar-container img:hover {
    filter: none;
  }

  /* the buffer exists to clear the floating toolbar, which is only fixed on mobile.
     on desktop the toolbar sits in normal flow (position: static, above), so the
     buffer is ~224px of dead height that pushes the page past the viewport and
     produces a scrollbar over empty space. */
  .page-content-buffer {
    height: 0;
  }
}
</style>
<template>
  <div v-if="mogulUsername" class="app-wrapper">
    <NotificationBoxComponent ref="notifications" />
    <div class="frame">
      <div class="page">
        <div class="toolbar-container">
          <div class="hello">{{ t('hello', { mogul: mogulUsername }) }}</div>
          <div class="search">
            <Search />
          </div>
          <div class="global-toolbar">
            <Icon
              @click.prevent="go('home')"
              :icon-hover="homeIconAssetHighlight"
              :icon="homeIconAsset"
            />
            <Icon
              @click.prevent="goPodcasts"
              :icon-hover="podcastIconAssetHighlight"
              :icon="podcastIconAsset"
            />
            <Icon
              @click.prevent="go('blogs')"
              :icon-hover="blogIconAssetHighlight"
              :icon="blogIconAsset"
            />
            <Icon
              @click.prevent="go('settings')"
              :icon-hover="settingsIconAssetHighlight"
              :icon="settingsIconAsset"
            />
            <Icon
              @click.prevent="go('jobs')"
              :icon-hover="jobsIconAssetHighlight"
              :icon="jobsIconAsset"
            />
          </div>
        </div>

        <!-- Tab Bar with Provider/Inject Pattern
        -->
        <TabBar>
          <!-- Main content tab -->
          <Tab :label="t('app.tabs.main')">
            <div class="view">
              <router-view :key="route.fullPath"></router-view>
            </div>
          </Tab>

          <!-- Sidebar panels grouped together -->
          <div class="sidebar">
            <Tab :label="t('app.panels.notes')">
              <PanelComponent :title="t('app.panels.notes')">
                <NotesComponent />
              </PanelComponent>
            </Tab>

            <Tab :label="t('app.panels.media-preview')">
              <PanelComponent :title="t('app.panels.media-preview')">
                <PreviewComponent />
              </PanelComponent>
            </Tab>

            <Tab :label="t('app.panels.transcripts')">
              <PanelComponent :title="t('app.panels.transcripts')">
                <TranscriptComponent />
              </PanelComponent>
            </Tab>
          </div>
        </TabBar>

        <!--        <ServerTimeFooter />-->

        <!-- Buffer to prevent content from being hidden by floating toolbar on mobile -->
        <div class="page-content-buffer"></div>
      </div>
    </div>
  </div>
</template>
