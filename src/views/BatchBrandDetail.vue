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
        <div class="brand-summary__icon">
          <i :class="`ti ${brand.ic}`" :style="{ color: brand.col }" aria-hidden="true"></i>
        </div>
        <div>
          <div class="brand-summary__name">{{ brand.name }}</div>
          <div class="brand-summary__meta">
            {{ batchItems.length }} {{ batchItems.length === 1 ? 'producto' : 'productos' }}
          </div>
        </div>
        <button
          class="brand-summary__add-btn"
          type="button"
          aria-label="Nuevo producto"
          @click="goNewProduct"
        >
          <i class="ti ti-plus" aria-hidden="true"></i>
        </button>
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
          :class="{ 'cat-accordion__header--migrating': migratingCat === (group.cat ?? '__sin_cat__') }"
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

          <!-- Gear: categorías con nombre (renombrar, eliminar, migrar) -->
          <CatalogCatSep
            v-if="group.cat"
            :cat-id="group.cat"
            :cat-name="group.cat"
            :show-migrate="true"
            :is-migrating="migratingCat === group.cat"
            migrate-label="Migrar productos"
            variant="icon-only"
            @click.stop
            @delete="handleDeleteCat(group.cat)"
            @renamed="(n) => handleRenameCat(group.cat, n)"
            @toggle-migrate="toggleMigrateMode(group.cat)"
          />
          <!-- Gear: sin categoría (solo migrar, si hay productos) -->
          <CatalogCatSep
            v-else-if="group.items.length > 0"
            cat-id="__sin_cat__"
            cat-name="Sin categoría"
            :show-migrate="true"
            :show-delete="false"
            :show-edit="false"
            migrate-label="Migrar productos"
            :is-migrating="migratingCat === '__sin_cat__'"
            variant="icon-only"
            @click.stop
            @toggle-migrate="toggleMigrateMode('__sin_cat__')"
          />

          <i class="ti ti-chevron-down cat-accordion__chevron" aria-hidden="true"></i>
        </div>

        <div
          :id="`batch-cat-body-${group.cat ?? '__sin_cat__'}`"
          class="cat-accordion__body"
          role="region"
          :aria-label="group.cat ?? 'Sin categoría'"
        >
          <!-- Modo normal -->
          <template v-if="!migratingCat || migratingCat !== (group.cat ?? '__sin_cat__')">
            <ProductCard
              v-for="item in group.items"
              :key="item.id"
              :product="getProduct(item.productId)"
              :show-actions="true"
              :batch-context="{ itemId: item.id, batchNum: batchNumber, brandId: brandId }"
              @remove="store.markDeleteBatchItem($event)"
            />
          </template>

          <!-- Modo migración: selección de productos -->
          <template v-else>
            <div
              v-for="item in group.items"
              :key="item.id"
              class="brand-row brand-row--selectable"
              :class="{ 'brand-row--selected': selectedProductIds.has(item.id) }"
              role="checkbox"
              :aria-checked="String(selectedProductIds.has(item.id))"
              :aria-label="getProduct(item.productId)?.name"
              tabindex="0"
              @click="toggleProductSelect(item.id)"
              @keydown.enter.prevent="toggleProductSelect(item.id)"
              @keydown.space.prevent="toggleProductSelect(item.id)"
            >
              <div class="brand-row__body">
                <div class="brand-row__header">
                  <div class="brand-row__check">
                    <i
                      class="ti"
                      :class="selectedProductIds.has(item.id) ? 'ti-circle-check' : 'ti-circle'"
                      aria-hidden="true"
                    ></i>
                  </div>
                  <div class="brand-row__icon" :style="{ background: brand?.bg }">
                    <i :class="`ti ${brand?.ic ?? 'ti-box'}`" :style="{ color: brand?.col }" aria-hidden="true"></i>
                  </div>
                  <div class="brand-row__info">
                    <div class="brand-row__name">{{ getProduct(item.productId)?.name }}</div>
                    <div class="brand-row__meta">{{ getProduct(item.productId)?.size }}</div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div class="spacer--sm"></div>
    </div>

    <!-- Barra de migración -->
    <Transition name="fab-menu">
      <div v-if="migratingCat" class="catalog__migrate-bar">
        <span class="catalog__migrate-count">
          {{ selectedProductIds.size }} producto{{ selectedProductIds.size !== 1 ? 's' : '' }}
        </span>
        <div class="catalog__migrate-actions">
          <button
            class="btn btn--ghost btn--sm"
            :aria-label="isAllSelected ? 'Deseleccionar todos' : 'Seleccionar todos'"
            @click="toggleSelectAll"
          >
            <i class="ti" :class="isAllSelected ? 'ti-square-minus' : 'ti-select-all'" aria-hidden="true"></i>
            {{ isAllSelected ? 'Ninguno' : 'Todos' }}
          </button>
          <button class="btn btn--secondary btn--sm" @click="cancelMigrate">Cancelar</button>
          <button
            class="btn btn--primary btn--sm"
            :disabled="selectedProductIds.size === 0"
            @click="openMigrateSheet"
          >
            Migrar
          </button>
        </div>
      </div>
    </Transition>

    <BottomNav />

    <!-- Sheet: destino de migración -->
    <Transition name="sheet">
      <div
        v-if="showMigrateSheet"
        class="sheet-overlay"
        role="dialog"
        aria-label="Mover productos"
        @click.self="showMigrateSheet = false"
      >
        <div class="sheet">
          <div class="sheet__handle" aria-hidden="true"></div>
          <div class="sheet__header">
            <div class="sheet__title">Mover productos</div>
            <div class="sheet__sub">
              {{ selectedProductIds.size }} producto{{ selectedProductIds.size !== 1 ? 's' : '' }} de
              "{{ migratingCat === '__sin_cat__' ? 'Sin categoría' : migratingCat }}" pasarán a la categoría que elijas.
            </div>
          </div>
          <div class="sheet__body">
            <p class="sheet__section-label">Destino</p>
            <div class="catalog__migrate-dest-list" role="listbox" aria-label="Categoría destino">
              <button
                v-for="cat in migrationTargets"
                :key="cat"
                class="catalog__migrate-dest-item"
                :class="{ 'catalog__migrate-dest-item--selected': migrateTarget === cat }"
                role="option"
                :aria-selected="migrateTarget === cat"
                @click="migrateTarget = cat"
              >
                <span>{{ cat }}</span>
                <i v-if="migrateTarget === cat" class="ti ti-check" aria-hidden="true"></i>
              </button>
              <button
                class="catalog__migrate-dest-item"
                :class="{ 'catalog__migrate-dest-item--selected': migrateTarget === '__sin_cat__' }"
                role="option"
                :aria-selected="migrateTarget === '__sin_cat__'"
                @click="migrateTarget = '__sin_cat__'"
              >
                <span style="opacity: 0.6">Sin categoría</span>
                <i v-if="migrateTarget === '__sin_cat__'" class="ti ti-check" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <div class="btn-group">
            <button
              class="btn btn--primary"
              :disabled="!migrateTarget"
              @click="confirmMigrate"
            >
              <i class="ti ti-arrows-exchange" aria-hidden="true"></i>
              Mover productos
            </button>
            <button class="btn btn--secondary" @click="showMigrateSheet = false">Cancelar</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Ajustes sheet -->    <Transition name="sheet">
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
import { useProductMigration }   from '../composables/useProductMigration.js'
import TopBar     from '../components/layout/TopBar.vue'
import BottomNav  from '../components/layout/BottomNav.vue'
import ProductCard    from '../components/ui/ProductCard.vue'
import CatalogCatSep from '../components/ui/CatalogCatSep.vue'

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

// ─── NUEVO PRODUCTO ───────────────────────────────────────────────────────────

function goNewProduct() {
  router.push({
    path : '/product/new',
    query: { bid: brandId.value, batchNumber: batchNumber.value },
  })
}

// ─── MIGRACIÓN DE PRODUCTOS ──────────────────────────────────────────────────

const {
  migratingCat,
  selectedProductIds,
  showMigrateSheet,
  migrateTarget,
  migrationTargets,
  currentGroupItems,
  isAllSelected,
  toggleSelectAll,
  toggleMigrateMode,
  cancelMigrate,
  toggleProductSelect,
  openMigrateSheet,
  confirmMigrate,
} = useProductMigration({
  categorizedGroups: categorizedBatchItems,
  existingCats,
  onConfirmMigrate: (target, selectedIds) => {
    const targetCat = target === '__sin_cat__' ? '' : target
    for (const itemId of selectedIds) {
      const item = batchItems.value.find(b => b.id === itemId)
      if (!item) continue
      const product = getProduct(item.productId)
      if (product) product.category = targetCat
    }
  },
})

function handleDeleteCat(cat) {
  store.markDeleteCategoryInBrand(brandId.value, cat)
  if (migratingCat.value === cat) cancelMigrate()
}

function handleRenameCat(oldName, newName) {
  store.renameCategoryInBrand(brandId.value, oldName, newName)
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

// ─── REDIRECT SI QUEDAN 0 ITEMS ──────────────────────────────────────────────

watch(batchItems, (items, oldItems) => {
  if (oldItems?.length > 0 && items.length === 0) {
    router.push(`/catalog/batch/${encodeURIComponent(batchNumber.value)}`)
  }
})
</script>