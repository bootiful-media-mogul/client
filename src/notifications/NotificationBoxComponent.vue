<template>
  <div v-if="showModalNotification">
    <div class="body-overlay"></div>
    <div class="modal-notification-panel">
      {{ latestNotification }}
      <div class="buttons">
        <button type="submit" @click.prevent="dismiss">
          {{ t('ok') }}
        </button>
      </div>
    </div>
  </div>

  <div v-if="showToasterNotification" :class="toasterNotificationCss">
    {{ latestNotification }}
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Notification, notifications } from '@/services'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const showToasterNotification = ref(false)
const showModalNotification = ref(false)
const latestNotification = ref('')
const toasterNotificationCss = ref<Record<string, boolean>>({
  'toaster-notification-panel': true,
  'animated-element-hidden': true
})

let nextTimeoutId: number | undefined

function show() {
  toasterNotificationCss.value = {
    'toaster-notification-panel': true,
    'animated-element-visible': true,
    'animated-element-hidden': false
  }
}

function hide() {
  toasterNotificationCss.value = {
    'toaster-notification-panel': true,
    'animated-element-visible': false,
    'animated-element-hidden': true
  }
}

function dismiss() {
  showToasterNotification.value = false
  showModalNotification.value = false
}

function contextFields(context: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(context)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function processNotification(notification: Notification) {
  latestNotification.value = t('notifications.' + notification.category, {
    // a json context's fields are there by name too, for messages that want, say, a reason
    ...contextFields(notification.context),
    key: notification.key,
    mogulId: notification.mogulId,
    when: notification.when,
    context: notification.context
  })

  showModalNotification.value = notification.modal
  showToasterNotification.value = notification.visible

  const displayForNMilliseconds = 5000

  if (showToasterNotification.value) {
    show()
    clearTimeout(nextTimeoutId)
    nextTimeoutId = window.setTimeout(() => {
      hide()
    }, displayForNMilliseconds)
  }
}

onMounted(() => {
  notifications.listen(processNotification)
})
</script>

<style>
.toaster-notification-panel {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
  border-radius: 0 0 var(--gutter-space) var(--gutter-space);
  background-color: white;
  padding: var(--gutter-space);
  position: fixed;
  width: 40%;
  transition: transform 2s ease;
  top: 0;
  left: 30%;
  transform: translate(-50%);
  text-align: center;
  z-index: 100000;
}

.animated-element-visible {
  transform: translateY(0);
}

.animated-element-hidden {
  transform: translateY(-100px);
}

.body-overlay {
  height: 100%;
  background-color: white;
  width: 100%;
  z-index: 1000;
  position: fixed;
  opacity: 0.7;
  top: 0;
  left: 0;
}

.modal-notification-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20001;
  border-radius: var(--gutter-space);
  color: white;
  padding: var(--gutter-space);
  background-color: black;
}

.modal-notification-panel .buttons a {
  color: white;
}
</style>
