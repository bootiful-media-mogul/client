<script lang="ts" setup>
import { mogul } from '@/services'
import PreviewComponent from '@/managedfiles/PreviewComponent.vue'
import NotificationBoxComponent from '@/notifications/NotificationBoxComponent.vue'
import { onMounted, ref } from 'vue'
import TranscriptComponent from '@/transcripts/TranscriptComponent.vue'
import PanelComponent from '@/layout/PanelComponent.vue'
import Search from '@/search/Search.vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import NotesComponent from '@/notes/NotesComponent.vue'
import TabBar from '@/layout/TabBar.vue'
import BrandMark from '@/layout/BrandMark.vue'
import Tab from '@/layout/Tab.vue'
import Icon from '@/ui/Icon.vue'

import homeIconAsset from '@/assets/images/icons/home.svg'

import settingsIconAsset from '@/assets/images/icons/settings.svg'

import podcastIconAsset from '@/assets/images/icons/podcast.svg'

import blogIconAsset from '@/assets/images/icons/rss.svg'

import jobsIconAsset from '@/assets/images/icons/jobs.svg'

import notesPanelIconAsset from '@/assets/images/icons/notes.svg'
import previewPanelIconAsset from '@/assets/images/icons/preview.svg'
import transcriptsPanelIconAsset from '@/assets/images/icons/transcript.svg'

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
  & .icon {
    height: calc(3 * var(--gutter-space));
    width: auto;
  }
}
/* Mobile-first: Default styles for mobile */
.toolbar-container {
  color: var(--chrome-ink-color);
  border-radius: var(--radius);
  padding: var(--gutter-space);
  background-color: var(--chrome-color);
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
  font-size: var(--font-size-sm);
}

/* on mobile the top bar is only a grouping: display: contents keeps its children as items
   of the floating toolbar's grid, in that grid's hello / search / icons order */
.toolbar-container .top-bar {
  display: contents;
}

/* the wordmark only has room on desktop; the floating mobile bar keeps its three rows */
.toolbar-container .brand-slot {
  grid-area: brand;
  display: none;
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

/* the svg icons take the text color: muted on the floating bar, light on hover.
   their highlight is the bar itself, so only the glyph changes */
.toolbar-container .icon {
  color: var(--chrome-muted-color);
  --icon-paper-color: var(--chrome-color);
}

.toolbar-container .icon:hover {
  color: var(--chrome-ink-color);
}

.page-content-buffer {
  grid-area: buffer;
  height: calc(var(--global-toolbar-height) + var(--gutter-space) * 4);
}

/* Desktop overrides */
@container app (min-width: 900px) {
  .toolbar-container {
    color: var(--ink-color);
    background-color: transparent;
    position: static;
    padding: 0;
    border: none;
    border-radius: 0;
    z-index: auto;
    left: auto;
    right: auto;
    bottom: auto;
    display: grid;
    grid-template-areas:
      'top-bar'
      'search';
    grid-template-rows: auto auto;
    gap: 0;
    box-shadow: none;
  }

  /* wordmark, icons and the signed-in mogul share a full-width black bar; equal 1fr
     sides keep the icons centered on the page however long the wordmark or the name is */
  .toolbar-container .top-bar {
    grid-area: top-bar;
    display: grid;
    grid-template-areas: 'brand global-toolbar hello';
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 calc(2 * var(--gutter-space));
    background-color: var(--ink-color);
    color: var(--chrome-ink-color);
  }

  .toolbar-container .hello {
    text-align: right;
    color: var(--chrome-muted-color);
  }

  .toolbar-container .brand-slot {
    display: block;
    justify-self: start;
  }

  .toolbar-container .search {
    width: 50%;
    justify-self: center;
    padding: var(--gutter-space) 0;
  }

  .toolbar-container .global-toolbar {
    margin: var(--gutter-space) 0;
    place-self: center;
  }

  /* light glyphs on the bar, its own black as their highlight; sky blue on hover */
  .toolbar-container .icon {
    color: var(--chrome-ink-color);
    --icon-paper-color: var(--ink-color);
  }

  .toolbar-container .icon:hover {
    color: var(--bg-color);
  }

  /* the buffer exists to clear the floating toolbar, which is only fixed on mobile.
     on desktop the toolbar sits in normal flow (position: static, above), so the
     buffer is ~224px of dead height that pushes the page past the viewport and
     produces a scrollbar over empty space. */
  .page-content-buffer {
    height: 0;
  }
}

/* the centered wide layout: the page is a box in the middle of the window, but the top
   bar stays a full-width band. its contents stay in the box; the border-image outset
   paints the black out to the window edges (.frame clips the overflow) */
@container app (min-width: 1700px) {
  .toolbar-container .top-bar {
    border-image: conic-gradient(var(--ink-color) 0 0) fill 0 / /0 100vmax;
  }
}
</style>
<template>
  <div v-if="mogulUsername" class="app-wrapper">
    <NotificationBoxComponent ref="notifications" />
    <div class="frame">
      <div class="page">
        <div class="toolbar-container">
          <div class="top-bar">
            <div class="brand-slot"><BrandMark /></div>
            <div class="hello">{{ t('hello', { mogul: mogulUsername }) }}</div>
            <div class="global-toolbar">
              <Icon
                highlight="hover"
                @click.prevent="go('home')"
                :icon-hover="homeIconAsset"
                :icon="homeIconAsset"
              />
              <Icon
                highlight="hover"
                @click.prevent="goPodcasts"
                :icon-hover="podcastIconAsset"
                :icon="podcastIconAsset"
              />
              <Icon
                highlight="hover"
                @click.prevent="go('blogs')"
                :icon-hover="blogIconAsset"
                :icon="blogIconAsset"
              />
              <Icon
                highlight="hover"
                @click.prevent="go('settings')"
                :icon-hover="settingsIconAsset"
                :icon="settingsIconAsset"
              />
              <Icon
                highlight="hover"
                @click.prevent="go('jobs')"
                :icon-hover="jobsIconAsset"
                :icon="jobsIconAsset"
              />
            </div>
          </div>
          <div class="search">
            <Search />
          </div>
        </div>

        <!-- Tab Bar with Provider/Inject Pattern
        -->
        <TabBar>
          <template #header><BrandMark /></template>
          <!-- Main content tab -->
          <Tab :label="t('app.tabs.main')">
            <div class="view">
              <router-view :key="route.fullPath"></router-view>
            </div>
          </Tab>

          <!-- Sidebar panels grouped together -->
          <div class="sidebar">
            <Tab :label="t('app.panels.notes')">
              <PanelComponent :title="t('app.panels.notes')" :icon="notesPanelIconAsset">
                <NotesComponent />
              </PanelComponent>
            </Tab>

            <Tab :label="t('app.panels.media-preview')">
              <PanelComponent :title="t('app.panels.media-preview')" :icon="previewPanelIconAsset">
                <PreviewComponent />
              </PanelComponent>
            </Tab>

            <Tab :label="t('app.panels.transcripts')">
              <PanelComponent
                :title="t('app.panels.transcripts')"
                :icon="transcriptsPanelIconAsset"
              >
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
