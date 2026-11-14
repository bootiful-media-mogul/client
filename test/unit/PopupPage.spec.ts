import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { afterEach, describe, expect, it } from 'vitest'
import PopupPage from '../../src/layout/PopupPage.vue'

// the page-wide popup has no caller right now (the home calendar opens its days in place),
// so this is what keeps it working for the next screen that wants one
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en: { 'popup.close': 'Close', 'popup.default-content': 'open' } }
})

function mountPopup(open = false) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  return mount(PopupPage, {
    props: { open, label: 'A page' },
    slots: {
      default: `<template #default="{ open }"><button class="opener" @click="open">Go</button></template>`,
      panel: `<template #panel="{ close }"><p class="inside">Inside</p><button class="done" @click="close">Done</button></template>`
    },
    global: { plugins: [i18n] },
    attachTo: host
  })
}

const panel = () => document.body.querySelector('.expanding-panel') as HTMLElement

afterEach(() => {
  document.body.innerHTML = ''
})

describe('PopupPage', () => {
  it('stays shut, and out of reach, until it is opened', () => {
    mountPopup()
    expect(panel().classList.contains('is-open')).toBe(false)
    expect(panel().getAttribute('aria-hidden')).toBe('true')
    expect(document.body.querySelector('.inside')).toBeNull()
  })

  it('covers the whole page, from the body, when its opener is clicked', async () => {
    const wrapper = mountPopup()
    await wrapper.find('.opener').trigger('click')
    await nextTick()
    expect(panel().parentElement).toBe(document.body)
    expect(panel().classList.contains('is-open')).toBe(true)
    expect(panel().getAttribute('role')).toBe('dialog')
    expect(panel().getAttribute('aria-label')).toBe('A page')
    expect(document.body.querySelector('.inside')).not.toBeNull()
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([true])
  })

  it('closes from its own button, from escape, and from the panel', async () => {
    const wrapper = mountPopup(true)
    await nextTick()
    ;(document.body.querySelector('.panel-close') as HTMLElement).click()
    await nextTick()
    expect(panel().classList.contains('is-open')).toBe(false)

    await wrapper.setProps({ open: true })
    await nextTick()
    panel().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(panel().classList.contains('is-open')).toBe(false)

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    await nextTick()
    ;(document.body.querySelector('.done') as HTMLElement).click()
    await nextTick()
    expect(panel().classList.contains('is-open')).toBe(false)
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })
})
