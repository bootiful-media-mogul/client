<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  appliedTheme,
  darkPalettes,
  type DarkPalette,
  setThemePreferences,
  themePreferences,
  type ThemeMode
} from '@/theme'

const { t } = useI18n()

const modes: ThemeMode[] = ['auto', 'light', 'dark']
const hours = Array.from({ length: 24 }, (_, hour) => hour)

// a locale-formatted hour ("7 PM", "19:00"), so the picker reads like the user's clock
function hourLabel(hour: number): string {
  return new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: 'numeric' })
}

const preferences = themePreferences
const showing = computed(() => t('settings.appearance.palettes.' + appliedTheme.value))

function pickPalette(palette: DarkPalette) {
  setThemePreferences({ dark: palette })
}
</script>

<template>
  <form class="pure-form pure-form-stacked appearance" @submit.prevent>
    <fieldset>
      <legend>{{ t('settings.appearance.title') }}</legend>

      <div class="pure-control-group">
        <!-- eslint-disable-next-line vuejs-accessibility/label-has-for -- names the group below, not one control -->
        <label id="appearance-mode-label">{{ t('settings.appearance.mode') }}</label>
        <div class="modes" role="radiogroup" aria-labelledby="appearance-mode-label">
          <label v-for="mode in modes" :key="mode" class="pure-radio">
            <input
              type="radio"
              name="theme-mode"
              :value="mode"
              :checked="preferences.mode === mode"
              @change="setThemePreferences({ mode })"
            />
            {{ t('settings.appearance.modes.' + mode) }}
          </label>
        </div>
        <span class="pure-form-message">{{
          t('settings.appearance.showing', { theme: showing })
        }}</span>
      </div>

      <div v-if="preferences.mode === 'auto'" class="pure-control-group auto">
        <label class="pure-checkbox">
          <input
            type="checkbox"
            :checked="preferences.followSystem"
            @change="
              setThemePreferences({ followSystem: ($event.target as HTMLInputElement).checked })
            "
          />
          {{ t('settings.appearance.follow-system') }}
        </label>
        <div class="window">
          <span>{{ t('settings.appearance.evening-from') }}</span>
          <select
            :aria-label="t('settings.appearance.evening-start')"
            :value="preferences.evening"
            @change="
              setThemePreferences({ evening: Number(($event.target as HTMLSelectElement).value) })
            "
          >
            <option v-for="hour in hours" :key="hour" :value="hour">{{ hourLabel(hour) }}</option>
          </select>
          <span>{{ t('settings.appearance.evening-until') }}</span>
          <select
            :aria-label="t('settings.appearance.evening-end')"
            :value="preferences.morning"
            @change="
              setThemePreferences({ morning: Number(($event.target as HTMLSelectElement).value) })
            "
          >
            <option v-for="hour in hours" :key="hour" :value="hour">{{ hourLabel(hour) }}</option>
          </select>
        </div>
      </div>

      <div v-if="preferences.mode !== 'light'" class="pure-control-group">
        <!-- eslint-disable-next-line vuejs-accessibility/label-has-for -- names the group below, not one control -->
        <label id="appearance-palette-label">{{ t('settings.appearance.dark-palette') }}</label>
        <div class="palettes" role="group" aria-labelledby="appearance-palette-label">
          <button
            v-for="palette in darkPalettes"
            :key="palette"
            type="button"
            class="palette"
            :class="{ 'palette-selected': preferences.dark === palette }"
            :data-theme="palette"
            :aria-pressed="preferences.dark === palette"
            @click="pickPalette(palette)"
          >
            <!-- a miniature studio drawn in the palette's own tokens -->
            <span class="mini-topbar">
              <span class="mini-brand">mogul</span><span class="mini-product">studio</span>
            </span>
            <span class="mini-page">
              <span class="mini-panel">
                <span class="mini-legend">{{ t('settings.appearance.palettes.' + palette) }}</span>
                <span class="mini-line"></span>
                <span class="mini-line short"></span>
                <span class="mini-field"></span>
                <span class="mini-button"></span>
              </span>
            </span>
            <span class="palette-blurb">{{ t('settings.appearance.blurbs.' + palette) }}</span>
          </button>
        </div>
      </div>
    </fieldset>
  </form>
</template>

<style scoped>
.modes {
  display: flex;
  gap: var(--gutter-space);
  flex-wrap: wrap;
}

.window {
  display: flex;
  align-items: center;
  gap: var(--gutter-space-half);
  flex-wrap: wrap;
}

.window select {
  width: auto;
}

.palettes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: var(--gutter-space);
}

/* each card names its palette with data-theme, so everything inside reads that palette's
   tokens: the cards are previews, not pictures of them */
.palette {
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-color);
  color: var(--ink-color);
  outline: 2px solid transparent;
  outline-offset: 2px;
  font-size: var(--font-size-sm);
}

.palette:focus-visible,
.palette-selected {
  outline-color: var(--accent-color);
}

.mini-topbar {
  background: var(--topbar-color);
  color: var(--chrome-ink-color);
  padding: 0.35rem 0.6rem;
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.04em;
}

.mini-product {
  color: var(--brand-color);
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-left: 0.3rem;
}

.mini-page {
  padding: 0.6rem;
}

.mini-panel {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background: var(--panel-bg-color);
  border-radius: var(--radius);
  padding-bottom: 0.5rem;
  overflow: hidden;
}

.mini-legend {
  background: var(--chrome-color);
  color: var(--chrome-ink-color);
  font-family: var(--font-display);
  padding: 0.2rem 0.5rem;
}

.mini-line {
  height: 0.35rem;
  margin: 0 0.5rem;
  border-radius: 1rem;
  background: var(--ink-color);
  opacity: 0.75;
}

.mini-line.short {
  width: 55%;
  background: var(--muted-color);
}

.mini-field {
  height: 0.9rem;
  margin: 0 0.5rem;
  border-radius: 0.25rem;
  background: var(--field-bg-color);
  border: 1px solid var(--accent-color);
}

.mini-button {
  width: 3rem;
  height: 0.9rem;
  margin: 0 0.5rem;
  border-radius: 0.25rem;
  background: var(--chrome-color);
}

.palette-blurb {
  padding: 0 0.6rem 0.6rem;
  color: var(--muted-color);
  line-height: 1.35;
}
</style>
