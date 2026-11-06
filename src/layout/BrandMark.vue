<template>
  <a class="brand" href="#" @click.prevent="router.push({ name: 'home' })">
    <span class="brand-name">{{ t('brand.name') }}</span>
    <span class="brand-product">{{ t('brand.product') }}</span>
  </a>
</template>

<style scoped>
/* the wordmark, drawn for the dark bars it sits on. a parent sizes it by setting
   --brand-size (the "mogul") on an ancestor; "studio" scales along with it */
.brand {
  --size: var(--brand-size, 2rem);
  display: inline-flex;
  align-items: baseline;
  gap: calc(var(--size) * 0.25);
  color: var(--chrome-ink-color);
  text-decoration: none;
}

.brand:hover {
  text-decoration: none;
}

.brand-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--size);
  line-height: 1;
  letter-spacing: -0.05em;
}

.brand-product {
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: max(0.625rem, calc(var(--size) * 0.375));
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--brand-color);
}
</style>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import router from '@/index'

const { t } = useI18n()
</script>
