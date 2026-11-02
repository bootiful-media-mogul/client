<style>
.panel-menu {
  background-color: black;
  padding: calc(var(--gutter-space) / 2);
  display: grid;
  grid-template-columns: auto min-content min-content;
}

.panel-menu-subtitle {
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  font-family: 'arial Black', sans-serif;
  color: #777777;
}

.panel {
  background-color: var(--panel-bg-color);
  top: calc(-1 * var(--gutter-space));
  position: relative;
  overflow: hidden;
  margin-bottom: var(--gutter-space);
  box-shadow: var(--box-shadow);
  border-radius: var(--radius);
}

.panel-menu-buttons {
  display: grid;
  grid-auto-flow: column;
  gap: calc(var(--gutter-space) / 3);
  grid-template-columns: repeat(auto-fill, max-content);
  place-items: center;
}

.panel-content {
  padding: var(--gutter-space);
  display: none;
}

.panel-content-visible {
  display: block;
}

.panel-menu-buttons-img {
  filter: invert(100%);
  cursor: pointer;
  width: calc(var(--gutter-space) * 0.7);
  height: calc(var(--gutter-space) * 0.7);
}

.panel-menu-title {
  display: flex;
  align-items: center;
  gap: calc(var(--gutter-space) / 3);
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  color: white;
  font-family: 'arial Black', sans-serif;
}

.panel-menu-title-icon {
  /* the same svg the opening Icon shows, masked so it takes the header's white */
  display: inline-block;
  width: calc(var(--font-size-sm) * 1.4);
  height: calc(var(--font-size-sm) * 1.4);
  background-color: currentColor;
  mask: var(--panel-icon) center / contain no-repeat;
  -webkit-mask: var(--panel-icon) center / contain no-repeat;
}

.panel-maximized {
  position: absolute;
  top: 10%;
  left: 10%;
  right: 10%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  z-index: 100;
  border-radius: var(--radius);
}

@container app (min-width: 900px) {
  .panel {
    border-radius: var(--radius);
    border-bottom-right-radius: 0;
    border-top-right-radius: 0;
  }

  /* Override base.css .sidebar .panel-content rule when hidden - desktop only */
  .sidebar .panel-content:not(.panel-content-visible) {
    display: none !important;
  }
}
</style>

<template>
  <div ref="element" class="panel">
    <div class="panel-menu">
      <div class="panel-menu-title navigable-section">
        <span
          v-if="props.icon"
          :style="{ '--panel-icon': `url(&quot;${props.icon}&quot;)` }"
          aria-hidden="true"
          class="panel-menu-title-icon"
        />
        {{ props.title }}
      </div>
      <div class="panel-menu-buttons">
        <div v-if="!visible" class="open" @click.prevent="toggleVisible">
          <img :src="open" :alt="t('panel.alt.open')" class="panel-menu-buttons-img" />
        </div>
        <div v-else class="close" @click.prevent="toggleVisible">
          <img :src="minimize" :alt="t('panel.alt.minimize')" class="panel-menu-buttons-img" />
        </div>
      </div>
    </div>
    <div :class="{ 'panel-content': true, 'panel-content-visible': visible }">
      <slot />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import minimize from '@/assets/images/panel/simple-panel-collapse.png'
import open from '@/assets/images/panel/simple-panel-maximize.png'
import { events } from '@/services'

const element = ref<HTMLElement>()

// collapsed on arrival: three expanded panels stacked in the sidebar push the page
// long before you've asked for any of them. only desktop is affected -- on mobile
// base.css keeps .sidebar .panel-content displayed regardless of this flag, so a tab
// you tapped into still shows its content.
const visible = ref<boolean>(false)

const props = defineProps<{ title: string; icon?: string }>()

function toggleVisible() {
  visible.value = !visible.value
}

events.on('sidebar-panel-closed', (event: any) => {
  if (element.value!!.contains(event)) {
    visible.value = false
  }
})

events.on('sidebar-panel-opened', (event: any) => {
  console.log('sidebar-panel-opened')
  console.log(element.value ? 'got an element' : 'no element')
  const contains = element.value!!.contains(event)
  if (contains) {
    visible.value = true
  }
})
</script>
