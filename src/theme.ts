import { readonly, ref } from 'vue'

// the studio's appearance. the day palette is the original sky-blue one; the dark
// palettes are overrides of the same tokens in base.css, selected by a data-theme
// attribute on <html>. a component never knows which palette it is drawn in.
//
// the choice is per-browser (localStorage), not per-mogul: the right answer depends on
// the room and the screen you are sitting at, not on who you are.
//
// index.html carries a copy of resolveTheme() as an inline script, so the first paint
// is already in the right palette. keep the two in step.

export type ThemeMode = 'auto' | 'light' | 'dark'
export type DarkPalette = 'midnight' | 'graphite' | 'ember'
export type AppliedTheme = 'light' | DarkPalette

export interface ThemePreferences {
  mode: ThemeMode
  dark: DarkPalette
  // in auto mode, the hours (local, 0-23) between which the studio goes dark even if the
  // OS is still light. evening may be later than morning; the window wraps midnight
  evening: number
  morning: number
  // in auto mode, also go dark whenever the OS is dark
  followSystem: boolean
}

export const darkPalettes: readonly DarkPalette[] = ['midnight', 'graphite', 'ember']

export const defaultThemePreferences: ThemePreferences = {
  mode: 'auto',
  dark: 'midnight',
  evening: 19,
  morning: 7,
  followSystem: true
}

const storageKey = 'mogul.theme'

export function isEvening(hour: number, evening: number, morning: number): boolean {
  if (evening === morning) return false
  return evening < morning ? hour >= evening && hour < morning : hour >= evening || hour < morning
}

export function resolveTheme(
  preferences: ThemePreferences,
  now: Date,
  systemDark: boolean
): AppliedTheme {
  const dark =
    preferences.mode === 'dark' ||
    (preferences.mode === 'auto' &&
      ((preferences.followSystem && systemDark) ||
        isEvening(now.getHours(), preferences.evening, preferences.morning)))
  return dark ? preferences.dark : 'light'
}

function validHour(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 24
    ? value
    : fallback
}

export function parsePreferences(raw: string | null): ThemePreferences {
  const d = defaultThemePreferences
  if (!raw) return { ...d }
  try {
    const p = JSON.parse(raw) ?? {}
    return {
      mode: ['auto', 'light', 'dark'].includes(p.mode) ? p.mode : d.mode,
      dark: darkPalettes.includes(p.dark) ? p.dark : d.dark,
      evening: validHour(p.evening, d.evening),
      morning: validHour(p.morning, d.morning),
      followSystem: typeof p.followSystem === 'boolean' ? p.followSystem : d.followSystem
    }
  } catch {
    return { ...d }
  }
}

function loadPreferences(): ThemePreferences {
  try {
    return parsePreferences(localStorage.getItem(storageKey))
  } catch {
    return { ...defaultThemePreferences }
  }
}

const systemDarkQuery =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

const preferencesRef = ref<ThemePreferences>(loadPreferences())
const appliedRef = ref<AppliedTheme>('light')

function apply() {
  const theme = resolveTheme(preferencesRef.value, new Date(), !!systemDarkQuery?.matches)
  const root = document.documentElement
  if (root.dataset.theme !== theme) root.dataset.theme = theme
  appliedRef.value = theme
}

// the palette that is showing right now; watch it to repaint anything drawn outside css
// (a canvas, say)
export const appliedTheme = readonly(appliedRef)
export const themePreferences = readonly(preferencesRef)

export function setThemePreferences(changes: Partial<ThemePreferences>) {
  preferencesRef.value = parsePreferences(JSON.stringify({ ...preferencesRef.value, ...changes }))
  try {
    localStorage.setItem(storageKey, JSON.stringify(preferencesRef.value))
  } catch {
    // private mode or storage full: the choice still holds for this tab
  }
  apply()
}

let started = false

// applies the theme and keeps it current: when the OS flips, when the clock crosses the
// evening or morning hour, when a laptop wakes, and when another tab changes the choice
export function startTheme() {
  if (started) return
  started = true
  apply()
  systemDarkQuery?.addEventListener('change', apply)
  // a minute's resolution is plenty for a dusk switch, and timers are throttled anyway
  // in a background tab; visibilitychange catches the tab (or laptop) coming back
  window.setInterval(apply, 60_000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') apply()
  })
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey) {
      preferencesRef.value = parsePreferences(event.newValue)
      apply()
    }
  })
}
