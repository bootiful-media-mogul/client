<template>
  <!-- a native modal dialog: the browser moves focus into it, keeps focus there, closes
       it on escape, and puts focus back where it was when it closes -->
  <dialog
    ref="modal"
    class="modal-notification-panel"
    aria-labelledby="modal-notification-message"
    @close="dismiss"
  >
    <p id="modal-notification-message">{{ latestNotification }}</p>
    <div class="buttons">
      <!-- eslint-disable-next-line vuejs-accessibility/no-autofocus -- a modal dialog should hand focus to its button -->
      <button type="button" autofocus @click="modal?.close()">
        {{ t('ok') }}
      </button>
    </div>
  </dialog>

  <!-- the toast is seen, the live region is heard. the region is always in the page,
       since a screen reader only speaks the changes to a region it already knows -->
  <div v-if="showToasterNotification" :class="toasterNotificationCss" aria-hidden="true">
    {{ latestNotification }}
  </div>
  <div class="visually-hidden" role="status" aria-live="polite">{{ announcement }}</div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { Notification, notifications } from '@/services'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const showToasterNotification = ref(false)
const showModalNotification = ref(false)
const latestNotification = ref('')
const announcement = ref('')
const modal = ref<HTMLDialogElement>()

watch(showModalNotification, (open) => {
  if (open && !modal.value?.open) modal.value?.showModal()
  else if (!open && modal.value?.open) modal.value.close()
})

// emptied first, so the same message twice in a row is still read out twice
async function announce(message: string) {
  announcement.value = ''
  await nextTick()
  announcement.value = message
}
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

  if (showToasterNotification.value && !showModalNotification.value) {
    announce(latestNotification.value)
  }

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
  background-color: var(--raised-color);
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

/* a modal dialog sits in the top layer, above everything, and the browser centers it */
.modal-notification-panel::backdrop {
  /* older browsers don't let a backdrop inherit custom properties */
  background-color: var(--raised-color, white);
  opacity: 0.7;
}

.modal-notification-panel {
  border: none;
  border-radius: var(--gutter-space);
  color: var(--chrome-ink-color);
  padding: var(--gutter-space);
  background-color: var(--chrome-color);
}

.modal-notification-panel p {
  margin: 0;
}

.modal-notification-panel .buttons a {
  color: var(--chrome-ink-color);
}
</style>
