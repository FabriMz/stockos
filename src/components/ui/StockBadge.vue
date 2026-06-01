<template>
  <span v-if="product.stock === 0" class="badge badge--out" :aria-label="'Estado: Sin stock'">
    <i class="ti ti-ban" aria-hidden="true"></i>Sin stock
  </span>
  <span v-else-if="store.pct(product) < 25" class="badge badge--low" :aria-label="'Estado: Stock bajo'">
    <i class="ti ti-alert-circle" aria-hidden="true"></i>Stock bajo
  </span>
  <span v-else class="badge badge--ok" :aria-label="'Estado: En stock'">
    <i class="ti ti-circle-check" aria-hidden="true"></i>En stock
  </span>
</template>

<script setup>
import { useProductsStore } from '../../stores/products.js'

const store = useProductsStore()
defineProps({ product: { type: Object, required: true } })
</script>