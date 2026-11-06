import { describe, expect, it } from 'vitest'
import {
  defaultThemePreferences,
  isEvening,
  parsePreferences,
  resolveTheme,
  type ThemePreferences
} from '@/theme'

const at = (hour: number) => new Date(2026, 10, 6, hour, 30)
const prefs = (changes: Partial<ThemePreferences> = {}): ThemePreferences => ({
  ...defaultThemePreferences,
  ...changes
})

describe('isEvening', () => {
  it('wraps midnight when evening is later than morning', () => {
    expect(isEvening(18, 19, 7)).toBe(false)
    expect(isEvening(19, 19, 7)).toBe(true)
    expect(isEvening(23, 19, 7)).toBe(true)
    expect(isEvening(0, 19, 7)).toBe(true)
    expect(isEvening(6, 19, 7)).toBe(true)
    expect(isEvening(7, 19, 7)).toBe(false)
  })

  it('handles a window that does not cross midnight', () => {
    expect(isEvening(0, 1, 5)).toBe(false)
    expect(isEvening(1, 1, 5)).toBe(true)
    expect(isEvening(5, 1, 5)).toBe(false)
  })

  it('treats equal hours as no window', () => {
    expect(isEvening(12, 12, 12)).toBe(false)
  })
})

describe('resolveTheme', () => {
  it('is light on a light afternoon in auto mode', () => {
    expect(resolveTheme(prefs(), at(14), false)).toBe('light')
  })

  it('goes dark in the evening even when the OS is light', () => {
    expect(resolveTheme(prefs(), at(21), false)).toBe('midnight')
  })

  it('follows a dark OS in the daytime', () => {
    expect(resolveTheme(prefs(), at(14), true)).toBe('midnight')
    expect(resolveTheme(prefs({ followSystem: false }), at(14), true)).toBe('light')
  })

  it('uses the chosen dark palette', () => {
    expect(resolveTheme(prefs({ dark: 'ember' }), at(22), false)).toBe('ember')
  })

  it('honours the fixed modes regardless of time and OS', () => {
    expect(resolveTheme(prefs({ mode: 'light' }), at(23), true)).toBe('light')
    expect(resolveTheme(prefs({ mode: 'dark', dark: 'graphite' }), at(12), false)).toBe('graphite')
  })
})

describe('parsePreferences', () => {
  it('falls back to the defaults for missing or broken storage', () => {
    expect(parsePreferences(null)).toEqual(defaultThemePreferences)
    expect(parsePreferences('{not json')).toEqual(defaultThemePreferences)
  })

  it('drops values it does not recognize', () => {
    expect(
      parsePreferences(JSON.stringify({ mode: 'sepia', dark: 'neon', evening: 25, morning: 6 }))
    ).toEqual({ ...defaultThemePreferences, morning: 6 })
  })
})
