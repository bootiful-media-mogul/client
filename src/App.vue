<script lang="ts" setup>
import { mogul } from '@/services'
import PreviewComponent from '@/managedfiles/PreviewComponent.vue'
import NotificationBoxComponent from '@/notifications/NotificationBoxComponent.vue'
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
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

// the sections of the global toolbar, in order. each shows its name under its icon
const menu = [
  { label: 'app.menu.home', icon: homeIconAsset, go: () => go('home') },
  { label: 'app.menu.podcasts', icon: podcastIconAsset, go: goPodcasts },
  { label: 'app.menu.blogs', icon: blogIconAsset, go: () => go('blogs') },
  { label: 'app.menu.settings', icon: settingsIconAsset, go: () => go('settings') },
  { label: 'app.menu.jobs', icon: jobsIconAsset, go: () => go('jobs') }
]

const main = ref<HTMLElement>()

function focusMain() {
  main.value?.focus()
}

// a single page app never reloads, so a screen reader hears nothing when the view
// changes. naming the page in the title and moving focus to the top of the new view
// is what a page load would have done. a change of query alone (a search as you type,
// the podcasts link's cache buster) is not a new page, so focus stays where it is.
function titleFor(key: unknown): string {
  const app = t('app.title')
  return typeof key === 'string' ? `${t(key)} - ${app}` : app
}

const removeAfterEach = router.afterEach(async (to, from, failure) => {
  if (failure) return
  document.title = titleFor(to.meta.title)
  if (from.matched.length && to.path !== from.path) {
    await nextTick()
    main.value?.focus({ preventScroll: true })
  }
})
onUnmounted(removeAfterEach)

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
  /* square, and both sides spelled out: left to work the width out from the height,
     safari sizes an inline svg's wrapper by the svg's default width, so the icons spread */
  & .icon {
    height: calc(3 * var(--gutter-space));
    width: calc(3 * var(--gutter-space));
    display: block;
  }
}
/* the section's name, in small capitals, on a tab that drops out of the bottom of the
   black bar while a pointer (or the keyboard focus) is on its icon. it takes no room in
   the bar, so the icons stay centered with the wordmark and the greeting. it only exists
   on desktop: the floating mobile bar has no bar edge to hang it from, and no hover */
.nav-item {
  position: relative;
}

.nav-label {
  display: none;
}

/* Mobile-first: Default styles for mobile */ /* Mobile-first: Default styles for mobile */
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
  /* the floating bar is chrome, where the day accent barely shows */
  --focus-color: var(--brand-color);
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
    --focus-color: var(--accent-color);
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
    background-color: var(--topbar-color);
    color: var(--chrome-ink-color);
    /* above the search, so a name's tab drops over it rather than under it */
    position: relative;
    z-index: 2;
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
    /* above, the room a name's tab drops into (about a gutter and a half), then a
       gutter between the tab and the box */
    padding: calc(2.5 * var(--gutter-space)) 0 var(--gutter-space);
  }

  .toolbar-container .global-toolbar {
    margin: var(--gutter-space) 0;
    place-self: center;
  }

  /* light glyphs on the bar, its own color as their highlight; the brand hue on hover */
  .toolbar-container .icon {
    color: var(--chrome-ink-color);
    --icon-paper-color: var(--topbar-color);
  }

  .toolbar-container .icon:hover {
    color: var(--brand-color);
  }

  /* the tab starts at the foot of the icon, in the bar's own color, so it reads as part
     of the bar; its top padding is the bar's margin under the icons, which puts the name
     just below the bar's edge. the tab keeps the inherited font size so --radius (in em)
     rounds it as it does every other panel; only the name inside is small */
  .nav-label {
    display: block;
    position: absolute;
    top: 100%;
    left: 50%;
    z-index: 1;
    translate: -50% 0;
    padding: calc(var(--gutter-space) + var(--small-gutter-space) / 2) var(--gutter-space)
      var(--small-gutter-space);
    background-color: var(--topbar-color);
    /* the hovered icon's color, so the name reads as part of it */
    color: var(--brand-color);
    border-radius: 0 0 var(--radius) var(--radius);
    pointer-events: none;
    clip-path: inset(0 0 100% 0);
    transition: clip-path 140ms ease;
  }

  .nav-label-text {
    display: block;
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
    line-height: 1;
  }

  .nav-item:hover .nav-label,
  .nav-item:focus-within .nav-label {
    clip-path: inset(0);
  }

  @media (prefers-reduced-motion: reduce) {
    .nav-label {
      transition: none;
    }
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
    border-image: conic-gradient(var(--topbar-color) 0 0) fill 0 / /0 100vmax;
  }
}
</style>
<template>
  <div v-if="mogulUsername" class="app-wrapper">
    <NotificationBoxComponent ref="notifications" />
    <a class="skip-link" href="#main-content" @click.prevent="focusMain">{{
      t('app.skip-to-content')
    }}</a>
    <div class="frame">
      <div class="page">
        <header class="toolbar-container">
          <div class="top-bar">
            <div class="brand-slot"><BrandMark /></div>
            <div class="hello">{{ t('hello', { mogul: mogulUsername }) }}</div>
            <nav class="global-toolbar" :aria-label="t('app.menu.label')">
              <div v-for="item in menu" :key="item.label" class="nav-item">
                <Icon
                  highlight="hover"
                  :alt="t(item.label)"
                  @click.prevent="item.go"
                  :icon-hover="item.icon"
                  :icon="item.icon"
                />
                <!-- the icon already carries the name for a screen reader -->
                <span class="nav-label" aria-hidden="true"
                  ><span class="nav-label-text">{{ t(item.label) }}</span></span
                >
              </div>
            </nav>
          </div>
          <div class="search" role="search">
            <Search />
          </div>
        </header>

        <!-- Tab Bar with Provider/Inject Pattern
        -->
        <TabBar>
          <template #header><BrandMark /></template>
          <!-- Main content tab -->
          <Tab :label="t('app.tabs.main')">
            <main id="main-content" ref="main" class="view" tabindex="-1">
              <router-view :key="route.fullPath"></router-view>
            </main>
          </Tab>

          <!-- Sidebar panels grouped together -->
          <aside class="sidebar" :aria-label="t('app.panels.label')">
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
          </aside>
        </TabBar>

        <!--        <ServerTimeFooter />-->

        <!-- Buffer to prevent content from being hidden by floating toolbar on mobile -->
        <div class="page-content-buffer"></div>
      </div>
    </div>
  </div>
</template>
