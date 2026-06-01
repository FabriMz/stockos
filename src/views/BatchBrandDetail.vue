<template>
  <div class="screen" v-if="brand">
    <TopBar
      variant="back"
      :back-label="batchNumber"
      :back-to="`/catalog/batch/${encodeURIComponent(batchNumber)}`"
      :title="brand.name"
    />

    <div class="scroll-content">
      <div class="brand-summary">
        <div class="brand-summary__icon" :style="{ background: brand.bg }">
          <i :class="`ti ${brand.ic}`" :style="{ color: brand.col }" aria-hidden="true"></i>
        </div>
        <div>
          <div class="brand-summary__name">{{ brand.name }}</div>
          <div class="brand-summary__meta">
            {{ batchItems.length }} {{ batchItems.length === 1 ? 'producto' : 'productos' }}
          </div>
        </div>
      </div>

      <ProductCard
        v-for="item in batchItems"
        :key="item.id"
        :product="getProduct(item.productId)"
        :show-actions="true"
        :batch-context="{ itemId: item.id, batchNum: batchNumber }"
        @remove="store.markDeleteBatchItem($event)"
      />

      <div class="spacer--sm"></div>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore } from '../stores/products.js'
import TopBar     from '../components/layout/TopBar.vue'
import BottomNav  from '../components/layout/BottomNav.vue'
import ProductCard from '../components/ui/ProductCard.vue'

const route  = useRoute()
const router = useRouter()
const store  = useProductsStore()

const batchNumber = computed(() => decodeURIComponent(route.params.batchNumber))
const brandId     = computed(() => route.params.brandId)
const brand       = computed(() => store.getBrand(brandId.value))
const batchItems  = computed(() => store.getBatchItemsByBrand(brandId.value, batchNumber.value))

const getProduct = id => store.getProduct(id)

watch(batchItems, (items, oldItems) => {
  if (oldItems?.length > 0 && items.length === 0) {
    router.push(`/catalog/batch/${encodeURIComponent(batchNumber.value)}`)
  }
})
</script>