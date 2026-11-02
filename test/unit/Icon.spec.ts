import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Icon from '../../src/ui/Icon.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en: { 'icon.alt.default': 'icon' } }
})

// a knocked-out disc, like the round action icons: the mask is found by id
const disc = `<svg viewBox="0 0 24 24"><mask id="glyph"><rect width="24" height="24" fill="#fff"/></mask><circle r="11" mask="url(#glyph)"/></svg>`

function mountIcon(props: Record<string, unknown>) {
  return mount(Icon, { props, global: { plugins: [i18n] } })
}

describe('Icon', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('inlines an svg, giving each copy its own ids', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(disc))
    )
    const first = mountIcon({ icon: '/disc.svg', iconHover: '/disc.svg', alt: 'a disc' })
    const second = mountIcon({ icon: '/disc.svg', iconHover: '/disc.svg', alt: 'a disc' })
    await flushPromises()

    const ids = [first, second].map((icon) => {
      const id = icon.find('mask').attributes('id')
      expect(icon.find('circle').attributes('mask')).toBe(`url(#${id})`)
      return id
    })
    expect(ids[0]).not.toBe(ids[1])
    expect(first.element.tagName).toBe('SPAN')
    expect(first.attributes('aria-label')).toBe('a disc')
  })

  it('names when the white highlight shows', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(disc))
    )
    const rest = mountIcon({ icon: '/disc.svg', iconHover: '/disc.svg', highlight: 'rest' })
    const plain = mountIcon({ icon: '/disc.svg', iconHover: '/disc.svg' })
    const disabled = mountIcon({
      icon: '/disc.svg',
      iconHover: '/disc.svg',
      highlight: 'hover',
      disabled: true
    })
    await flushPromises()

    expect(rest.classes()).toContain('icon-paper-rest')
    expect(plain.classes().filter((c) => c.startsWith('icon-paper'))).toEqual([])
    expect(disabled.classes()).toContain('icon-disabled')
    expect(disabled.classes().filter((c) => c.startsWith('icon-paper'))).toEqual([])
  })

  it('still shows a png as an img', async () => {
    const icon = mountIcon({ icon: '/brand.png', iconHover: '/brand.png', alt: 'brand' })
    await flushPromises()
    expect(icon.element.tagName).toBe('IMG')
    expect(icon.attributes('alt')).toBe('brand')
  })
})
