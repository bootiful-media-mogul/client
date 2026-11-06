import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axe from 'axe-core'
import { h } from 'vue'

// the services module talks to the network as soon as it loads; these components only
// need its event bus and the notification feed
const listeners: Array<(n: unknown) => void> = []
vi.mock('@/services', async () => {
  const mitt = (await import('mitt')).default
  return {
    events: mitt(),
    notifications: { listen: (l: (n: unknown) => void) => listeners.push(l) }
  }
})

vi.mock('vue-router', () => ({ useRoute: () => ({ path: '/' }) }))

import TabBar from '../../src/layout/TabBar.vue'
import Tab from '../../src/layout/Tab.vue'
import PanelComponent from '../../src/layout/PanelComponent.vue'
import NotificationBoxComponent from '../../src/notifications/NotificationBoxComponent.vue'
import Select from '../../src/ui/Select.vue'
import Icon from '../../src/ui/Icon.vue'
import InputWrapperMenu from '../../src/ui/input/InputWrapperMenu.vue'
import WritingAssistantButton from '../../src/ui/writing/WritingAssistantButton.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: {
    en: {
      ok: 'OK',
      'app.tabs.label': 'Sections',
      'panel.alt.open': 'Open {panel}',
      'panel.alt.minimize': 'Minimize {panel}',
      'notifications.saved': 'Saved',
      'components.inputWrapper.previous-tool': 'Previous tool',
      'components.inputWrapper.next-tool': 'Next tool'
    }
  }
})

const mounted: VueWrapper[] = []

function attach<T extends VueWrapper>(wrapper: T): T {
  mounted.push(wrapper)
  return wrapper
}

// axe can't measure color in jsdom, so contrast is checked against the palettes instead
async function violations(element: Element) {
  const results = await axe.run(element, { rules: { 'color-contrast': { enabled: false } } })
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(', ')}`)
}

function narrow(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  )
}

afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('TabBar', () => {
  function mountTabs() {
    return attach(
      mount(
        {
          render: () =>
            h(TabBar, null, () =>
              ['Main', 'Notes', 'Transcripts'].map((label) =>
                h(Tab, { label }, () => h('p', `${label} content`))
              )
            )
        },
        { attachTo: document.body, global: { plugins: [i18n] } }
      )
    )
  }

  beforeEach(() => narrow(true))

  it('is a tab list whose tabs control their panels', async () => {
    const wrapper = mountTabs()
    await flushPromises()

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.map((t) => t.text())).toEqual(['Main', 'Notes', 'Transcripts'])
    expect(tabs.map((t) => t.attributes('aria-selected'))).toEqual(['true', 'false', 'false'])
    expect(tabs.map((t) => t.attributes('tabindex'))).toEqual(['0', '-1', '-1'])
    for (const tab of tabs) {
      const panel = document.getElementById(tab.attributes('aria-controls')!)
      expect(panel?.getAttribute('role')).toBe('tabpanel')
      expect(panel?.getAttribute('aria-labelledby')).toBe(tab.attributes('id'))
    }
    expect(await violations(wrapper.element)).toEqual([])
  })

  it('moves between tabs with the arrow keys, home and end', async () => {
    const wrapper = mountTabs()
    await flushPromises()
    const list = wrapper.find('[role="tablist"]')
    const selected = () => wrapper.find('[aria-selected="true"]').text()

    await list.trigger('keydown', { key: 'ArrowRight' })
    expect(selected()).toBe('Notes')
    expect(document.activeElement?.textContent?.trim()).toBe('Notes')

    await list.trigger('keydown', { key: 'ArrowLeft' })
    await list.trigger('keydown', { key: 'ArrowLeft' })
    expect(selected()).toBe('Transcripts')

    await list.trigger('keydown', { key: 'Home' })
    expect(selected()).toBe('Main')
    await list.trigger('keydown', { key: 'End' })
    expect(selected()).toBe('Transcripts')
  })

  it('drops the tab panel role when every tab is on screen at once', async () => {
    narrow(false)
    const wrapper = mountTabs()
    await flushPromises()
    expect(wrapper.find('[role="tabpanel"]').exists()).toBe(false)
  })
})

describe('PanelComponent', () => {
  it('is toggled by a button that says whether it is open and what it opens', async () => {
    const wrapper = attach(
      mount(PanelComponent, {
        props: { title: 'Notes' },
        slots: { default: '<p>the notes</p>' },
        attachTo: document.body,
        global: { plugins: [i18n] }
      })
    )
    const toggle = wrapper.find('button.panel-toggle')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.attributes('aria-label')).toBe('Open Notes')
    expect(document.getElementById(toggle.attributes('aria-controls')!)?.textContent).toBe(
      'the notes'
    )

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(toggle.attributes('aria-label')).toBe('Minimize Notes')
    expect(await violations(wrapper.element)).toEqual([])
  })
})

describe('NotificationBoxComponent', () => {
  const notification = (modal: boolean) => ({
    category: 'saved',
    key: 'k',
    mogulId: 1,
    context: '{}',
    when: '',
    modal,
    visible: true
  })

  beforeEach(() => {
    listeners.splice(0)
    // jsdom has <dialog> but not its modal behavior
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    })
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    })
  })

  function mountBox() {
    return attach(
      mount(NotificationBoxComponent, { attachTo: document.body, global: { plugins: [i18n] } })
    )
  }

  it('reads a toast out through a live region', async () => {
    const wrapper = mountBox()
    const status = wrapper.find('[role="status"]')
    expect(status.text()).toBe('')

    listeners.forEach((l) => l(notification(false)))
    await flushPromises()

    expect(status.text()).toBe('Saved')
    expect(document.querySelector('dialog')?.open).toBe(false)
    expect(await violations(document.body)).toEqual([])
  })

  it('shows a modal as a dialog named by its message, and closes it', async () => {
    const wrapper = mountBox()
    listeners.forEach((l) => l(notification(true)))
    await flushPromises()

    const dialog = document.querySelector('dialog')!
    expect(dialog.open).toBe(true)
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe(
      'Saved'
    )
    expect(await violations(document.body)).toEqual([])

    await wrapper.find('dialog button').trigger('click')
    expect(dialog.open).toBe(false)
  })
})

describe('Select', () => {
  const options = [
    { label: 'One', value: 1 },
    { label: 'Two', value: 2 }
  ]

  it('ties its label to its select', async () => {
    const wrapper = attach(
      mount(Select, {
        props: { modelValue: null, options, label: 'Podcast' },
        attachTo: document.body
      })
    )
    const select = wrapper.find('select')
    expect(wrapper.find('label').attributes('for')).toBe(select.attributes('id'))
    expect(await violations(wrapper.element)).toEqual([])
  })

  it('takes the id it is given, for a label outside it', () => {
    const wrapper = attach(mount(Select, { props: { modelValue: null, options, id: 'chosen' } }))
    expect(wrapper.find('select').attributes('id')).toBe('chosen')
  })

  it('falls back to its placeholder for a name', async () => {
    const wrapper = attach(
      mount(Select, {
        props: { modelValue: null, options, placeholder: 'Choose a podcast' },
        attachTo: document.body
      })
    )
    expect(wrapper.find('select').attributes('aria-label')).toBe('Choose a podcast')
    expect(await violations(wrapper.element)).toEqual([])
  })
})

describe('Icon as a control', () => {
  const svg = `<svg viewBox="0 0 24 24"><circle r="11"/></svg>`

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(svg))
    )
  })

  async function mountIcon(props: Record<string, unknown>, onClick?: () => void) {
    const wrapper = attach(
      mount(Icon, {
        props,
        attrs: onClick ? { onClick } : {},
        attachTo: document.body,
        global: { plugins: [i18n] }
      })
    )
    await flushPromises()
    return wrapper
  }

  it('is a picture, out of the tab order, when nobody listens for clicks', async () => {
    const icon = await mountIcon({ icon: '/a.svg', iconHover: '/a.svg', alt: 'Home' })
    expect(icon.attributes('role')).toBe('img')
    expect(icon.attributes('tabindex')).toBeUndefined()
  })

  it('is a named button that enter and space press, when someone does', async () => {
    const click = vi.fn()
    const icon = await mountIcon({ icon: '/a.svg', iconHover: '/a.svg', alt: 'Delete' }, click)
    expect(icon.attributes('role')).toBe('button')
    expect(icon.attributes('tabindex')).toBe('0')
    expect(icon.attributes('aria-label')).toBe('Delete')

    await icon.trigger('keydown', { key: 'Enter' })
    expect(click).toHaveBeenCalledTimes(1)
    // space fires as it comes up, the way a native button does
    await icon.trigger('keydown', { key: ' ' })
    expect(click).toHaveBeenCalledTimes(1)
    await icon.trigger('keyup', { key: ' ' })
    expect(click).toHaveBeenCalledTimes(2)
    await icon.trigger('click')
    expect(click).toHaveBeenCalledTimes(3)
    expect(await violations(icon.element)).toEqual([])
  })

  it('does nothing, and leaves the tab order, when disabled', async () => {
    const click = vi.fn()
    const icon = await mountIcon(
      { icon: '/a.svg', iconHover: '/a.svg', alt: 'Delete', disabled: true },
      click
    )
    expect(icon.attributes('aria-disabled')).toBe('true')
    expect(icon.attributes('tabindex')).toBe('-1')
    await icon.trigger('keydown', { key: 'Enter' })
    await icon.trigger('click')
    expect(click).not.toHaveBeenCalled()
  })

  it('says whether a sticky toggle is pressed', async () => {
    const icon = await mountIcon(
      { icon: '/eye.svg', iconHover: '/eye-off.svg', alt: 'Show password', sticky: true },
      () => {}
    )
    expect(icon.attributes('aria-pressed')).toBe('false')
    await icon.trigger('keydown', { key: 'Enter' })
    expect(icon.attributes('aria-pressed')).toBe('true')
  })

  it('works the same as a png', async () => {
    const click = vi.fn()
    const icon = await mountIcon({ icon: '/a.png', iconHover: '/a.png', alt: 'Open' }, click)
    expect(icon.element.tagName).toBe('IMG')
    expect(icon.attributes('role')).toBe('button')
    await icon.trigger('keydown', { key: 'Enter' })
    expect(click).toHaveBeenCalledOnce()
  })
})

describe('InputWrapperMenu', () => {
  it('moves between tools with real buttons, disabled at the ends', async () => {
    const wrapper = attach(
      mount(InputWrapperMenu, {
        props: { disabled: false, enableUpArrow: false, enableDownArrow: true },
        slots: { default: '<span>tool</span>' },
        attachTo: document.body,
        global: { plugins: [i18n] }
      })
    )
    const [up, down] = wrapper.findAll('button')
    expect(up.attributes('aria-label')).toBe('Previous tool')
    expect(up.attributes('disabled')).toBeDefined()
    expect(down.attributes('disabled')).toBeUndefined()
    await down.trigger('click')
    expect(wrapper.emitted('down')).toHaveLength(1)
    expect(await violations(wrapper.element)).toEqual([])
  })
})

describe('WritingAssistantButton', () => {
  it('is a button, and says whether the tools it opens are open', () => {
    const plain = attach(mount(WritingAssistantButton, { props: { label: 'Proofread' } }))
    expect(plain.element.tagName).toBe('BUTTON')
    expect(plain.attributes('aria-expanded')).toBeUndefined()

    const toggle = attach(
      mount(WritingAssistantButton, { props: { label: 'Rewrite', expanded: true } })
    )
    expect(toggle.attributes('aria-expanded')).toBe('true')
  })
})
