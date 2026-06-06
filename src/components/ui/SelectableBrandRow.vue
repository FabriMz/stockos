<template>
  <div
    class="brand-row brand-row--selectable"
    :class="{ 'brand-row--selected': selected }"
    role="checkbox"
    :aria-checked="String(selected)"
    :aria-label="brand?.name"
    tabindex="0"
    @click="toggle"
    @keydown.enter.prevent="toggle"
    @keydown.space.prevent="toggle"
  >
    <div class="brand-row__body">
      <div class="brand-row__header">
        <div class="brand-row__check">
          <i class="ti" :class="selected ? 'ti-circle-check' : 'ti-circle'" aria-hidden="true"></i>
        </div>
        <div class="brand-row__icon" :style="{ background: brand?.bg }">
          <i :class="`ti ${brand?.ic}`" :style="{ color: brand?.col }" aria-hidden="true"></i>
        </div>
        <div class="brand-row__info">
          <div class="brand-row__name">{{ brand?.name }}</div>
          <div class="brand-row__meta">{{ meta }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  brand: { type: Object, required: true },
  meta: { type: String, default: '' },
  selected: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle'])
function toggle() {
  emit('toggle')
}
</script>
