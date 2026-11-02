import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref, type Ref } from 'vue'
import { createI18n } from 'vue-i18n'
import { describe, expect, it } from 'vitest'
import InputWrapper from '../../src/ui/input/InputWrapper.vue'
import InputWrapperChild from '../../src/ui/input/InputWrapperChild.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      'components.inputWrapper.empty': '(empty)',
      'components.inputWrapper.character-count': '{count} character(s)',
      'inputWrapperMenu.default-content': 'Tools'
    }
  }
})

describe('InputWrapper character count', () => {
  it('tracks edits and programmatic replacements of the input value', async () => {
    let value: Ref<string>
    const editor = defineComponent({
      components: { InputWrapper, InputWrapperChild },
      setup() {
        value = ref('hello')
        return { value }
      },
      template: `
        <InputWrapper v-model="value">
          <textarea v-model="value" />
          <InputWrapperChild>
            <template #panel><div>Tools</div></template>
            <template #icon><div>Icon</div></template>
          </InputWrapperChild>
        </InputWrapper>
      `
    })
    const wrapper = mount(editor, { global: { plugins: [i18n] } })
    const status = () => wrapper.find('.word-count .status').text()

    expect(status()).toBe('5 character(s)')

    value!.value = 'A longer rewrite'
    await nextTick()
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('A longer rewrite')
    expect(status()).toBe('16 character(s)')

    await wrapper.find('textarea').setValue('typed')
    expect(status()).toBe('5 character(s)')

    value!.value = ''
    await nextTick()
    expect(status()).toBe('(empty)')
  })
})
