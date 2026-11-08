import type { AyrsharePublicationComposition } from '@/services'

// how long a post each platform takes. the labels and the formatted limits shown to the
// user live in the i18n messages in main.ts, which read these numbers.
export const AYRSHARE_PLATFORM_LIMITS: Record<string, number> = {
  gmb: 1500,
  facebook: 63206,
  linkedin: 3000,
  instagram: 2200,
  telegram: 4096,
  snapchat: 80,
  pinterest: 500,
  threads: 25000,
  youtube: 5000,
  reddit: 40000,
  bluesky: 300,
  tiktok: 2200,
  twitter: 280
}

/**
 * what the user has written for an Ayrshare post: one shared text, the platforms it goes
 * to, and the platforms that get their own text instead. a platform has its own text
 * exactly when it has a key in `overrides`, even if that text happens to match the shared.
 */
export interface AyrshareDraft {
  shared: string
  selected: ReadonlyArray<string>
  overrides: Readonly<Record<string, string>>
}

// Object.keys rather than hasOwnProperty: a Vue reactive object tracks the one (its keys
// changing re-renders whatever asked) and not the other
export function isCustomized(draft: AyrshareDraft, platform: string): boolean {
  return Object.keys(draft.overrides).includes(platform)
}

export function effectiveText(draft: AyrshareDraft, platform: string): string {
  return isCustomized(draft, platform) ? draft.overrides[platform] : draft.shared
}

export function charactersOver(draft: AyrshareDraft, platform: string): number {
  const max = AYRSHARE_PLATFORM_LIMITS[platform]
  if (!max) return 0
  return Math.max(0, effectiveText(draft, platform).length - max)
}

export function isBlank(draft: AyrshareDraft, platform: string): boolean {
  return effectiveText(draft, platform).trim().length === 0
}

// the api turns down an empty post, so every selected platform needs some text
export function isPublishable(draft: AyrshareDraft): boolean {
  return draft.selected.length > 0 && draft.selected.every((p) => !isBlank(draft, p))
}

/**
 * the context the Ayrshare publisher plugins read: each selected platform's text under its
 * code, and the id of its draft composition (whose attachments go out as the post's media)
 * under `{code}CompositionId`. the same shape the panel has always sent, one text box per
 * platform or not.
 */
export function buildClientContext(
  draft: AyrshareDraft,
  compositions: ReadonlyArray<AyrsharePublicationComposition>
): Record<string, any> {
  const context: Record<string, any> = {}
  compositions.forEach((c) => {
    if (draft.selected.includes(c.platform)) {
      context[c.platform] = effectiveText(draft, c.platform)
      context[c.platform + 'CompositionId'] = c.composition.id
    }
  })
  return context
}

/**
 * the badge that stands for a platform: its initials on its own color. letters rather than
 * logos, so there's no artwork to license or keep current, and every platform gets one.
 * `ink` is the letters' color, dark on the one platform whose color is too light for white.
 * every pairing clears 4.5:1, so some colors sit a shade darker than the platform's own.
 */
export interface AyrsharePlatformBadge {
  initials: string
  color: string
  ink: string
}

const WHITE = '#ffffff'

export const AYRSHARE_PLATFORM_BADGES: Record<string, AyrsharePlatformBadge> = {
  gmb: { initials: 'G', color: '#1e7e34', ink: WHITE },
  facebook: { initials: 'f', color: '#1565d8', ink: WHITE },
  linkedin: { initials: 'in', color: '#0a66c2', ink: WHITE },
  instagram: { initials: 'Ig', color: '#c13584', ink: WHITE },
  telegram: { initials: 'Tg', color: '#1873a8', ink: WHITE },
  snapchat: { initials: 'Sc', color: '#fffc00', ink: '#0a0f1a' },
  pinterest: { initials: 'P', color: '#c8001e', ink: WHITE },
  threads: { initials: 'Th', color: '#262626', ink: WHITE },
  youtube: { initials: 'YT', color: '#cc0000', ink: WHITE },
  reddit: { initials: 'R', color: '#d93a00', ink: WHITE },
  bluesky: { initials: 'Bs', color: '#0a6fd8', ink: WHITE },
  tiktok: { initials: 'Tk', color: '#111111', ink: WHITE },
  twitter: { initials: 'X', color: '#000000', ink: WHITE }
}
