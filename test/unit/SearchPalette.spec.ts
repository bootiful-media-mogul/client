import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import axe from 'axe-core'
import { defineComponent, h } from 'vue'

// the palette asks the services module for live results; nothing else from it is needed
const searchMock = vi.fn()
vi.mock('@/services', () => ({ search: { search: (q: string) => searchMock(q) } }))

import SearchPalette from '../../src/search/SearchPalette.vue'

// jsdom's <dialog> doesn't do the modal part, and jsdom doesn't scroll; these do what the
// palette relies on
beforeAll(() => {
  Element.prototype.scrollIntoView = function () {}
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: {
    en: {
      'app.menu.home': 'Home',
      'app.menu.podcasts': 'Podcasts',
      'app.menu.blogs': 'Blogs',
      'app.menu.settings': 'Settings',
      'app.menu.jobs': 'Jobs',
      search: {
        palette: {
          label: 'Search',
          placeholder: 'Search…',
          everything: 'Search everything for “{term}”',
          'go-to': 'Go to',
          results: 'Results',
          searching: 'Searching…',
          nothing: 'Nothing found for “{term}”',
          types: { episode: 'Episode', post: 'Post' }
        }
      }
    }
  }
})

const blank = defineComponent({ render: () => h('div') })

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      '/',
      '/podcasts',
      '/blogs',
      '/settings',
      '/jobs',
      '/search',
      '/entities/:type/:id'
    ].map((path) => ({
      path,
      name: { '/': 'home', '/entities/:type/:id': 'entity' }[path] ?? path.slice(1).split('/')[0],
      component: blank
    }))
  })
}

let router: Router
let wrapper: VueWrapper

async function mountPalette() {
  router = makeRouter()
  await router.push('/')
  await router.isReady()
  wrapper = mount(SearchPalette, {
    global: { plugins: [i18n, router] },
    attachTo: document.body.appendChild(document.createElement('div'))
  })
  return wrapper
}

const dialog = () => wrapper.find('dialog').element as HTMLDialogElement
const field = () => wrapper.find('input')
const optionLabels = () => wrapper.findAll('[role=option]').map((o) => o.text())
const selected = () => wrapper.find('[role=option][aria-selected=true]')

async function pressOnDocument(
  key: string,
  init: KeyboardEventInit = {},
  target: EventTarget = document.body
) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  await flushPromises()
  return event
}

async function type(text: string) {
  await field().setValue(text)
  await flushPromises()
}

beforeEach(() => {
  searchMock.mockReset()
  searchMock.mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
  wrapper?.unmount()
  document.body.innerHTML = ''
})

describe('SearchPalette', () => {
  it('opens on ⌘K or Ctrl+K, and the same keys close it', async () => {
    await mountPalette()
    expect(dialog().open).toBe(false)

    const event = await pressOnDocument('k', { metaKey: true })
    expect(event.defaultPrevented).toBe(true)
    expect(dialog().open).toBe(true)
    expect(document.activeElement).toBe(field().element)

    await pressOnDocument('k', { ctrlKey: true })
    expect(dialog().open).toBe(false)
  })

  it('opens on /, but not while you are typing in a field', async () => {
    await mountPalette()
    const elsewhere = document.body.appendChild(document.createElement('textarea'))
    await pressOnDocument('/', {}, elsewhere)
    expect(dialog().open).toBe(false)

    await pressOnDocument('/')
    expect(dialog().open).toBe(true)
  })

  it('offers every section before anything is typed', async () => {
    await mountPalette()
    ;(wrapper.vm as unknown as { open: () => void }).open()
    await flushPromises()
    expect(optionLabels()).toEqual(['Home', 'Podcasts', 'Blogs', 'Settings', 'Jobs'])
    expect(selected().text()).toBe('Home')
  })

  it('puts searching everything first, so enter does what the old search box did', async () => {
    await mountPalette()
    await pressOnDocument('k', { metaKey: true })
    await type('set')
    expect(optionLabels()).toEqual(['Search everything for “set”', 'Settings'])

    await field().trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('search')
    expect(router.currentRoute.value.query.query).toBe('set')
    expect(dialog().open).toBe(false)
  })

  it('walks the options with the arrow keys and opens the chosen one', async () => {
    await mountPalette()
    await pressOnDocument('k', { metaKey: true })
    await type('jobs')
    await field().trigger('keydown', { key: 'ArrowDown' })
    expect(selected().text()).toBe('Jobs')
    expect(field().attributes('aria-activedescendant')).toBe(selected().attributes('id'))

    // and wraps around at either end
    await field().trigger('keydown', { key: 'ArrowDown' })
    expect(selected().text()).toContain('Search everything')
    await field().trigger('keydown', { key: 'ArrowUp' })
    expect(selected().text()).toBe('Jobs')

    await field().trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('jobs')
  })

  it('shows live results after a pause in the typing, and opens what they found', async () => {
    vi.useFakeTimers()
    searchMock.mockResolvedValue([
      {
        searchableId: 7,
        title: 'Spring Boot 4',
        type: 'episode',
        contextMap: new Map([
          ['id', 42],
          ['type', 'episode']
        ])
      }
    ])
    await mountPalette()
    await pressOnDocument('k', { metaKey: true })
    await type('spr')
    await type('spring')
    expect(searchMock).not.toHaveBeenCalled()
    expect(wrapper.find('[role=status]').text()).toBe('Searching…')

    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    expect(searchMock).toHaveBeenCalledTimes(1)
    expect(searchMock).toHaveBeenCalledWith('spring')
    expect(optionLabels()).toContain('Spring Boot 4Episode')

    await wrapper
      .findAll('[role=option]')
      .find((o) => o.text().startsWith('Spring Boot 4'))!
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/entities/episode/42')
  })

  it("ignores an earlier search's answer that arrives after a later one", async () => {
    vi.useFakeTimers()
    let answerFirst: (v: unknown) => void = () => {}
    searchMock
      .mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve)))
      .mockResolvedValueOnce([
        { searchableId: 2, title: 'Newer', type: 'post', contextMap: new Map() }
      ])
    await mountPalette()
    await pressOnDocument('k', { metaKey: true })
    await type('old')
    await vi.advanceTimersByTimeAsync(250)
    await type('new')
    await vi.advanceTimersByTimeAsync(250)
    answerFirst([{ searchableId: 1, title: 'Older', type: 'post', contextMap: new Map() }])
    await flushPromises()
    expect(optionLabels().join()).toContain('Newer')
    expect(optionLabels().join()).not.toContain('Older')
  })

  it('says when nothing was found, and starts fresh each time it opens', async () => {
    vi.useFakeTimers()
    await mountPalette()
    await pressOnDocument('k', { metaKey: true })
    await type('zzz')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    expect(wrapper.find('[role=status]').text()).toBe('Nothing found for “zzz”')

    dialog().close()
    await flushPromises()
    await pressOnDocument('k', { metaKey: true })
    expect((field().element as HTMLInputElement).value).toBe('')
    expect(optionLabels()).toHaveLength(5)
  })

  it('has no accessibility violations while open', async () => {
    await mountPalette()
    await pressOnDocument('k', { metaKey: true })
    await type('set')
    const results = await axe.run(wrapper.element, {
      rules: { 'color-contrast': { enabled: false } }
    })
    expect(results.violations.map((v) => v.id)).toEqual([])
  })
})
