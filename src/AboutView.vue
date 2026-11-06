<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const about = t('about.title')

const madeWithLove = t('app.made-with-love', {
  josh: `<a href="https://youtube.com/@coffeesoftware">Josh Long</a>`
})
</script>
<template>
  <h1>{{ about }}</h1>
  <span v-html="madeWithLove" />
</template>
