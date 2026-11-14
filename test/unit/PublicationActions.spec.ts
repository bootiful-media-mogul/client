import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { createI18n } from 'vue-i18n'
import { describe, expect, it } from 'vitest'
import PublicationActionsComponent from '../../src/publications/PublicationActionsComponent.vue'
import type { PanelAction } from '../../src/publications/input'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      publications: {
        plugins: { publish: 'Publish' },
        schedule: {
          schedule: 'Schedule',
          when: 'Publish at',
          confirm: 'Schedule',
          cancel: 'Cancel',
          for: 'Schedule for {when}'
        }
      }
    }
  }
})

// the real picker is v-calendar's; all the actions need from it is a v-model
const VDatePicker = defineComponent({
  props: { modelValue: { type: Date, default: null } },
  emits: ['update:modelValue'],
  setup(_, { emit }) {
    return () =>
      h('input', {
        class: 'picker',
        onInput: (e: Event) =>
          emit('update:modelValue', new Date((e.target as HTMLInputElement).value))
      })
  }
})

function mountWith(overrides: Partial<PanelAction> = {}, scheduledFor: Date | null = null) {
  const calls: Array<Date | null> = []
  const action: PanelAction = {
    label: () => undefined,
    enabled: () => true,
    schedulable: () => true,
    publish: async (scheduled) => {
      calls.push(scheduled)
    },
    ...overrides
  }
  const wrapper = mount(PublicationActionsComponent, {
    props: { action, scheduledFor },
    global: { plugins: [i18n], components: { VDatePicker } }
  })
  const publishButton = () => wrapper.find('.publication-buttons button:not(.schedule-button)')
  const scheduleButton = () => wrapper.find('.schedule-button')
  return { wrapper, calls, publishButton, scheduleButton }
}

describe('the buttons beneath a publication panel', () => {
  it("say 'Publish' unless the panel names them, and publish right now", async () => {
    const { calls, publishButton } = mountWith()
    expect(publishButton().text()).toBe('Publish')
    await publishButton().trigger('click')
    await flushPromises()
    expect(calls).toEqual([null])
  })

  // the home page's calendar has already said when, so the main button schedules for then
  it('schedule for the moment they are given, rather than publishing now', async () => {
    const when = new Date(2099, 5, 15, 9, 0)
    const { calls, publishButton } = mountWith({ label: () => 'Create blog post' }, when)
    expect(publishButton().text()).toMatch(/^Schedule for 06\/15\/99/)
    await publishButton().trigger('click')
    await flushPromises()
    expect(calls).toEqual([when])
  })

  it('use the label and the enabled state the panel gives them', () => {
    const enabled = ref(false)
    const { publishButton, scheduleButton } = mountWith({
      label: () => 'Create blog post',
      enabled: () => enabled.value
    })
    expect(publishButton().text()).toBe('Create blog post')
    expect(publishButton().attributes('disabled')).toBeDefined()
    expect(scheduleButton().attributes('disabled')).toBeDefined()
  })

  it('leave the schedule button off a panel that cannot be scheduled', () => {
    const { scheduleButton } = mountWith({ schedulable: () => false })
    expect(scheduleButton().exists()).toBe(false)
  })

  it('disable publishing while a schedule is being picked, and give it back on cancel', async () => {
    const { wrapper, publishButton, scheduleButton } = mountWith()
    await scheduleButton().trigger('click')
    expect(wrapper.find('.schedule-panel').exists()).toBe(true)
    expect(publishButton().attributes('disabled')).toBeDefined()

    const cancel = wrapper.findAll('.schedule-panel button').find((b) => b.text() === 'Cancel')!
    await cancel.trigger('click')
    expect(wrapper.find('.schedule-panel').exists()).toBe(false)
    expect(publishButton().attributes('disabled')).toBeUndefined()
  })

  it('publish at the picked time, and only a time still to come', async () => {
    const { wrapper, calls, scheduleButton } = mountWith()
    await scheduleButton().trigger('click')
    const confirm = () =>
      wrapper.findAll('.schedule-panel button').find((b) => b.text() === 'Schedule')!
    // it starts at the top of the next hour, which is a time still to come
    expect(confirm().attributes('disabled')).toBeUndefined()

    await wrapper.find('.picker').setValue('2001-01-01T00:00:00Z')
    expect(confirm().attributes('disabled')).toBeDefined()

    const later = new Date(Date.now() + 86_400_000)
    await wrapper.find('.picker').setValue(later.toISOString())
    expect(confirm().attributes('disabled')).toBeUndefined()
    await confirm().trigger('click')
    await flushPromises()

    expect(calls).toHaveLength(1)
    expect(calls[0]!.getTime()).toBe(later.getTime())
    expect(wrapper.find('.schedule-panel').exists()).toBe(false)
  })

  it('say so once a publication is scheduled or published, so the panel can close', async () => {
    const { wrapper, publishButton, scheduleButton } = mountWith()
    await publishButton().trigger('click')
    await flushPromises()
    expect(wrapper.emitted('published')).toHaveLength(1)

    await scheduleButton().trigger('click')
    const confirm = wrapper.findAll('.schedule-panel button').find((b) => b.text() === 'Schedule')!
    await confirm.trigger('click')
    await flushPromises()
    expect(wrapper.emitted('published')).toHaveLength(2)
  })

  it('keep quiet when publishing fails, so the panel stays open', async () => {
    const { wrapper, publishButton } = mountWith({
      publish: async () => {
        throw new Error('nope')
      }
    })
    const errors: Array<unknown> = []
    wrapper.vm.$.appContext.config.errorHandler = (e) => {
      errors.push(e)
    }
    await publishButton().trigger('click')
    await flushPromises()
    expect(wrapper.emitted('published')).toBeUndefined()
  })
})
