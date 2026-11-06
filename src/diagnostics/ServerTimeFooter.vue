<template>
  <div class="server-time-footer">
    <span class="label">{{ t('diagnostics.server-time.browser') }}</span>
    <code>{{ browserLocalTime }}</code>
    <code>{{ browserTimeZone }}</code>

    <template v-if="serverTime">
      <span class="label">{{ t('diagnostics.server-time.server') }}</span>
      <code>{{ serverTime.javaLocalTime }}</code>
      <code>{{ serverTime.javaTimeZone }} ({{ serverTime.javaOffset }})</code>

      <span class="label">{{ t('diagnostics.server-time.database') }}</span>
      <code>{{ serverTime.databaseLocalTime }}</code>
      <code>{{ serverTime.databaseTimeZone }}</code>
    </template>
    <code v-else-if="error" class="error">{{ error }}</code>
    <code v-else>…</code>
  </div>
</template>

<style scoped>
.server-time-footer {
  grid-area: footer;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  gap: var(--gutter-space-half);
  padding: var(--gutter-space-half) var(--gutter-space);
  font-size: var(--font-size-sm);
  opacity: 0.75;
}

.server-time-footer .label {
  font-weight: bolder;
}

.server-time-footer code {
  font-family: var(--font-mono);
}

.server-time-footer .error {
  color: darkred;
}
</style>

<script lang="ts" setup>
// deliberately always rendered: this exists to be read, so a failed lookup has to
// say so rather than disappear
// (said here, not in the template: a comment beside the root element makes the
// component a fragment in dev builds, and a parent's class stops reaching it)
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { diagnostics, type ServerTime } from '@/services'

const { t } = useI18n()

const serverTime = ref<ServerTime | null>(null)
const error = ref<string | null>(null)

// this page's own clock, for comparison with the two the server reports. between them
// the three say which zone existing `timestamp without time zone` rows were written in.
const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
const browserLocalTime = new Date().toISOString()

onMounted(async () => {
  try {
    serverTime.value = await diagnostics.serverTime()
  } catch (e) {
    error.value = `${e}`
  }
})
</script>
