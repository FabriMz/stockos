<template>
  <div
    class="brand-row"
    @click="$router.push(to)"
    role="button"
    tabindex="0"
    :aria-label="brand.name"
    @keydown.enter="$router.push(to)"
  >
    <div v-if="stripe" class="brand-row__stripe" :style="{ background: stripe }"></div>
    <div class="brand-row__body">
      <div class="brand-row__header">
        <div class="brand-row__icon">
          <i :class="`ti ${brand.ic}`" :style="{ color: brand.col }" aria-hidden="true"></i>
        </div>
        <div class="brand-row__info">
          <div class="brand-row__name">{{ brand.name }}</div>
          <div class="brand-row__meta">{{ meta }}</div>
        </div>
      </div>
      <div class="brand-row__divider" aria-hidden="true"></div>
      <div class="brand-row__badges">
        <slot name="badges" />
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  brand:  { type: Object,  required: true },
  to:     { type: String,  required: true },
  meta:   { type: String,  default: '' },
  stripe: { type: String,  default: '' },
})
</script>