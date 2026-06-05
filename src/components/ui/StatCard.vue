<template>
  <div class="stat-card" :class="{ 'stat-card--full': full }">
    <div class="stat-card__main">
      <div class="stat-card__label">{{ label }}</div>
      <div class="stat-card__value" :class="valueClass">{{ value }}</div>
      <div class="stat-card__sub">{{ sub }}</div>
      <div class="stat-card__bar" :class="`stat-card__bar--${color}`"></div>
    </div>
    <div v-if="badge" class="stat-card__badge">
      <i v-if="badgeIcon" :class="badgeIcon" aria-hidden="true"></i>
      {{ badge }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  label:      { type: String, required: true },
  value:      { type: [String, Number], required: true },
  sub:        { type: String, default: '' },
  color:      { type: String, default: 'primary' },
  valueClass: { type: String, default: '' },
  full:       { type: Boolean, default: false },
  badge:      { type: String, default: '' },
  badgeIcon:  { type: String, default: '' },
})
</script>