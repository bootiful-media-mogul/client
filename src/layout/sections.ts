import type { RouteLocationRaw } from 'vue-router'

import homeIconAsset from '@/assets/images/icons/home.svg'
import podcastIconAsset from '@/assets/images/icons/podcast.svg'
import blogIconAsset from '@/assets/images/icons/rss.svg'
import settingsIconAsset from '@/assets/images/icons/settings.svg'
import jobsIconAsset from '@/assets/images/icons/jobs.svg'

// the places the studio's chrome can take you. the main ones are the big icons in the top
// bar; the rest live in the account menu. the search palette offers all of them.
export interface Section {
  readonly key: string
  // an i18n key
  readonly label: string
  readonly icon: string
  readonly main: boolean
  // a function, so podcasts gets a fresh cache buster each time it's followed
  readonly to: () => RouteLocationRaw
}

export const sections: readonly Section[] = [
  {
    key: 'home',
    label: 'app.menu.home',
    icon: homeIconAsset,
    main: true,
    to: () => ({ name: 'home' })
  },
  {
    key: 'podcasts',
    label: 'app.menu.podcasts',
    icon: podcastIconAsset,
    main: true,
    // the query makes it a new route even from /podcasts, so the list reloads
    to: () => ({ path: '/podcasts', query: { when: Date.now() } })
  },
  {
    key: 'blogs',
    label: 'app.menu.blogs',
    icon: blogIconAsset,
    main: true,
    to: () => ({ name: 'blogs' })
  },
  {
    key: 'settings',
    label: 'app.menu.settings',
    icon: settingsIconAsset,
    main: false,
    to: () => ({ name: 'settings' })
  },
  {
    key: 'jobs',
    label: 'app.menu.jobs',
    icon: jobsIconAsset,
    main: false,
    to: () => ({ name: 'jobs' })
  }
]

export const mainSections = sections.filter((s) => s.main)
export const otherSections = sections.filter((s) => !s.main)

// which main section a path belongs to, for the marker under its icon
export function mainSectionFor(path: string): string | null {
  if (path === '/') return 'home'
  if (path === '/podcasts' || path.startsWith('/podcasts/')) return 'podcasts'
  if (path === '/blogs' || path.startsWith('/blogs/')) return 'blogs'
  return null
}
