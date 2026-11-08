import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import Dropdown from '../../src/ui/Dropdown.vue'

// attached to the document, since the dropdown listens there for escape and outside clicks
function mountDropdown(props: Record<string, unknown> = {}) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const wrapper = mount(Dropdown, {
    props,
    slots: {
      trigger: 'Pick',
      default: '<label><input type="checkbox" class="inside" /> one</label>'
    },
    attachTo: host
  })
  const trigger = () => wrapper.find('.dropdown-trigger')
  const panel = () => wrapper.find('.dropdown-panel')
  return { wrapper, trigger, panel }
}

const press = async (key: string) => {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  await nextTick()
}

const pointerDownOn = async (target: Element) => {
  target.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  await nextTick()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Dropdown', () => {
  it('drops its panel down from the button, and says so', async () => {
    const { trigger, panel } = mountDropdown()
    expect(trigger().text()).toContain('Pick')
    expect(trigger().attributes('aria-expanded')).toBe('false')
    expect(panel().exists()).toBe(false)

    await trigger().trigger('click')
    expect(trigger().attributes('aria-expanded')).toBe('true')
    expect(panel().attributes('id')).toBe(trigger().attributes('aria-controls'))
    expect(panel().find('.inside').exists()).toBe(true)

    await trigger().trigger('click')
    expect(panel().exists()).toBe(false)
  })

  it('closes on escape from anywhere, and hands focus back to the button', async () => {
    const { trigger, panel } = mountDropdown()
    await trigger().trigger('click')
    await press('Enter')
    expect(panel().exists()).toBe(true)
    await press('Escape')
    expect(panel().exists()).toBe(false)
    expect(document.activeElement).toBe(trigger().element)
  })

  it('closes on a click outside it, but not on one inside it', async () => {
    const { trigger, panel } = mountDropdown()
    await trigger().trigger('click')
    await pointerDownOn(panel().find('.inside').element)
    expect(panel().exists()).toBe(true)
    await pointerDownOn(document.body)
    expect(panel().exists()).toBe(false)
  })

  it('closes when focus leaves it, but not when focus just goes away', async () => {
    const { wrapper, trigger, panel } = mountDropdown()
    const elsewhere = document.body.appendChild(document.createElement('button'))
    await trigger().trigger('click')
    await wrapper.find('.dropdown').trigger('focusout', { relatedTarget: null })
    expect(panel().exists()).toBe(true)
    await wrapper.find('.dropdown').trigger('focusout', { relatedTarget: elsewhere })
    expect(panel().exists()).toBe(false)
  })

  it('stops listening to the document once it closes', async () => {
    const { trigger, panel } = mountDropdown()
    await trigger().trigger('click')
    await press('Escape')
    // a second escape would steal focus back to the button if it were still listening
    const elsewhere = document.body.appendChild(document.createElement('button'))
    elsewhere.focus()
    await press('Escape')
    expect(document.activeElement).toBe(elsewhere)
    expect(panel().exists()).toBe(false)
  })

  it('can be opened and watched from outside with v-model:open', async () => {
    const open = ref(false)
    const host = defineComponent({
      components: { Dropdown },
      setup: () => ({ open }),
      template: `<Dropdown v-model:open="open"><template #trigger>Pick</template>panel</Dropdown>`
    })
    const wrapper = mount(host, {
      attachTo: document.body.appendChild(document.createElement('div'))
    })
    open.value = true
    await nextTick()
    expect(wrapper.find('.dropdown-panel').exists()).toBe(true)
    await press('Escape')
    expect(open.value).toBe(false)
  })

  it('closes, and stays shut, when it is disabled', async () => {
    const { wrapper, trigger, panel } = mountDropdown()
    await trigger().trigger('click')
    await wrapper.setProps({ disabled: true })
    expect(panel().exists()).toBe(false)
    expect(trigger().attributes('disabled')).toBeDefined()
  })
})
