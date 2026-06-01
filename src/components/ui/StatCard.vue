<template>
  <div class="stat-card">
    <div class="stat-card__label">{{ label }}</div>
    <div class="stat-card__value" :class="valueClass">{{ value }}</div>
    <div class="stat-card__sub">{{ sub }}</div>
    <div class="stat-card__bar" :class="`stat-card__bar--${color}`"></div>
  </div>
</template>

<script setup>
defineProps({
  label:      { type: String, required: true },
  value:      { type: [String, Number], required: true },
  sub:        { type: String, default: '' },
  color:      { type: String, default: 'primary' },
  valueClass: { type: String, default: '' },
})
</script>
