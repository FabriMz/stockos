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

      <!-- Buscador dentro de la marca (lote) -->
      <div class="brand-search">
        <i class="ti ti-search brand-search__icon" aria-hidden="true"></i>
        <input
          id="batch-brand-search"
          name="batch-brand-search"
          class="brand-search__input"
          type="search"
          v-model="searchQuery"
          placeholder="Buscar producto..."
          autocomplete="off"
          aria-label="Buscar producto en esta marca del lote"
        />
        <button
          v-if="searchQuery"
          class="brand-search__clear"
          type="button"
          aria-label="Limpiar búsqueda"
          @click="searchQuery = ''"
        >
          <i class="ti ti-x" aria-hidden="true"></i>
        </button>
      </div>

      <!-- Barra de acciones -->
      <div class="brand-toolbar">
        <button
          class="brand-toolbar__btn"
          aria-label="Expandir todas las categorías"
          @click="expandAll"
        >
          <i class="ti ti-arrows-vertical" aria-hidden="true"></i>
          <span>Expandir</span>
        </button>
        <button
          class="brand-toolbar__btn"
          aria-label="Colapsar todas las categorías"
          @click="collapseAll"
        >
          <i class="ti ti-layout-distribute-vertical" aria-hidden="true"></i>
          <span>Colapsar</span>
        </button>
        <button
          class="brand-toolbar__btn"
          :class="{ 'brand-toolbar__btn--active': showSettingsSheet }"
          aria-label="Ajustes de categorías"
          :aria-expanded="String(showSettingsSheet)"
          @click="openSettingsSheet"
        >
          <i class="ti ti-settings" aria-hidden="true"></i>
          <span>Ajustes</span>
        </button>
      </div>

      <!-- Productos agrupados por categoría -->
      <div
        v-for="group in categorizedBatchItems"
        :key="group.cat ?? '__sin_cat__'"
        class="cat-accordion"
        :class="{ 'cat-accordion--open': catOpen.isOpen(brandId, group.cat ?? '__sin_cat__') }"
      >
        <div
          class="cat-accordion__header"
          role="button"
          tabindex="0"
          :aria-expanded="String(catOpen.isOpen(brandId, group.cat ?? '__sin_cat__'))"
          :aria-controls="`batch-cat-body-${group.cat ?? '__sin_cat__'}`"
          :aria-label="catOpen.isOpen(brandId, group.cat ?? '__sin_cat__')
            ? `Colapsar ${group.cat ?? 'Sin categoría'}`
            : `Expandir ${group.cat ?? 'Sin categoría'}`"
          @click="catOpen.toggle(brandId, group.cat ?? '__sin_cat__')"
          @keydown.enter.prevent="catOpen.toggle(brandId, group.cat ?? '__sin_cat__')"
          @keydown.space.prevent="catOpen.toggle(brandId, group.cat ?? '__sin_cat__')"
        >
          <span class="cat-accordion__title">{{ group.cat ?? 'Sin categoría' }}</span>
          <span class="cat-accordion__dots" aria-hidden="true"></span>
          <span class="cat-accordion__count" :aria-label="`${group.items.length} productos`">{{ group.items.length }}</span>
          <i class="ti ti-chevron-down cat-accordion__chevron" aria-hidden="true"></i>
        </div>

        <div
          :id="`batch-cat-body-${group.cat ?? '__sin_cat__'}`"
          class="cat-accordion__body"
          role="region"
          :aria-label="group.cat ?? 'Sin categoría'"
        >
          <ProductCard
            v-for="item in group.items"
            :key="item.id"
            :product="getProduct(item.productId)"
            :show-actions="true"
            :batch-context="{ itemId: item.id, batchNum: batchNumber }"
            @remove="store.markDeleteBatchItem($event)"
          />
        </div>
      </div>

      <div class="spacer--sm"></div>
    </div>

    <BottomNav />

    <!-- Ajustes sheet -->
    <Transition name="sheet">
      <div
        v-if="showSettingsSheet"
        class="sheet-overlay"
        role="dialog"
        aria-label="Ajustes de categorías"
        @click.self="closeSettingsSheet"
      >
        <div class="sheet sheet--tall">
          <div class="sheet__handle" aria-hidden="true"></div>
          <div class="sheet__header">
            <div class="sheet__title">Ajustes</div>
            <div class="sheet__sub">Renombra o elimina categorías de productos</div>
          </div>

          <div class="sheet__body sheet__body--scroll">
            <div class="topbar__search settings-sheet__search">
              <i class="ti ti-search" aria-hidden="true"></i>
              <input
                id="batch-brand-settings-search"
                name="batch-brand-settings-search"
                type="search"
                v-model="settingsSearchQuery"
                placeholder="Buscar categorías…"
                aria-label="Buscar categorías"
              />
              <button
                v-if="settingsSearchQuery"
                class="topbar__search-clear"
                type="button"
                @click="settingsSearchQuery = ''"
                aria-label="Limpiar búsqueda"
              >
                <i class="ti ti-x" aria-hidden="true"></i>
              </button>
            </div>

            <p class="settings-sheet__section-label">
              <i class="ti ti-folder" aria-hidden="true"></i>
              Categorías de productos
            </p>
            <div class="settings-sheet__list" role="list">
              <div
                v-for="cat in filteredSettingsCategories"
                :key="cat"
                class="settings-sheet__item"
                role="listitem"
              >
                <template v-if="settingsEditingCat === cat">
                  <input
                    :id="`batch-brand-cat-edit-${cat}`"
                    :name="`batch-brand-cat-edit-${cat}`"
                    class="settings-sheet__edit-input"
                    v-model="settingsEditValue"
                    autocomplete="off"
                    :ref="el => { if (el) settingsInputRefs[cat] = el }"
                    @keydown.enter.prevent="confirmCatRename(cat)"
                    @keydown.escape="cancelSettingsEdit"
                  />
                  <span v-if="settingsEditError" class="settings-sheet__edit-error" role="alert">{{ settingsEditError }}</span>
                  <div class="settings-sheet__item-actions">
                    <button class="settings-sheet__confirm-btn" aria-label="Confirmar" @click="confirmCatRename(cat)">
                      <i class="ti ti-check" aria-hidden="true"></i>
                    </button>
                    <button class="settings-sheet__cancel-btn" aria-label="Cancelar" @click="cancelSettingsEdit">
                      <i class="ti ti-x" aria-hidden="true"></i>
                    </button>
                  </div>
                </template>
                <template v-else>
                  <div class="settings-sheet__item-icon settings-sheet__item-icon--cat">
                    <i class="ti ti-folder" aria-hidden="true"></i>
                  </div>
                  <div class="settings-sheet__item-info">
                    <span class="settings-sheet__item-name">{{ cat }}</span>
                    <span class="settings-sheet__item-meta">
                      {{ batchItemsInCat(cat) }} {{ batchItemsInCat(cat) === 1 ? 'producto' : 'productos' }}
                    </span>
                  </div>
                  <div class="settings-sheet__item-actions">
                    <button
                      class="settings-sheet__action-btn"
                      :aria-label="`Renombrar ${cat}`"
                      @click="startCatEdit(cat)"
                    >
                      <i class="ti ti-pencil" aria-hidden="true"></i>
                    </button>
                    <button
                      class="settings-sheet__action-btn settings-sheet__action-btn--danger"
                      :aria-label="`Eliminar ${cat}`"
                      @click="handleDeleteCat(cat)"
                    >
                      <i class="ti ti-trash" aria-hidden="true"></i>
                    </button>
                  </div>
                </template>
              </div>
              <div v-if="filteredSettingsCategories.length === 0" class="settings-sheet__empty">
                No se encontraron categorías
              </div>
            </div>
          </div>

          <div class="btn-group">
            <button class="btn btn--secondary" @click="closeSettingsSheet">Cerrar</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore }      from '../stores/products.js'
import { useProductCatOpenStore } from '../stores/productCatOpen.js'
import TopBar     from '../components/layout/TopBar.vue'
import BottomNav  from '../components/layout/BottomNav.vue'
import ProductCard from '../components/ui/ProductCard.vue'

const route  = useRoute()
const router = useRouter()
const store  = useProductsStore()
const catOpen = useProductCatOpenStore()

const batchNumber = computed(() => decodeURIComponent(route.params.batchNumber))
const brandId     = computed(() => route.params.brandId)
const brand       = computed(() => store.getBrand(brandId.value))
const batchItems  = computed(() => store.getBatchItemsByBrand(brandId.value, batchNumber.value))

const getProduct = id => store.getProduct(id)

// ─── BÚSQUEDA ────────────────────────────────────────────────────────────────

const searchQuery = ref('')

// ─── CATEGORÍAS ──────────────────────────────────────────────────────────────

const existingCats = computed(() =>
  store.getCategoriesForBrand(brandId.value)
)

// ─── AGRUPACIÓN POR CATEGORÍA ────────────────────────────────────────────────

const categorizedBatchItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const groups = new Map()

  // Inicializar categorías registradas (incluidas las vacías)
  for (const cat of existingCats.value) {
    groups.set(cat, [])
  }

  // Distribuir items según la categoría del producto referenciado
  for (const item of batchItems.value) {
    const product = getProduct(item.productId)
    const cat = product?.category?.trim() || null

    if (cat && groups.has(cat)) {
      groups.get(cat).push(item)
    } else if (cat && !groups.has(cat)) {
      groups.set(cat, [item])
    } else {
      if (!groups.has(null)) groups.set(null, [])
      groups.get(null).push(item)
    }
  }

  const result = []

  // Categorías con nombre, ordenadas
  const namedCats = [...groups.keys()]
    .filter(k => k !== null)
    .sort((a, b) => a.localeCompare(b, 'es'))

  for (const cat of namedCats) {
    const items = q
      ? groups.get(cat).filter(item => getProduct(item.productId)?.name?.toLowerCase().includes(q))
      : groups.get(cat)
    result.push({ cat, items })
  }

  // Sin categoría al final
  if (groups.has(null)) {
    const items = q
      ? groups.get(null).filter(item => getProduct(item.productId)?.name?.toLowerCase().includes(q))
      : groups.get(null)
    result.push({ cat: null, items })
  }

  // Con búsqueda activa, omitir grupos vacíos
  if (q) return result.filter(g => g.items.length > 0)

  return result
})

// ─── EXPAND / COLLAPSE ───────────────────────────────────────────────────────

function allCatKeys() {
  return categorizedBatchItems.value.map(g => g.cat ?? '__sin_cat__')
}

function expandAll() {
  catOpen.setAllForBrand(brandId.value, allCatKeys(), true)
}

function collapseAll() {
  catOpen.setAllForBrand(brandId.value, allCatKeys(), false)
}

// ─── AJUSTES SHEET ───────────────────────────────────────────────────────────

const showSettingsSheet   = ref(false)
const settingsSearchQuery = ref('')
const settingsEditingCat  = ref(null)
const settingsEditValue   = ref('')
const settingsEditError   = ref('')
const settingsInputRefs   = {}

const filteredSettingsCategories = computed(() => {
  const q = settingsSearchQuery.value.trim().toLowerCase()
  return q
    ? existingCats.value.filter(cat => cat.toLowerCase().includes(q))
    : existingCats.value
})

function batchItemsInCat(cat) {
  return batchItems.value.filter(item => {
    const p = getProduct(item.productId)
    return (p?.category?.trim() || null) === cat
  }).length
}

function openSettingsSheet() {
  settingsSearchQuery.value = ''
  settingsEditingCat.value  = null
  settingsEditValue.value   = ''
  settingsEditError.value   = ''
  showSettingsSheet.value   = true
}

function closeSettingsSheet() {
  showSettingsSheet.value   = false
  settingsSearchQuery.value = ''
  settingsEditingCat.value  = null
  settingsEditValue.value   = ''
  settingsEditError.value   = ''
}

function startCatEdit(cat) {
  settingsEditingCat.value = cat
  settingsEditValue.value  = cat
  settingsEditError.value  = ''
  nextTick(() => settingsInputRefs[cat]?.focus())
}

function cancelSettingsEdit() {
  settingsEditingCat.value = null
  settingsEditValue.value  = ''
  settingsEditError.value  = ''
}

function confirmCatRename(oldName) {
  const newName = settingsEditValue.value.trim()
  if (!newName) {
    settingsEditError.value = 'El nombre no puede quedar vacío'
    return
  }
  if (newName !== oldName && existingCats.value.includes(newName)) {
    settingsEditError.value = 'Ya existe una categoría con ese nombre'
    return
  }
  store.renameCategoryInBrand(brandId.value, oldName, newName)
  cancelSettingsEdit()
}

function handleDeleteCat(cat) {
  store.markDeleteCategoryInBrand(brandId.value, cat)
}

// ─── REDIRECT SI QUEDAN 0 ITEMS ──────────────────────────────────────────────

watch(batchItems, (items, oldItems) => {
  if (oldItems?.length > 0 && items.length === 0) {
    router.push(`/catalog/batch/${encodeURIComponent(batchNumber.value)}`)
  }
})
</script>