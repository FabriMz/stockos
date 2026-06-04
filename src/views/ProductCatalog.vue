<template>
  <div class="screen">
    <TopBar
      variant="back"
      back-label="Catálogo"
      back-to="/catalog"
      :title="brand?.name || ''"
    />

    <div class="scroll-content">
      <div v-if="brand" class="brand-summary">
        <div class="brand-summary__icon" :style="{ background: brand.bg }">
          <i :class="`ti ${brand.ic}`" :style="{ color: brand.col }" aria-hidden="true"></i>
        </div>
        <div>
          <div class="brand-summary__name">{{ brand.name }} · {{ brand.origin }}</div>
          <div class="brand-summary__meta">{{ products.length }} productos</div>
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

      <!-- Buscador dentro de la marca -->
      <div class="brand-search">
        <i class="ti ti-search brand-search__icon" aria-hidden="true"></i>
        <input
          class="brand-search__input"
          id="brand-search"
          name="brand-search"
          type="search"
          v-model="searchQuery"
          placeholder="Buscar producto…"
          autocomplete="off"
          aria-label="Buscar producto en esta marca"
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

      <!-- Barra de acciones de la marca -->
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
          ref="brandGearRef"
          class="brand-toolbar__btn"
          :class="{ 'brand-toolbar__btn--active': brandMenuOpen }"
          aria-label="Ajustes de categorías"
          :aria-expanded="String(brandMenuOpen)"
          :aria-haspopup="true"
          @click.stop="toggleBrandMenu"
        >
          <i class="ti ti-settings" aria-hidden="true"></i>
          <span>Ajustes</span>
        </button>
      </div>

      <!-- Productos agrupados por categoría -->
      <div
        v-for="group in categorizedProducts"
        :key="group.cat ?? '__sin_cat__'"
        class="cat-accordion"
        :class="{ 'cat-accordion--open': catOpen.isOpen(route.params.brandId, group.cat ?? '__sin_cat__') }"
      >

        <!-- Header del acordeón -->
        <div
          class="cat-accordion__header"
          :class="{ 'cat-accordion__header--migrating': migratingCat === (group.cat ?? '__sin_cat__') }"
          role="button"
          tabindex="0"
          :aria-expanded="String(catOpen.isOpen(route.params.brandId, group.cat ?? '__sin_cat__'))"
          :aria-controls="`cat-body-${group.cat ?? '__sin_cat__'}`"
          :aria-label="catOpen.isOpen(route.params.brandId, group.cat ?? '__sin_cat__') ? `Colapsar ${group.cat ?? 'Sin categoría'}` : `Expandir ${group.cat ?? 'Sin categoría'}`"
          @click="catOpen.toggle(route.params.brandId, group.cat ?? '__sin_cat__')"
          @keydown.enter.prevent="catOpen.toggle(route.params.brandId, group.cat ?? '__sin_cat__')"
          @keydown.space.prevent="catOpen.toggle(route.params.brandId, group.cat ?? '__sin_cat__')"
        >
          <span class="cat-accordion__title">{{ group.cat ?? 'Sin categoría' }}</span>
          <span class="cat-accordion__dots" aria-hidden="true"></span>
          <span class="cat-accordion__count" :aria-label="`${group.items.length} productos`">{{ group.items.length }}</span>

          <!-- Gear: solo para categorías con nombre, detiene propagación -->
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

        <!-- Cuerpo colapsable -->
        <div
          :id="`cat-body-${group.cat ?? '__sin_cat__'}`"
          class="cat-accordion__body"
          role="region"
          :aria-label="group.cat ?? 'Sin categoría'"
        >
          <!-- Modo normal -->
          <template v-if="!migratingCat || migratingCat !== (group.cat ?? '__sin_cat__')">
            <ProductCard
              v-for="p in group.items"
              :key="p.id"
              :product="p"
              :show-actions="true"
              @clone="openCloneSheet"
            />
          </template>

          <!-- Modo migración: selección de productos -->
          <template v-else>
            <div
              v-for="p in group.items"
              :key="p.id"
              class="brand-row brand-row--selectable"
              :class="{ 'brand-row--selected': selectedProductIds.has(p.id) }"
              role="checkbox"
              :aria-checked="String(selectedProductIds.has(p.id))"
              :aria-label="p.name"
              tabindex="0"
              @click="toggleProductSelect(p.id)"
              @keydown.enter.prevent="toggleProductSelect(p.id)"
              @keydown.space.prevent="toggleProductSelect(p.id)"
            >
              <div class="brand-row__body">
                <div class="brand-row__header">
                  <div class="brand-row__check">
                    <i
                      class="ti"
                      :class="selectedProductIds.has(p.id) ? 'ti-circle-check' : 'ti-circle'"
                      aria-hidden="true"
                    ></i>
                  </div>
                  <div class="brand-row__icon" :style="{ background: store.getBrand(p.bid)?.bg }">
                    <img
                      v-if="p.img"
                      :src="p.img"
                      :alt="p.name"
                      class="brand-row__icon-img"
                      @error="$event.target.style.display = 'none'"
                    />
                    <i
                      v-else
                      :class="`ti ${store.getBrand(p.bid)?.ic}`"
                      :style="{ color: store.getBrand(p.bid)?.col }"
                      aria-hidden="true"
                    ></i>
                  </div>
                  <div class="brand-row__info">
                    <div class="brand-row__name">{{ p.name }}</div>
                    <div class="brand-row__meta">{{ p.size }}</div>
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

    <!-- Menú ruedita de marca -->
    <Teleport to="body">
      <div v-if="brandMenuOpen" class="cat-sep-backdrop" @click="brandMenuOpen = false" aria-hidden="true"></div>
      <Transition name="cat-sep-menu">
        <div
          v-if="brandMenuOpen"
          class="cat-sep-menu"
          :style="brandMenuStyle"
          role="menu"
          @click.stop
          :aria-label="`Opciones de ${brand?.name}`"
        >
          <div class="cat-sep-menu__item">
            <button
              class="cat-sep-menu__btn"
              role="menuitem"
              aria-label="Nueva categoría"
              @click="openNewCatSheet"
            >
              <i class="ti ti-folder-plus" aria-hidden="true"></i>
              <span>Nueva categoría</span>
            </button>
          </div>
          <div class="cat-sep-menu__item">
            <button
              class="cat-sep-menu__btn cat-sep-menu__btn--danger"
              role="menuitem"
              aria-label="Eliminar categorías"
              :disabled="existingCats.length === 0"
              @click="openDeleteCatsPanel"
            >
              <i class="ti ti-trash" aria-hidden="true"></i>
              <span>Eliminar categorías</span>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Sheet: nueva categoría -->
    <Transition name="sheet">
      <div
        v-if="showNewCatSheet"
        class="sheet-overlay"
        role="dialog"
        aria-label="Nueva categoría"
        @click.self="closeNewCatSheet"
      >
        <div class="sheet">
          <div class="sheet__handle" aria-hidden="true"></div>
          <div class="sheet__header">
            <div class="sheet__title">Nueva categoría</div>
            <div class="sheet__sub">Se creará dentro de {{ brand?.name }}</div>
          </div>
          <div class="sheet__body">
            <div
              v-for="(entry, idx) in newCatEntries"
              :key="entry.id"
              class="form-group"
            >
              <label class="form-label" :for="`pc-new-cat-name-${entry.id}`">
                {{ newCatEntries.length > 1 ? `Categoría ${idx + 1}` : 'Nombre' }}
              </label>
              <div class="new-cat-row">
                <input
                  :id="`pc-new-cat-name-${entry.id}`"
                  :name="`pc-new-cat-name-${entry.id}`"
                  class="form-input"
                  v-model="entry.value"
                  placeholder="Ej: Aceites"
                  autocomplete="off"
                  :ref="el => { if (el && idx === newCatEntries.length - 1) newCatInputRef = el }"
                  @keydown.enter.prevent="idx === newCatEntries.length - 1 ? addNewCatEntry() : focusEntry(idx + 1)"
                  @keydown.escape="closeNewCatSheet"
                />
                <button
                  v-if="newCatEntries.length > 1"
                  type="button"
                  class="new-cat-row__remove"
                  :aria-label="`Quitar categoría ${idx + 1}`"
                  @click="removeNewCatEntry(idx)"
                >
                  <i class="ti ti-x" aria-hidden="true"></i>
                </button>
              </div>
              <span v-if="entry.error" class="form-hint form-hint--error" role="alert">{{ entry.error }}</span>
            </div>

            <button
              type="button"
              class="btn btn--ghost btn--sm new-cat-add-btn"
              @click="addNewCatEntry"
            >
              <i class="ti ti-plus" aria-hidden="true"></i>
              Agregar otra
            </button>
          </div>
          <div class="btn-group btn-group--row">
            <button class="btn btn--secondary" @click="closeNewCatSheet">Cancelar</button>
            <button class="btn btn--primary" @click="handleCreateCat">
              <i class="ti ti-plus" aria-hidden="true"></i>
              {{ newCatEntries.length > 1 ? `Crear ${newCatEntries.length}` : 'Crear categoría' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Sheet: eliminar categorías (selección múltiple) -->
    <Transition name="sheet">
      <div
        v-if="showDeleteCatsPanel"
        class="sheet-overlay"
        role="dialog"
        aria-label="Eliminar categorías"
        @click.self="showDeleteCatsPanel = false"
      >
        <div class="sheet">
          <div class="sheet__handle" aria-hidden="true"></div>
          <div class="sheet__header">
            <div class="sheet__title">Eliminar categorías</div>
            <div class="sheet__sub">Los productos afectados quedarán sin categoría.</div>
          </div>
          <div class="sheet__body">
            <div class="catalog__migrate-dest-list" role="group" aria-label="Seleccionar categorías a eliminar">
              <button
                v-for="cat in existingCats"
                :key="cat"
                class="catalog__migrate-dest-item"
                :class="{ 'catalog__migrate-dest-item--selected': catsToDelete.has(cat) }"
                role="checkbox"
                :aria-checked="String(catsToDelete.has(cat))"
                @click="toggleCatToDelete(cat)"
              >
                <span>{{ cat }}</span>
                <i
                  v-if="catsToDelete.has(cat)"
                  class="ti ti-check"
                  aria-hidden="true"
                ></i>
              </button>
            </div>
          </div>
          <div class="btn-group btn-group--row">
            <button class="btn btn--secondary" @click="showDeleteCatsPanel = false">Cancelar</button>
            <button
              class="btn btn--danger"
              :disabled="catsToDelete.size === 0"
              @click="handleDeleteCats"
            >
              <i class="ti ti-trash" aria-hidden="true"></i>
              Eliminar {{ catsToDelete.size > 0 ? `(${catsToDelete.size})` : '' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

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

    <CloneSheet
      v-model="showSheet"
      :product="cloneTarget"
      @confirm="handleCloneConfirm"
      @cancel="showSheet = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore }      from '../stores/products.js'
import { useProductCatOpenStore } from '../stores/productCatOpen.js'
import TopBar        from '../components/layout/TopBar.vue'
import BottomNav     from '../components/layout/BottomNav.vue'
import ProductCard   from '../components/ui/ProductCard.vue'
import CloneSheet    from '../components/ui/CloneSheet.vue'
import CatalogCatSep from '../components/ui/CatalogCatSep.vue'

const route    = useRoute()
const router   = useRouter()
const store    = useProductsStore()
const catOpen  = useProductCatOpenStore()

const brand    = computed(() => store.getBrand(route.params.brandId))
const products = computed(() => store.getByBrand(route.params.brandId))

// ─── Nuevo producto directo a esta marca ──────────────────────────────────────

function goNewProduct() {
  router.push({
    path : '/product/new',
    query: { bid: route.params.brandId },
  })
}

const searchQuery = ref('')

// ─── Categorías existentes en esta marca ─────────────────────────────────────

const existingCats = computed(() =>
  store.getCategoriesForBrand(route.params.brandId)
)

// ─── Agrupación por categoría ─────────────────────────────────────────────────

const categorizedProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const groups = new Map()

  // Inicializar todas las categorías de la marca (incluidas las vacías)
  for (const cat of existingCats.value) {
    groups.set(cat, [])
  }

  // Distribuir productos
  for (const p of products.value) {
    const cat = p.category?.trim() || null
    if (cat && groups.has(cat)) {
      groups.get(cat).push(p)
    } else if (cat && !groups.has(cat)) {
      // Categoría que existe en producto pero no en la lista — la añadimos
      groups.set(cat, [p])
    } else {
      // Sin categoría
      if (!groups.has(null)) groups.set(null, [])
      groups.get(null).push(p)
    }
  }

  const result = []

  // Categorías con nombre, ordenadas
  const namedCats = [...groups.keys()]
    .filter(k => k !== null)
    .sort((a, b) => a.localeCompare(b, 'es'))

  for (const cat of namedCats) {
    const items = q
      ? groups.get(cat).filter(p => p.name?.toLowerCase().includes(q))
      : groups.get(cat)
    result.push({ cat, items })
  }

  // Sin categoría al final
  if (groups.has(null)) {
    const items = q
      ? groups.get(null).filter(p => p.name?.toLowerCase().includes(q))
      : groups.get(null)
    result.push({ cat: null, items })
  }

  // Con búsqueda activa, omitir grupos vacíos (no mostrar separadores vacíos)
  if (q) return result.filter(g => g.items.length > 0)

  return result
})

// ─── Expand / Collapse all ────────────────────────────────────────────────────

function allCatKeys() {
  return categorizedProducts.value.map(g => g.cat ?? '__sin_cat__')
}

function expandAll() {
  catOpen.setAllForBrand(route.params.brandId, allCatKeys(), true)
}

function collapseAll() {
  catOpen.setAllForBrand(route.params.brandId, allCatKeys(), false)
}

// ─── Ruedita de marca ─────────────────────────────────────────────────────────

const brandGearRef   = ref(null)
const brandMenuOpen  = ref(false)
const brandMenuStyle = ref({})

function toggleBrandMenu() {
  if (brandMenuOpen.value) {
    brandMenuOpen.value = false
    return
  }
  const btn = brandGearRef.value
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  brandMenuStyle.value = {
    top  : `${rect.bottom + 6}px`,
    right: `${window.innerWidth - rect.right}px`,
  }
  brandMenuOpen.value = true
}

// ─── Nueva categoría ─────────────────────────────────────────────────────────

let _entryCtr = 0
function makeEntry() { return { id: ++_entryCtr, value: '', error: '' } }

const showNewCatSheet = ref(false)
const newCatEntries   = ref([makeEntry()])
const newCatInputRef  = ref(null)

function openNewCatSheet() {
  brandMenuOpen.value   = false
  newCatEntries.value   = [makeEntry()]
  showNewCatSheet.value = true
  nextTick(() => newCatInputRef.value?.focus())
}

function closeNewCatSheet() {
  showNewCatSheet.value = false
  newCatEntries.value   = [makeEntry()]
}

function addNewCatEntry() {
  newCatEntries.value.push(makeEntry())
  nextTick(() => newCatInputRef.value?.focus())
}

function removeNewCatEntry(idx) {
  newCatEntries.value.splice(idx, 1)
}

function focusEntry(idx) {
  // focus next input via DOM — refs array pattern not used here
  const inputs = document.querySelectorAll('[id^="pc-new-cat-name-"]')
  inputs[idx]?.focus()
}

function handleCreateCat() {
  let hasError = false
  for (const entry of newCatEntries.value) {
    entry.error = ''
    const n = entry.value.trim()
    if (!n) {
      entry.error = 'El nombre no puede quedar vacío'
      hasError = true
    }
  }
  if (hasError) return

  // Detect duplicates within the batch
  const names = newCatEntries.value.map(e => e.value.trim())
  const seen  = new Set()
  for (let i = 0; i < newCatEntries.value.length; i++) {
    const n = names[i]
    if (seen.has(n)) {
      newCatEntries.value[i].error = 'Nombre duplicado en la lista'
      hasError = true
    }
    seen.add(n)
  }
  if (hasError) return

  for (let i = 0; i < newCatEntries.value.length; i++) {
    const ok = store.addCategoryToBrand(route.params.brandId, names[i])
    if (!ok) {
      newCatEntries.value[i].error = 'Ya existe una categoría con ese nombre'
      hasError = true
    }
  }
  if (hasError) return

  closeNewCatSheet()
}

// ─── Eliminar categorías (múltiple) ──────────────────────────────────────────

const showDeleteCatsPanel = ref(false)
const catsToDelete        = ref(new Set())

function openDeleteCatsPanel() {
  brandMenuOpen.value       = false
  catsToDelete.value        = new Set()
  showDeleteCatsPanel.value = true
}

function toggleCatToDelete(cat) {
  const s = new Set(catsToDelete.value)
  if (s.has(cat)) s.delete(cat)
  else s.add(cat)
  catsToDelete.value = s
}

function handleDeleteCats() {
  for (const cat of catsToDelete.value) {
    store.markDeleteCategoryInBrand(route.params.brandId, cat)
  }
  showDeleteCatsPanel.value = false
  catsToDelete.value        = new Set()
}

// ─── Ruedita de categoría ─────────────────────────────────────────────────────

function handleDeleteCat(cat) {
  store.markDeleteCategoryInBrand(route.params.brandId, cat)
  if (migratingCat.value === cat) cancelMigrate()
}

function handleRenameCat(oldName, newName) {
  store.renameCategoryInBrand(route.params.brandId, oldName, newName)
}

// ─── Migración de productos ───────────────────────────────────────────────────

const migratingCat       = ref(null)
const selectedProductIds = ref(new Set())
const showMigrateSheet   = ref(false)
const migrateTarget      = ref(null)

const migrationTargets = computed(() =>
  existingCats.value.filter(c => c !== migratingCat.value)
)

const currentGroupItems = computed(() => {
  if (!migratingCat.value) return []
  const group = categorizedProducts.value.find(
    g => (g.cat ?? '__sin_cat__') === migratingCat.value
  )
  return group?.items ?? []
})

const isAllSelected = computed(() =>
  currentGroupItems.value.length > 0 &&
  currentGroupItems.value.every(p => selectedProductIds.value.has(p.id))
)

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedProductIds.value = new Set()
  } else {
    selectedProductIds.value = new Set(currentGroupItems.value.map(p => p.id))
  }
}

function toggleMigrateMode(cat) {
  if (migratingCat.value === cat) {
    cancelMigrate()
  } else {
    migratingCat.value       = cat
    selectedProductIds.value = new Set()
  }
}

function cancelMigrate() {
  migratingCat.value       = null
  selectedProductIds.value = new Set()
  showMigrateSheet.value   = false
  migrateTarget.value      = null
}

function toggleProductSelect(id) {
  const s = new Set(selectedProductIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedProductIds.value = s
}

function openMigrateSheet() {
  if (selectedProductIds.value.size === 0) return
  migrateTarget.value    = null
  showMigrateSheet.value = true
}

function confirmMigrate() {
  if (!migrateTarget.value) return
  const targetCat = migrateTarget.value === '__sin_cat__' ? '' : migrateTarget.value
  products.value
    .filter(p => selectedProductIds.value.has(p.id))
    .forEach(p => { p.category = targetCat })
  cancelMigrate()
}

// ─── Clone ────────────────────────────────────────────────────────────────────

const showSheet   = ref(false)
const cloneTarget = ref(null)

function openCloneSheet(product) {
  cloneTarget.value = product
  showSheet.value   = true
}

function handleCloneConfirm(data) {
  store.cloneToBatch(cloneTarget.value, data)
  showSheet.value = false
  router.push('/catalog?tab=batches')
}
</script>