import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { describe, expect, it, vi } from 'vitest'
import {
  type AyrshareDraft,
  buildClientContext,
  charactersOver,
  effectiveText,
  isPublishable
} from '../../src/publications/ayrshare'
import InputWrapperChild from '../../src/ui/input/InputWrapperChild.vue'

const compositions = ['bluesky', 'linkedin', 'twitter'].map((platform, i) => ({
  platform,
  composition: {
    id: 100 + i,
    field: platform,
    attachments: platform === 'twitter' ? [{ id: 1 }] : []
  }
}))

// the panel's only conversations with the api are reading the drafts' compositions and
// subscribing to notifications; the rest is the real thing
vi.mock('@/services', () => ({
  ayrshare: { publicationCompositions: vi.fn(async () => compositions) },
  notifications: { listenForCategory: () => () => {} }
}))

const AyrshareComponent = (await import('../../src/publications/AyrshareComponent.vue')).default

describe('the Ayrshare draft', () => {
  const draft = (d: Partial<AyrshareDraft>): AyrshareDraft => ({
    shared: 'hello world',
    selected: ['bluesky', 'twitter'],
    overrides: {},
    ...d
  })

  it('gives every platform the shared text unless it has text of its own', () => {
    const d = draft({ overrides: { twitter: 'short' } })
    expect(effectiveText(d, 'bluesky')).toBe('hello world')
    expect(effectiveText(d, 'twitter')).toBe('short')
  })

  it('treats an override that matches the shared text as text of its own', () => {
    const d = draft({ shared: 'changed', overrides: { twitter: 'hello world' } })
    expect(effectiveText(d, 'twitter')).toBe('hello world')
  })

  it('sends the same shape the panel always has, for the selected platforms only', () => {
    const d = draft({ overrides: { twitter: 'short', linkedin: 'unsent' } })
    expect(buildClientContext(d, compositions)).toEqual({
      bluesky: 'hello world',
      blueskyCompositionId: 100,
      twitter: 'short',
      twitterCompositionId: 102
    })
  })

  it('counts how far past its limit a platform is', () => {
    const d = draft({ shared: 'x'.repeat(290) })
    expect(charactersOver(d, 'twitter')).toBe(10)
    expect(charactersOver(d, 'bluesky')).toBe(0)
  })

  it('is publishable once a platform is picked and none of them is empty', () => {
    expect(isPublishable(draft({ selected: [] }))).toBe(false)
    expect(isPublishable(draft({ shared: '  ' }))).toBe(false)
    expect(isPublishable(draft({ shared: '', overrides: { bluesky: 'a', twitter: 'b' } }))).toBe(
      true
    )
    expect(isPublishable(draft({ overrides: { twitter: '' } }))).toBe(false)
  })
})

const platforms = Object.fromEntries(
  compositions.map((c) => [c.platform, { label: c.platform + ' label', shortLabel: c.platform }])
)

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      components: {
        inputWrapper: {
          empty: '(empty)',
          'character-count': '{count} chars',
          'previous-tool': 'previous',
          'next-tool': 'next'
        }
      },
      inputWrapperMenu: { 'default-content': 'Tools' },
      icons: { close: 'close' },
      publications: {
        plugins: {
          testAyrshare: {
            platforms,
            composer: {
              list: 'Where the post goes',
              platforms: 'Post to',
              choose: 'choose',
              change: 'change',
              shared: 'Everywhere',
              sharedStatus: 'For {n} platform | For {n} platforms',
              sharedLabel: 'Text for every selected platform',
              platformLabel: 'Text for {platform}',
              usedBy: 'Goes to {platforms}.',
              usedByNone: 'none',
              pickPlatforms: 'pick',
              media: 'media',
              inherited: 'inherited',
              customized: 'customized',
              useShared: 'Use the text from {shared}',
              limit: '{num} or less',
              limitShort: '{num} max',
              over: '{num} over for {platform}',
              overShort: 'over the limit',
              rowShared: 'From {shared}',
              rowOwn: 'Own text',
              rowOver: '{num} over',
              rowEmpty: 'Empty',
              attachments: '{n} attachment | {n} attachments'
            }
          }
        }
      }
    }
  }
})

// the writing tools and the attachments each register with the input wrapper; these
// stand in for them so the wrapper has its children, without their api calls
const toolStub = defineComponent({
  setup: () => () => h(InputWrapperChild, null, { panel: () => h('div'), icon: () => h('div') })
})

async function mountPanel() {
  let registered: any
  const published: Array<Record<string, any>> = []
  const wrapper = mount(AyrshareComponent, {
    props: { pluginName: 'testAyrshare', icon: 'icon.png' },
    global: {
      plugins: [i18n],
      stubs: { InputTools: toolStub, CompositionComponent: toolStub },
      provide: {
        isPluginReady: async () => true,
        getPublicationContext: () => ({ type: 'Episode', publishableId: 7 }),
        publish: async (_t: string, _id: number, context: Record<string, any>) => {
          published.push(context)
          return 1
        },
        registerPublicationPanel: (child: any) => (registered = child)
      }
    }
  })
  await flushPromises()
  // the panel's contents render wherever the publications section puts them; here, a host
  const host = mount(defineComponent({ setup: () => () => h('div', registered.panel()) }), {
    global: {
      plugins: [i18n],
      stubs: { InputTools: toolStub, CompositionComponent: toolStub }
    }
  })
  return { wrapper, host, registered, published }
}

describe('the Ayrshare composer', () => {
  // the rows: Everywhere first, then a row per platform with its checkbox and its button
  const rowButtons = (host: any) => host.findAll('.row-button')
  const rowFor = (host: any, name: string) =>
    rowButtons(host).find((b: any) => b.find('.name').text() === name)
  const openRow = (host: any) => host.find('.row-button[aria-current=true] .name').text()
  const checkbox = (host: any, platform: string) =>
    host.find(`input[type=checkbox][value=${platform}]`)
  // ticks or unticks a platform in the dropdown, dropping it down first if it's closed
  async function pick(host: any, platform: string, value = true) {
    if (!host.find('.dropdown-panel').exists())
      await host.find('.dropdown-trigger').trigger('click')
    await checkbox(host, platform).setValue(value)
  }

  it('writes once for every platform and lets one platform have its own text', async () => {
    const { host, registered, published } = await mountPanel()
    // nothing picked: just the Everywhere row, and the dropdown closed
    expect(rowButtons(host).map((b: any) => b.find('.name').text())).toEqual(['Everywhere'])
    expect(openRow(host)).toBe('Everywhere')
    expect(registered.action.enabled()).toBe(false)

    expect(host.find('.dropdown-panel').exists()).toBe(false)
    await pick(host, 'bluesky')
    await pick(host, 'twitter')
    expect(rowButtons(host).map((b: any) => b.find('.name').text())).toEqual([
      'Everywhere',
      'bluesky',
      'twitter'
    ])
    // the badges beside the button say what's picked
    expect(
      host.findAll('.picked-badges [role=img]').map((b: any) => b.attributes('aria-label'))
    ).toEqual(['bluesky label', 'twitter label'])
    expect(rowFor(host, 'Everywhere').text()).toContain('For 2 platforms')

    await host.find('textarea').setValue('a'.repeat(285))
    expect(host.text()).toContain('Goes to bluesky, twitter (over the limit).')
    expect(rowFor(host, 'twitter').find('.status').text()).toBe('5 over · 1 attachment')
    expect(rowFor(host, 'bluesky').find('.status').text()).toBe('From Everywhere')
    expect(registered.action.enabled()).toBe(true)

    // the twitter row shows the shared text until it's edited
    await rowFor(host, 'twitter').trigger('click')
    expect(openRow(host)).toBe('twitter')
    const twitterBox = host.find('textarea')
    expect((twitterBox.element as HTMLTextAreaElement).value).toBe('a'.repeat(285))
    expect(twitterBox.classes()).toContain('inherited')
    expect(host.text()).toContain('5 over for twitter')

    await twitterBox.setValue('short one')
    expect(host.find('textarea').classes()).not.toContain('inherited')
    expect(rowFor(host, 'twitter').find('.status').text()).toBe('Own text · 1 attachment')

    await registered.action.publish(null)
    expect(published).toEqual([
      {
        bluesky: 'a'.repeat(285),
        blueskyCompositionId: 100,
        twitter: 'short one',
        twitterCompositionId: 102
      }
    ])
  })

  it('drops the platforms down and puts them away again', async () => {
    const { host } = await mountPanel()
    const button = () => host.find('.dropdown-trigger')
    const popover = () => host.find('.dropdown-panel')
    expect(button().attributes('aria-expanded')).toBe('false')
    expect(button().text()).toContain('choose')

    await button().trigger('click')
    expect(button().attributes('aria-expanded')).toBe('true')
    await checkbox(host, 'linkedin').setValue(true)
    expect(button().text()).toContain('change')

    // escape puts it away, wherever focus happens to be: Safari leaves it where it was
    // when the button is clicked, so the key may not come from inside the picker at all
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(popover().exists()).toBe(false)

    // so does focus moving somewhere outside the picker
    await button().trigger('click')
    await host.find('.dropdown').trigger('focusout', {
      relatedTarget: host.find('textarea').element
    })
    expect(popover().exists()).toBe(false)

    // and a click outside it, but not one inside it
    await button().trigger('click')
    checkbox(host, 'linkedin').element.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()
    expect(popover().exists()).toBe(true)
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()
    expect(popover().exists()).toBe(false)
  })

  it('goes back to the shared text when asked, and back to Everywhere when a platform is dropped', async () => {
    const { host } = await mountPanel()
    await host.find('textarea').setValue('shared words')
    await pick(host, 'linkedin')
    await rowFor(host, 'linkedin').trigger('click')
    expect(openRow(host)).toBe('linkedin')

    await host.find('textarea').setValue('linkedin words')
    await host.find('.composer-status button').trigger('click')
    expect((host.find('textarea').element as HTMLTextAreaElement).value).toBe('shared words')
    expect(host.find('textarea').classes()).toContain('inherited')

    await pick(host, 'linkedin', false)
    expect(openRow(host)).toBe('Everywhere')
    expect(rowFor(host, 'linkedin')).toBeUndefined()
  })

  it('ties the open row to the editor for assistive tech', async () => {
    const { host } = await mountPanel()
    await pick(host, 'bluesky')
    await rowFor(host, 'bluesky').trigger('click')
    const editor = host.find('[role=region]')
    const open = host.find('.row-button[aria-current=true]')
    expect(editor.attributes('aria-labelledby')).toBe(open.attributes('id'))
    expect(open.attributes('aria-controls')).toBe(editor.attributes('id'))
    expect(checkbox(host, 'bluesky').attributes('aria-label')).toBe('bluesky label')
  })

  it('starts over once a post is scheduled, but keeps the text for a post going out now', async () => {
    const { host, registered, published } = await mountPanel()
    await pick(host, 'bluesky')
    await host.find('textarea').setValue('see you next week')

    await registered.action.publish(new Date(Date.now() + 86_400_000))
    await flushPromises()
    expect(published).toHaveLength(1)
    expect((host.find('textarea').element as HTMLTextAreaElement).value).toBe('')
    expect(rowButtons(host).map((b: any) => b.find('.name').text())).toEqual(['Everywhere'])

    // right now, it's held until ayrshare says it went out
    await pick(host, 'bluesky')
    await host.find('textarea').setValue('right now')
    await registered.action.publish(null)
    await flushPromises()
    expect((host.find('textarea').element as HTMLTextAreaElement).value).toBe('right now')
  })
})
