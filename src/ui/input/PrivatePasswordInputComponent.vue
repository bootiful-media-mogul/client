<style scoped>
.icon {
  position: fixed;
  z-index: 1002;
}
</style>
<template>
  <Icon
    highlight="rest"
    ref="icon"
    :icon="eyeAsset"
    :icon-hover="eyeOffAsset"
    class="icon"
    sticky
    @click.prevent="togglePreview"
  />
</template>

<script lang="ts" setup>
import {
  type ComponentInternalInstance,
  type ComponentPublicInstance,
  getCurrentInstance,
  onMounted,
  ref
} from 'vue'

import eyeOffAsset from '@/assets/images/icons/eye-off.svg'
import eyeAsset from '@/assets/images/icons/eye.svg'

import Icon from '@/ui/Icon.vue'

const icon = ref<ComponentPublicInstance>()
const input = ref<HTMLInputElement>()

function formInputForLabel(childElement: HTMLElement) {
  const forElementIdName = childElement.getAttribute('for')
  if (forElementIdName != null && forElementIdName.toString().trim() != '')
    return document.getElementById(forElementIdName) as HTMLInputElement
  return null
}

function positionIcon(parent: HTMLElement, icon: HTMLElement) {
  const formElement = formInputForLabel(parent)!!
  input.value = formElement
  const resizeFunction = () => {
    const formElementRect = formElement.getBoundingClientRect()
    const iconRect = icon.getBoundingClientRect()
    const h = iconRect.height == 0 ? 20 : iconRect.height
    const y = formElementRect.top + (formElementRect.height - h) / 2
    icon.style.left = formElementRect.right + 5 + 'px'
    icon.style.top = y + 'px'
  }
  new ResizeObserver(resizeFunction).observe(formElement)
  window.addEventListener('scroll', resizeFunction)
}

const togglePreview = function (e: Event) {
  input.value!!.type = input.value!!.type.toLowerCase() === 'password' ? 'text' : 'password'
}

onMounted(() => {
  const currentInstance: ComponentInternalInstance = getCurrentInstance()!!
  if (currentInstance?.proxy?.$el) {
    const parent = currentInstance.proxy.$el.parentElement as HTMLElement
    if (icon.value?.$el) positionIcon(parent, icon.value.$el)
  }
})
</script>
