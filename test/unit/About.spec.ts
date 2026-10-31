import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import AboutView from '../../src/AboutView.vue'

// Create i18n instance with your messages
const i18n = createI18n({
  legacy: false, // Important! Enable Composition API mode
  locale: 'en', // or whatever your default locale is
  messages: {
    en: {
      about: {
        title: 'AboutView Us'
      },
      app: {
        'made-with-love': 'Made with ❤️ by {josh}'
      }
    }
  }
})

describe('AboutView Component', () => {
  it('renders correctly', () => {
    const wrapper = mount(AboutView, {
      global: {
        plugins: [i18n]
      }
    })

    // Test that translations are rendered
    expect(wrapper.find('h1').text()).toBe('AboutView Us')
    expect(wrapper.find('span').html()).toContain(
      'Made with ❤️ by <a href="https://youtube.com/@coffeesoftware">Josh Long</a>'
    )
  })
})
