<template>
  <div class="alert-folder" @click="$router.push(to)" role="button" tabindex="0" :aria-label="label"
    @keydown.enter="$router.push(to)">
    <div v-if="stripe" class="alert-folder__stripe" :style="{ background: stripe }"></div>
    <div class="alert-folder__icon">
      <i :class="`ti ${icon}`" :style="{ color: iconColor }" aria-hidden="true"></i>
    </div>
    <div class="alert-folder__info">
      <div class="alert-folder__name">{{ label }}</div>
      <div class="alert-folder__meta">{{ meta }}</div>
    </div>
    <i class="ti ti-chevron-right alert-folder__chevron" aria-hidden="true"></i>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  meta: { type: String, default: '' },
  to: { type: String, required: true },
  icon: { type: String, default: 'ti-folder' },
  iconBg: { type: String, default: '#F0EAE4' },
  iconColor: { type: String, default: '#791132' },
  stripe: { type: String, default: '' },
})
</script>