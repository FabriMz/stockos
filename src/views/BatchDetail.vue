<template>
  <div class="screen">
    <TopBar
      variant="breadcrumb"
      :title="folder?.batchNumber ?? ''"
      :breadcrumbs="[{ label: 'Catálogo', to: '/catalog?tab=batches' }]"
    />

    <div class="scroll-content">
      <div v-if="folder" class="batch-detail__header">
        <div class="batch-detail__icon">
          <i class="ti ti-folder" aria-hidden="true"></i>
        </div>
        <div class="batch-detail__info">
          <div class="batch-detail__number">{{ folder.batchNumber }}</div>
          <div class="batch-detail__meta">
            {{ totalItems }} {{ totalItems === 1 ? 'producto' : 'productos' }} · vence {{ formatExpiry(folder.expiry) }}
            <span :class="['badge', expiryBadgeClass(folder.expiry)]">
              {{ expiryBadgeLabel(folder.expiry) }}
            </span>
          </div>
        </div>
      </div>

      <template v-for="catGroup in categorizedGroups" :key="catGroup.id ?? '__sin_cat__'">
        <CatalogCatSep
          v-if="catGroup.id"
          :cat-id="catGroup.id"
          :cat-name="catGroup.category"
          :show-migrate="false"
          @delete="handleDeleteCat(catGroup.id)"
          @renamed="(n) => handleRenameCat(catGroup.id, n)"
        />
        <p v-else-if="catGroup.category" class="section-label">{{ catGroup.category }}</p>
        <BrandRow
          v-for="group in catGroup.groups"
          :key="group.brand.id"
          :brand="group.brand"
          :to="`/catalog/batch/${encodeURIComponent(folder.batchNumber)}/${group.brand.id}`"
          :meta="`${group.items.length} ${group.items.length === 1 ? 'producto' : 'productos'}`"
        />
      </template>

      <div class="spacer--sm"></div>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore }        from '../stores/products.js'
import { useBrandCategoriesStore } from '../stores/brandCategories.js'
import TopBar        from '../components/layout/TopBar.vue'
import BottomNav     from '../components/layout/BottomNav.vue'
import BrandRow      from '../components/ui/BrandRow.vue'
import CatalogCatSep from '../components/ui/CatalogCatSep.vue'

const route    = useRoute()
const router   = useRouter()
const store    = useProductsStore()
const catStore = useBrandCategoriesStore()

const folder = computed(() =>
  store.getBatchFolder(decodeURIComponent(route.params.batchNumber))
)

const totalItems = computed(() =>
  folder.value
    ? folder.value.brandGroups.reduce((sum, g) => sum + g.items.length, 0)
    : 0
)

const categorizedGroups = computed(() => {
  if (!folder.value) return []
  const result = []
  const seen   = new Map()
  for (const group of folder.value.brandGroups) {
    const catResult = catStore.getCategoryForBrand(group.brand.id)
    const catName   = catResult?.name ?? ''
    const catId     = catResult?.id   ?? null
    const key       = catId ?? '__sin_cat__'
    if (!seen.has(key)) {
      const entry = { id: catId, category: catName, groups: [] }
      seen.set(key, entry)
      result.push(entry)
    }
    seen.get(key).groups.push(group)
  }
  return result
})

watch(folder, (val, oldVal) => {
  if (oldVal && !val) router.push('/catalog?tab=batches')
})

function handleDeleteCat(id) {
  catStore.markDeleteCat(id)
}

function handleRenameCat(id, newName) {
  catStore.renameCategory(id, newName)
}

function formatExpiry(yyyymm) {
  if (!yyyymm) return ''
  const [year, month] = yyyymm.split('-')
  return `${month}/${year}`
}

function expiryBadgeClass(yyyymm) {
  if (!yyyymm) return 'badge--ok'
  const expiry   = new Date(`${yyyymm}-01`)
  const now      = new Date()
  const diffDays = (expiry - now) / (1000 * 60 * 60 * 24)
  if (diffDays < 0)   return 'badge--out'
  if (diffDays < 60)  return 'badge--expiry'
  if (diffDays < 180) return 'badge--low'
  return 'badge--ok'
}

function expiryBadgeLabel(yyyymm) {
  if (!yyyymm) return 'S/F'
  const expiry   = new Date(`${yyyymm}-01`)
  const now      = new Date()
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
  if (diffDays < 0)   return 'Vencido'
  if (diffDays < 60)  return `${diffDays}d`
  if (diffDays < 180) return 'Próximo'
  return 'OK'
}
</script>