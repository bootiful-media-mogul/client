<script lang="ts" setup>
import { mogul } from '@/services'
import PreviewComponent from '@/managedfiles/PreviewComponent.vue'
import NotificationBoxComponent from '@/notifications/NotificationBoxComponent.vue'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import TranscriptComponent from '@/transcripts/TranscriptComponent.vue'
import PanelComponent from '@/layout/PanelComponent.vue'
import SearchPalette from '@/search/SearchPalette.vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import NotesComponent from '@/notes/NotesComponent.vue'
import TabBar from '@/layout/TabBar.vue'
import BrandMark from '@/layout/BrandMark.vue'
import Tab from '@/layout/Tab.vue'
import Icon from '@/ui/Icon.vue'
import Dropdown from '@/ui/Dropdown.vue'
import { mainSectionFor, mainSections, otherSections } from '@/layout/sections'

import searchIconAsset from '@/assets/images/icons/search.svg'
import notesPanelIconAsset from '@/assets/images/icons/notes.svg'
import previewPanelIconAsset from '@/assets/images/icons/preview.svg'
import transcriptsPanelIconAsset from '@/assets/images/icons/transcript.svg'

import router from '@/index'
import { usePendingAction } from '@/composables/usePendingAction'
import type { User } from '@/mogul'

const { t } = useI18n()
const route = useRoute()
const me = ref<User | null>(null)

const initials = computed(() => {
  const user = me.value
  if (!user) return ''
  const fromName = `${user.givenName?.[0] ?? ''}${user.familyName?.[0] ?? ''}`
  return (fromName || user.email[0] || '').toUpperCase()
})
const fullName = computed(() =>
  me.value
    ? `${me.value.givenName ?? ''} ${me.value.familyName ?? ''}`.trim() || me.value.email
    : ''
)

// the main section the current page belongs to, marked under its icon
const activeSection = computed(() => mainSectionFor(route.path))

const accountOpen = ref(false)
const palette = ref<InstanceType<typeof SearchPalette>>()
const shortcut = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K'
const shortcutKeys = shortcut.startsWith('⌘') ? 'Meta+K' : 'Control+K'

// below the desktop break the bar floats at the bottom of the window, so the account menu
// opens upward. .frame fills the window, so the window's width stands in for the container's
const narrowQuery = window.matchMedia('(max-width: 899.98px)')
const narrow = ref(narrowQuery.matches)
const onNarrowChange = (e: MediaQueryListEvent) => (narrow.value = e.matches)
narrowQuery.addEventListener('change', onNarrowChange)
onUnmounted(() => narrowQuery.removeEventListener('change', onNarrowChange))

const main = ref<HTMLElement>()

// main takes focus when the view changes and from the skip link, so it needs a tabindex
// then, but only then. left on, it makes main the focus target for any click on something
// inside it that doesn't take focus itself, and in Safari that's every button: clicking
// one focuses main instead, and focusing main scrolls the page up to the top of it.
// so the tabindex goes on just before main is focused, and comes off when focus leaves.
function focusMainElement(options?: FocusOptions) {
  const element = main.value
  if (!element) return
  element.setAttribute('tabindex', '-1')
  element.addEventListener('blur', () => element.removeAttribute('tabindex'), { once: true })
  element.focus(options)
}

function focusMain() {
  focusMainElement()
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
    focusMainElement({ preventScroll: true })
  }
})
onUnmounted(removeAfterEach)

const { resume } = usePendingAction()
onMounted(async () => await resume())

onMounted(async () => {
  const res = await mogul.user()
  if (res && res.email) {
    me.value = res
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
/* the three main sections, as big icons. square, and both sides spelled out: left to work
   the width out from the height, safari sizes an inline svg's wrapper by the svg's
   default width, so the icons spread */
.global-toolbar {
  display: flex;
  gap: var(--gutter-space);

  & .icon {
    height: calc(3 * var(--gutter-space));
    width: calc(3 * var(--gutter-space));
    display: block;
  }
}

/* the section's name, in small capitals, on a tab that drops out of the bottom of the
   black bar while a pointer (or the keyboard focus) is on its icon. it takes no room in
   the bar, so the icons stay centered. it only exists on desktop: the floating mobile bar
   has no bar edge to hang it from, and no hover */
.nav-item {
  position: relative;
}

.nav-label {
  display: none;
}

/* mobile first: one floating row at the bottom of the window. the three sections, then,
   past a rule, search and the account menu */
.toolbar-container {
  color: var(--chrome-ink-color);
  border-radius: var(--radius);
  padding: var(--gutter-space-half) var(--gutter-space);
  background-color: var(--chrome-color);
  position: fixed;
  bottom: var(--gutter-space);
  left: var(--gutter-space);
  right: var(--gutter-space);
  z-index: 1000;
  /* the floating bar is chrome, where the day accent barely shows */
  --focus-color: var(--brand-color);
}

.toolbar-container .top-bar {
  display: flex;
  align-items: center;
  gap: var(--gutter-space);
}

/* the wordmark only has room on desktop */
.toolbar-container .brand-slot {
  display: none;
}

.toolbar-container .global-toolbar {
  flex: 1;
  justify-content: space-around;
}

/* the svg icons take the text color: muted on the floating bar, light on hover and for
   the section you're in. their highlight is the bar itself, so only the glyph changes */
.global-toolbar .icon {
  color: var(--chrome-muted-color);
  --icon-paper-color: var(--chrome-color);
}

.global-toolbar .icon:hover,
.nav-item-active .icon {
  color: var(--chrome-ink-color);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: var(--gutter-space-half);
  padding-left: var(--gutter-space);
  border-left: 1px solid rgb(255 255 255 / 18%);
}

/* search: just the glass on mobile, a small field-shaped button on desktop */
.search-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--gutter-space-half);
  height: 2.5rem;
  min-width: 2.5rem;
  padding: 0 var(--gutter-space-half);
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: none;
  color: var(--chrome-muted-color);
  font: inherit;
  cursor: pointer;
}

.search-button:hover {
  color: var(--chrome-ink-color);
  background-color: rgb(255 255 255 / 8%);
}

.search-button-glass {
  width: 1.375rem;
  cursor: inherit;
}

/* on mobile the label still names the button, it just isn't drawn */
.search-button-label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.search-button-key {
  display: none;
}

.search-button-key {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  line-height: 1;
  padding: 0.25em 0.4em;
  border-radius: 0.3em;
  border: 1px solid rgb(255 255 255 / 16%);
  background-color: rgb(255 255 255 / 4%);
}

/* the account menu's button is the mogul's initials, with the dropdown's caret beside */
.account :deep(.dropdown-trigger) {
  display: flex;
  align-items: center;
  gap: var(--gutter-space-third);
  padding: 0.2rem;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--chrome-muted-color);
  font: inherit;
  cursor: pointer;
}

.account :deep(.dropdown-trigger:hover),
.account :deep(.dropdown-trigger[aria-expanded='true']) {
  color: var(--chrome-ink-color);
  background-color: rgb(255 255 255 / 8%);
}

.account :deep(.dropdown-caret) {
  margin: 0 var(--gutter-space-third) 0 0;
  font-size: var(--font-size-xs);
}

.avatar {
  display: grid;
  place-items: center;
  width: 2.125rem;
  height: 2.125rem;
  border-radius: 50%;
  background-color: var(--chrome-hover-color);
  color: var(--chrome-ink-color);
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 0 0 1px rgb(255 255 255 / 16%);
}

/* what drops down: who you are, then the sections that aren't in the bar */
.account-who {
  display: flex;
  flex-direction: column;
  min-width: 14rem;
  padding: var(--gutter-space-half);
  margin-bottom: var(--gutter-space-third);
  border-bottom: 1px solid var(--rule-color);
}

.account-name {
  font-weight: 600;
}

.account-email {
  font-size: var(--font-size-sm);
  color: var(--muted-color);
}

.account-links {
  list-style: none;
  margin: 0;
  padding: 0;
}

.account-link {
  display: flex;
  align-items: center;
  gap: var(--gutter-space-half);
  padding: var(--gutter-space-half);
  border-radius: var(--radius);
  color: var(--ink-color);
  text-decoration: none;
}

.account-link:hover {
  background-color: var(--hover-tint);
  text-decoration: none;
}

.account-link-icon {
  width: 1.125rem;
  color: var(--muted-color);
  cursor: inherit;
}

.page-content-buffer {
  grid-area: buffer;
  height: calc(var(--global-toolbar-height) + var(--gutter-space) * 3);
}

/* Desktop overrides */
@container app (min-width: 900px) {
  .toolbar-container {
    --focus-color: var(--accent-color);
    color: var(--ink-color);
    background-color: transparent;
    position: static;
    padding: 0;
    border-radius: 0;
    z-index: auto;
    /* the room a section name's tab drops into, between the bar and the page */
    margin-bottom: calc(1.5 * var(--gutter-space));
  }

  /* wordmark, icons, and search and the account share a full-width black bar; equal 1fr
     sides keep the icons centered on the page however wide either side is. it's raised
     over the page (whose fields base.css lifts to 20), since the section names' tabs and
     the account menu drop out of it and over the page */
  .toolbar-container .top-bar {
    display: grid;
    grid-template-areas: 'brand global-toolbar actions';
    grid-template-columns: 1fr auto 1fr;
    gap: 0;
    padding: 0 calc(2 * var(--gutter-space));
    background-color: var(--topbar-color);
    color: var(--chrome-ink-color);
    position: relative;
    z-index: 25;
  }

  .toolbar-container .brand-slot {
    display: block;
    grid-area: brand;
    justify-self: start;
  }

  .toolbar-container .global-toolbar {
    grid-area: global-toolbar;
    margin: var(--gutter-space) 0;
  }

  /* light glyphs on the bar, its own color as their highlight; the brand hue on hover */
  .global-toolbar .icon,
  .nav-item-active .icon {
    color: var(--chrome-ink-color);
    --icon-paper-color: var(--topbar-color);
  }

  .global-toolbar .icon:hover {
    color: var(--brand-color);
  }

  /* where you are: a short rule in the brand color under the section's icon */
  .nav-item-active::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: calc(-0.6 * var(--gutter-space));
    width: 1.25rem;
    height: 3px;
    translate: -50% 0;
    border-radius: 2px;
    background-color: var(--brand-color);
  }

  .toolbar-actions {
    grid-area: actions;
    justify-self: end;
    padding-left: 0;
    border-left: 0;
  }

  .search-button {
    justify-content: flex-start;
    height: 2.25rem;
    min-width: 13rem;
    padding: 0 var(--gutter-space-third) 0 var(--gutter-space-half);
    border-color: rgb(255 255 255 / 14%);
    background-color: rgb(255 255 255 / 4%);
    font-size: var(--font-size-sm);
  }

  .search-button:hover {
    border-color: rgb(255 255 255 / 28%);
  }

  .search-button-glass {
    width: 1rem;
  }

  .search-button-label {
    position: static;
    width: auto;
    height: auto;
    overflow: visible;
    clip-path: none;
    flex: 1;
    text-align: left;
  }

  .search-button-key {
    display: block;
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
    /* shown and hidden instantly: a wipe reveals the square top first, so the tab reads
       as a plain rectangle until the rounded corners arrive */
    visibility: hidden;
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
    visibility: visible;
  }

  /* the buffer only clears the floating mobile toolbar; on desktop the toolbar is in
     normal flow, and the buffer would be dead height that scrolls past empty space */
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
  <div v-if="me" class="app-wrapper">
    <NotificationBoxComponent ref="notifications" />
    <a class="skip-link" href="#main-content" @click.prevent="focusMain">{{
      t('app.skip-to-content')
    }}</a>
    <div class="frame">
      <div class="page">
        <header class="toolbar-container">
          <div class="top-bar">
            <div class="brand-slot"><BrandMark /></div>
            <nav class="global-toolbar" :aria-label="t('app.menu.label')">
              <div
                v-for="item in mainSections"
                :key="item.key"
                :class="['nav-item', { 'nav-item-active': activeSection === item.key }]"
              >
                <Icon
                  highlight="hover"
                  :alt="t(item.label)"
                  :aria-current="activeSection === item.key ? 'page' : undefined"
                  @click.prevent="router.push(item.to())"
                  :icon-hover="item.icon"
                  :icon="item.icon"
                />
                <!-- the icon already carries the name for a screen reader -->
                <span class="nav-label" aria-hidden="true"
                  ><span class="nav-label-text">{{ t(item.label) }}</span></span
                >
              </div>
            </nav>
            <div class="toolbar-actions">
              <button
                type="button"
                class="search-button"
                :aria-keyshortcuts="shortcutKeys"
                :title="t('search.shortcut', { keys: shortcut })"
                @click="palette?.open()"
              >
                <Icon
                  :icon="searchIconAsset"
                  :icon-hover="searchIconAsset"
                  alt=""
                  class="search-button-glass"
                />
                <span class="search-button-label">{{ t('search.open') }}</span>
                <kbd class="search-button-key" aria-hidden="true">{{ shortcut }}</kbd>
              </button>
              <Dropdown
                v-model:open="accountOpen"
                class="account"
                plain
                align="end"
                :direction="narrow ? 'up' : 'down'"
              >
                <!-- the initials are all that shows, so the name a screen reader or a voice
                     command uses is spelled out beside them -->
                <template #trigger
                  ><span class="avatar" aria-hidden="true">{{ initials }}</span
                  ><span class="visually-hidden">{{
                    t('account.label', { name: fullName })
                  }}</span></template
                >
                <div class="account-who">
                  <span class="account-name">{{ fullName }}</span>
                  <span class="account-email">{{ me.email }}</span>
                </div>
                <ul class="account-links">
                  <li v-for="item in otherSections" :key="item.key">
                    <router-link :to="item.to()" class="account-link" @click="accountOpen = false">
                      <Icon
                        :icon="item.icon"
                        :icon-hover="item.icon"
                        alt=""
                        class="account-link-icon"
                      />
                      {{ t(item.label) }}
                    </router-link>
                  </li>
                </ul>
              </Dropdown>
            </div>
          </div>
        </header>
        <SearchPalette ref="palette" />

        <!-- Tab Bar with Provider/Inject Pattern
        -->
        <TabBar>
          <template #header><BrandMark /></template>
          <!-- Main content tab. main wraps the tab panel rather than sitting in it: the
               panel is named by its tab, and a named panel outside every landmark is
               content no landmark holds -->
          <main id="main-content" ref="main" class="view">
            <Tab :label="t('app.tabs.main')">
              <router-view :key="route.fullPath"></router-view>
            </Tab>
          </main>

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
