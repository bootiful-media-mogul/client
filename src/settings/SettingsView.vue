<template>
  <h1 v-if="mogul">{{ t('settings.title') }}</h1>
  <div v-for="settingsPage in settingsRef" v-bind:key="settingsPage.category">
    <form class="pure-form pure-form-stacked" @submit.prevent="save(settingsPage.category)">
      <fieldset>
        <legend>
          {{ label(settingsPage.category, 'title') }}
        </legend>
        <div v-for="setting in settingsPage.settings" v-bind:key="setting.name">
          <div v-if="setting.type === 'BOOLEAN'" class="pure-control-group">
            <label
              :for="textAreaElementId(settingsPage.category, setting.name)"
              class="pure-checkbox"
            >
              <input
                :id="textAreaElementId(settingsPage.category, setting.name)"
                v-model="setting.value"
                type="checkbox"
                true-value="true"
                false-value="false"
              />
              {{ label(settingsPage.category, setting.name) }}
            </label>
          </div>
          <div v-else class="pure-control-group">
            <label :for="textAreaElementId(settingsPage.category, setting.name)">
              {{ label(settingsPage.category, setting.name) }}
              <PrivatePasswordInputComponent
                v-if="setting.type !== 'TEXT'"
                :prompt="t('podcasts.episodes.episode.description.ai-prompt')"
              />
            </label>
            <input
              :id="textAreaElementId(settingsPage.category, setting.name)"
              v-model="setting.value"
              autocomplete="off"
              :required="setting.required && !setting.valid"
              class="secret"
              :type="setting.type === 'TEXT' ? 'text' : 'password'"
            />
            <span class="pure-form-message-inline">
              <span v-if="setting.required && !setting.valid">{{
                t('labels.required-value')
              }}</span>
              <span v-if="!setting.required">{{ t('labels.optional-value', 'optional') }}</span>
            </span>
          </div>
        </div>
        <div class="pure-controls">
          <button
            v-if="settingsPage.settings.length > 0"
            class="pure-button pure-button-primary"
            type="submit"
          >
            {{
              t('settings.save-button', {
                plugin: label(settingsPage.category, 'title')
              })
            }}
          </button>
          <div
            v-if="settingsPage.settings.length == 0"
            v-html="
              t('settings.no-configuration-for-plugin', {
                plugin: label(settingsPage.category, 'title')
              })
            "
          ></div>
        </div>
      </fieldset>
    </form>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import {
  mogul as mogulService,
  Setting,
  settings as settingsService,
  SettingsPage
} from '@/services'
import PrivatePasswordInputComponent from '@/ui/input/PrivatePasswordInputComponent.vue'
import { useI18n } from 'vue-i18n'
const { t, te } = useI18n()

// sections that aren't publisher plugins, like cleanvoice, keep their labels under
// settings.categories; the plugins' have always been under publications.plugins
function label(category: string, name: string): string {
  const own = 'settings.categories.' + category + '.' + name
  return te(own) ? t(own) : t('publications.plugins.' + category + '.' + name)
}
const mogul = ref('')
const settingsRef = ref<Array<SettingsPage>>([])
const loadedSettingsRef = ref<Array<SettingsPage>>([])

const reloadSettings = async () => {
  settingsRef.value = await settingsService.settings()
  // an unset checkbox shows what unset means, so saving without touching it changes nothing
  settingsRef.value.forEach((sp: SettingsPage) =>
    sp.settings.forEach((setting) => {
      if (setting.type === 'BOOLEAN' && !setting.value)
        setting.value = setting.defaultValue ?? 'false'
    })
  )
  const newSettings: Array<SettingsPage> = []
  settingsRef.value.forEach((sp: SettingsPage) => {
    const sub = sp.settings.map(
      (setting) =>
        new Setting(
          setting.name,
          setting.valid,
          setting.value,
          setting.required,
          setting.type,
          setting.defaultValue
        )
    )
    const nsp = new SettingsPage(sp.valid, sp.category, sub)
    newSettings.push(nsp)
  })
  loadedSettingsRef.value = newSettings
}

const save = async (category: string) => {
  function findSettingWithMatchingKey(haystack: Array<Setting>, k: string): Setting | null {
    const matches = haystack.filter((s) => s.name == k)
    if (matches && matches.length > 0) return matches[0]
    return null
  }

  const pageForCategory = settingsRef.value.filter((sp) => sp.category == category)[0]
  const settings = pageForCategory.settings
  const loadedPageForCategory = loadedSettingsRef.value.filter((sp) => sp.category == category)[0]
  const loadedSettings = loadedPageForCategory.settings

  for (const setting of settings) {
    const matching = findSettingWithMatchingKey(loadedSettings, setting.name)
    if (matching != null && matching.value != setting.value) {
      await settingsService.updateSetting(pageForCategory.category, setting.name, setting.value)
      await reloadSettings()
    }
  }
}

const textAreaElementId = (category: string, settingName: string): string => {
  return 'secret-' + category + '-' + settingName
}

onMounted(async () => {
  const u = await mogulService.user()
  mogul.value = u.displayName
  await reloadSettings()
})
</script>

<style scoped>
.secret {
  width: 100%;
}

/* standard stuff */
.pure-controls .pure-button {
  margin-top: calc(0.5 * var(--gutter-space));
}
</style>
