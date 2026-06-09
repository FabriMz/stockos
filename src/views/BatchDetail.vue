<template>
  <div class="screen">
    <TopBar variant="back" :title="folder?.batchNumber ?? ''" back-label="Lotes" back-to="/catalog?tab=batches" />

    <div class="scroll-content">
      <div v-if="folder" class="batch-detail__header">
        <div class="batch-detail__icon">
          <i class="ti ti-folder" aria-hidden="true"></i>
        </div>
        <div class="batch-detail__info">
          <div class="batch-detail__number">{{ folder.batchNumber }}</div>
          <div class="batch-detail__meta">
            {{ totalItems }} {{ totalItems === 1 ? 'producto' : 'productos' }} · vence {{ formatExpiry(folder.expiry) }}
          </div>
        </div>
        <span :class="['badge', expiryBadgeClass(folder.expiry)]" class="batch-detail__badge">
          <i :class="`ti ${expiryBadgeIcon(folder.expiry)}`" aria-hidden="true"></i>
          {{ expiryBadgeLabel(folder.expiry) }}
        </span>
      </div>

      <!-- Buscador de marcas -->
      <div class="brand-search">
        <i class="ti ti-search brand-search__icon" aria-hidden="true"></i>
        <input id="batch-detail-search" name="batch-detail-search" class="brand-search__input" type="search"
          v-model="searchQuery" placeholder="Buscar marca..." autocomplete="off"
          aria-label="Buscar marca en este lote" />
        <button v-if="searchQuery" class="brand-search__clear" type="button" aria-label="Limpiar búsqueda"
          @click="searchQuery = ''">
          <i class="ti ti-x" aria-hidden="true"></i>
        </button>
      </div>

      <!-- Action bar -->
      <div class="catalog-action-bar" role="toolbar" aria-label="Acciones del lote">
        <button class="catalog-action-bar__btn" aria-label="Nueva marca" @click="openNewBrandSheet">
          <i class="ti ti-building-store" aria-hidden="true"></i>
          <span>Marca</span>
        </button>
        <button class="catalog-action-bar__btn" aria-label="Nueva categoría" @click="openNewCatSheet">
          <i class="ti ti-folder-plus" aria-hidden="true"></i>
          <span>Categoría</span>
        </button>
        <button class="catalog-action-bar__btn catalog-action-bar__btn--settings"
          :class="{ 'catalog-action-bar__btn--active': showSettingsSheet }" aria-label="Ajustes del lote"
          @click="openSettingsSheet">
          <i class="ti ti-settings" aria-hidden="true"></i>
          <span>Ajustes</span>
        </button>
      </div>

      <template v-for="catGroup in categorizedGroups" :key="catGroup.id ?? '__sin_cat__'">
        <CatalogCatSep v-if="catGroup.id" :cat-id="catGroup.id" :cat-name="catGroup.category" :show-migrate="true"
          :is-migrating="migratingCatId === catGroup.id" @delete="handleDeleteCat(catGroup.id)"
          @renamed="(n) => handleRenameCat(catGroup.id, n)" @toggle-migrate="toggleMigrateMode(catGroup.id)" />
        <CatalogCatSep v-else cat-id="__sin_cat__" cat-name="Sin categoría" :show-migrate="true" :show-delete="false"
          :show-edit="false" :is-migrating="migratingCatId === '__sin_cat__'"
          @toggle-migrate="toggleMigrateMode('__sin_cat__')" />

        <!-- Modo normal -->
        <template
          v-if="migratingCatId === null || (catGroup.id !== null && migratingCatId !== catGroup.id) || (catGroup.id === null && migratingCatId !== '__sin_cat__')">
          <BrandRow v-for="group in catGroup.groups" :key="group.brand.id" :brand="group.brand"
            :to="`/catalog/batch/${encodeURIComponent(folder.batchNumber)}/${group.brand.id}`"
            :meta="`${group.items.length} ${group.items.length === 1 ? 'producto' : 'productos'}`" />
        </template>

        <!-- Modo migración: filas seleccionables -->
        <template v-else>
          <div v-for="group in catGroup.groups" :key="group.brand.id" class="brand-row brand-row--selectable"
            :class="{ 'brand-row--selected': selectedBrandIds.has(group.brand.id) }" role="checkbox"
            :aria-checked="String(selectedBrandIds.has(group.brand.id))" :aria-label="group.brand.name" tabindex="0"
            @click="toggleBrandSelect(group.brand.id)" @keydown.enter.prevent="toggleBrandSelect(group.brand.id)"
            @keydown.space.prevent="toggleBrandSelect(group.brand.id)">
            <div class="brand-row__body">
              <div class="brand-row__header">
                <div class="brand-row__check">
                  <i class="ti" :class="selectedBrandIds.has(group.brand.id) ? 'ti-circle-check' : 'ti-circle'"
                    aria-hidden="true"></i>
                </div>
                <div class="brand-row__icon" :style="{ background: group.brand.bg }">
                  <i :class="`ti ${group.brand.ic}`" :style="{ color: group.brand.col }" aria-hidden="true"></i>
                </div>
                <div class="brand-row__info">
                  <div class="brand-row__name">{{ group.brand.name }}</div>
                  <div class="brand-row__meta">{{ group.items.length }} {{ group.items.length === 1 ? 'producto' :
                    'productos' }}</div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <p v-if="catGroup.id && catGroup.groups.length === 0" class="catalog__cat-empty">
          Sin marcas asignadas
        </p>
      </template>

      <div class="spacer--sm"></div>
    </div>

    <!-- Migrate action bar -->
    <Transition name="fab-menu">
      <div v-if="migratingCatId" class="catalog__migrate-bar">
        <span class="catalog__migrate-count">
          {{ selectedBrandIds.size }} marca{{ selectedBrandIds.size !== 1 ? 's' : '' }}
        </span>
        <div class="catalog__migrate-actions">
          <button class="btn btn--ghost btn--sm"
            :aria-label="isAllBrandsSelected ? 'Deseleccionar todas' : 'Seleccionar todas'"
            @click="toggleSelectAllBrands">
            <i class="ti" :class="isAllBrandsSelected ? 'ti-square-minus' : 'ti-select-all'" aria-hidden="true"></i>
            {{ isAllBrandsSelected ? 'Ninguna' : 'Todas' }}
          </button>
          <button class="btn btn--secondary btn--sm" @click="cancelMigrate">Cancelar</button>
          <button class="btn btn--primary btn--sm" :disabled="selectedBrandIds.size === 0" @click="openMigrateSheet">
            Migrar
          </button>
        </div>
      </div>
    </Transition>

    <BottomNav />

    <!-- Nueva categoría sheet -->
    <Transition name="sheet">
      <div v-if="showNewCatSheet" class="sheet-overlay" role="dialog" aria-label="Nueva categoría"
        @click.self="closeNewCatSheet">
        <div class="sheet">
          <div class="sheet__handle" aria-hidden="true"></div>
          <div class="sheet__header">
            <div class="sheet__title">Nueva categoría</div>
            <div class="sheet__sub">Ingresá el nombre del grupo de marcas</div>
          </div>
          <div class="sheet__body">
            <div class="form-group">
              <label class="form-label" for="batch-new-cat-name">Nombre</label>
              <input id="batch-new-cat-name" name="batch-new-cat-name" class="form-input" v-model="newCatName"
                placeholder="Ej: Vinos · Espumantes" autocomplete="off" ref="newCatInputRef"
                @keydown.enter.prevent="handleCreateCat" @keydown.escape="closeNewCatSheet" />
              <span v-if="newCatError" class="form-hint form-hint--error" role="alert">{{ newCatError }}</span>
            </div>
          </div>
          <div class="btn-group btn-group--row">
            <button class="btn btn--secondary" @click="closeNewCatSheet">Cancelar</button>
            <button class="btn btn--primary" @click="handleCreateCat">
              <i class="ti ti-plus" aria-hidden="true"></i>
              Crear categoría
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Nueva marca sheet -->
    <Transition name="sheet">
      <div v-if="showNewBrandSheet" class="sheet-overlay" role="dialog" aria-label="Nueva marca"
        @click.self="closeNewBrandSheet">
        <div class="sheet">
          <div class="sheet__handle" aria-hidden="true"></div>
          <div class="sheet__header">
            <div class="sheet__title">Nueva marca</div>
            <div class="sheet__sub">Se puede completar el resto desde el catálogo de la marca</div>
          </div>
          <div class="sheet__body">
            <div class="form-group">
              <label class="form-label" for="batch-new-brand-name">Nombre</label>
              <input id="batch-new-brand-name" name="batch-new-brand-name" class="form-input" v-model="newBrandName"
                placeholder="Ej: Porta · Santa Rita" autocomplete="off" ref="newBrandInputRef"
                @keydown.enter.prevent="handleCreateBrand" @keydown.escape="closeNewBrandSheet" />
              <span v-if="newBrandError" class="form-hint form-hint--error" role="alert">{{ newBrandError }}</span>
            </div>
          </div>
          <div class="btn-group btn-group--row">
            <button class="btn btn--secondary" @click="closeNewBrandSheet">Cancelar</button>
            <button class="btn btn--primary" @click="handleCreateBrand">
              <i class="ti ti-plus" aria-hidden="true"></i>
              Crear marca
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Ajustes sheet -->
    <Transition name="sheet">
      <div v-if="showSettingsSheet" class="sheet-overlay" role="dialog" aria-label="Ajustes del lote"
        @click.self="closeSettingsSheet">
        <div class="sheet sheet--tall">
          <div class="sheet__handle" aria-hidden="true"></div>
          <div class="sheet__header">
            <div class="sheet__title">Ajustes</div>
            <div class="sheet__sub">Renombra o elimina marcas y categorías</div>
          </div>

          <div class="sheet__body sheet__body--scroll">
            <div class="topbar__search settings-sheet__search">
              <i class="ti ti-search" aria-hidden="true"></i>
              <input id="batch-settings-search" name="batch-settings-search" type="search" v-model="settingsSearchQuery"
                placeholder="Buscar marcas y categorías…" aria-label="Buscar marcas y categorías" />
              <button v-if="settingsSearchQuery" class="topbar__search-clear" type="button"
                @click="settingsSearchQuery = ''" aria-label="Limpiar búsqueda">
                <i class="ti ti-x" aria-hidden="true"></i>
              </button>
            </div>

            <!-- Categorías -->
            <p class="settings-sheet__section-label">
              <i class="ti ti-folder" aria-hidden="true"></i>
              Categorías de marcas
            </p>
            <div class="settings-sheet__list" role="list">
              <div v-for="cat in filteredSettingsCategories" :key="cat.id" class="settings-sheet__item" role="listitem">
                <template v-if="settingsEditingCatId === cat.id">
                  <input :id="`batch-settings-cat-${cat.id}`" :name="`batch-settings-cat-${cat.id}`"
                    class="settings-sheet__edit-input" v-model="settingsEditValue" autocomplete="off"
                    :ref="el => { if (el) settingsInputRefs[cat.id] = el }"
                    @keydown.enter.prevent="confirmSettingsCatRename(cat.id)" @keydown.escape="cancelSettingsEdit" />
                  <span v-if="settingsEditError" class="settings-sheet__edit-error" role="alert">{{ settingsEditError
                    }}</span>
                  <div class="settings-sheet__item-actions">
                    <button class="settings-sheet__confirm-btn" aria-label="Confirmar"
                      @click="confirmSettingsCatRename(cat.id)">
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
                    <span class="settings-sheet__item-name">{{ cat.name }}</span>
                    <span class="settings-sheet__item-meta">{{ cat.brandIds.length }} marca{{ cat.brandIds.length !== 1
                      ? 's' : '' }}</span>
                  </div>
                  <div class="settings-sheet__item-actions">
                    <button class="settings-sheet__action-btn" :aria-label="`Renombrar ${cat.name}`"
                      @click="startSettingsCatEdit(cat)">
                      <i class="ti ti-pencil" aria-hidden="true"></i>
                    </button>
                    <button class="settings-sheet__action-btn settings-sheet__action-btn--danger"
                      :aria-label="`Eliminar ${cat.name}`" @click="handleSettingsDeleteCat(cat.id)">
                      <i class="ti ti-trash" aria-hidden="true"></i>
                    </button>
                  </div>
                </template>
              </div>
              <div v-if="filteredSettingsCategories.length === 0" class="settings-sheet__empty">
                No se encontraron categorías
              </div>
            </div>

            <!-- Marcas -->
            <p class="settings-sheet__section-label settings-sheet__section-label--mt">
              <i class="ti ti-building-store" aria-hidden="true"></i>
              Marcas
            </p>
            <div class="settings-sheet__list" role="list">
              <div v-for="brand in filteredSettingsBrands" :key="brand.id" class="settings-sheet__item" role="listitem">
                <template v-if="settingsEditingBrandId === brand.id">
                  <input :id="`batch-settings-brand-${brand.id}`" :name="`batch-settings-brand-${brand.id}`"
                    class="settings-sheet__edit-input" v-model="settingsEditValue" autocomplete="off"
                    :ref="el => { if (el) settingsInputRefs[brand.id] = el }"
                    @keydown.enter.prevent="confirmSettingsBrandRename(brand.id)"
                    @keydown.escape="cancelSettingsEdit" />
                  <span v-if="settingsEditError" class="settings-sheet__edit-error" role="alert">{{ settingsEditError
                    }}</span>
                  <div class="settings-sheet__item-actions">
                    <button class="settings-sheet__confirm-btn" aria-label="Confirmar"
                      @click="confirmSettingsBrandRename(brand.id)">
                      <i class="ti ti-check" aria-hidden="true"></i>
                    </button>
                    <button class="settings-sheet__cancel-btn" aria-label="Cancelar" @click="cancelSettingsEdit">
                      <i class="ti ti-x" aria-hidden="true"></i>
                    </button>
                  </div>
                </template>
                <template v-else>
                  <div class="settings-sheet__item-icon" :style="{ background: brand.bg }">
                    <i :class="`ti ${brand.ic}`" :style="{ color: brand.col }" aria-hidden="true"></i>
                  </div>
                  <div class="settings-sheet__item-info">
                    <span class="settings-sheet__item-name">{{ brand.name }}</span>
                    <span class="settings-sheet__item-meta">{{ store.getByBrand(brand.id).length }} productos</span>
                  </div>
                  <div class="settings-sheet__item-actions">
                    <button class="settings-sheet__action-btn" :aria-label="`Renombrar ${brand.name}`"
                      @click="startSettingsBrandEdit(brand)">
                      <i class="ti ti-pencil" aria-hidden="true"></i>
                    </button>
                    <button class="settings-sheet__action-btn settings-sheet__action-btn--danger"
                      :aria-label="`Eliminar ${brand.name}`" @click="handleSettingsDeleteBrand(brand.id)">
                      <i class="ti ti-trash" aria-hidden="true"></i>
                    </button>
                  </div>
                </template>
              </div>
              <div v-if="filteredSettingsBrands.length === 0" class="settings-sheet__empty">
                No se encontraron marcas
              </div>
            </div>
          </div>

          <div class="btn-group">
            <button class="btn btn--secondary" @click="closeSettingsSheet">Cerrar</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Migrate destination sheet -->
    <Transition name="sheet">
      <div v-if="showMigrateSheet" class="sheet-overlay" role="dialog" aria-label="Mover marcas"
        @click.self="showMigrateSheet = false">
        <div class="sheet">
          <div class="sheet__handle" aria-hidden="true"></div>
          <div class="sheet__header">
            <div class="sheet__title">Mover marcas</div>
            <div class="sheet__sub">
              {{ selectedBrandIds.size }} marca{{ selectedBrandIds.size !== 1 ? 's' : '' }} de
              "{{ migratingCatName }}" pasarán a la categoría que elijas.
            </div>
          </div>
          <div class="sheet__body">
            <p class="sheet__section-label">Destino</p>
            <div class="catalog__migrate-dest-list" role="listbox" aria-label="Categoría destino">
              <button v-for="cat in migrationTargets" :key="cat.id" class="catalog__migrate-dest-item"
                :class="{ 'catalog__migrate-dest-item--selected': migrateTargetId === cat.id }" role="option"
                :aria-selected="migrateTargetId === cat.id" @click="migrateTargetId = cat.id">
                <span>{{ cat.name }}</span>
                <i v-if="migrateTargetId === cat.id" class="ti ti-check" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <div class="btn-group">
            <button class="btn btn--primary" :disabled="!migrateTargetId" @click="confirmMigrate">
              <i class="ti ti-arrows-exchange" aria-hidden="true"></i>
              Mover marcas
            </button>
            <button class="btn btn--secondary" @click="showMigrateSheet = false">Cancelar</button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore } from '../stores/products.js'
import { useSettingsSheet } from '../composables/useSettingsSheet.js'
import { formatExpiry, expiryBadgeClass, expiryBadgeLabel, expiryBadgeIcon } from '../utils/alerts.js'
import TopBar from '../components/layout/TopBar.vue'
import BottomNav from '../components/layout/BottomNav.vue'
import BrandRow from '../components/ui/BrandRow.vue'
import CatalogCatSep from '../components/ui/CatalogCatSep.vue'

const route = useRoute()
const router = useRouter()
const store = useProductsStore()

const batchNumber = computed(() => decodeURIComponent(route.params.batchNumber))

// ─── BÚSQUEDA ────────────────────────────────────────────────────────────────

const searchQuery = ref('')

const folder = computed(() =>
  store.getBatchFolder(batchNumber.value)
)

const totalItems = computed(() =>
  folder.value
    ? folder.value.brandGroups.reduce((sum, g) => sum + g.items.length, 0)
    : 0
)

const categorizedGroups = computed(() => {
  if (!folder.value) return []
  const result = []

  // Categorías locales del lote
  const batchCats = store.getBatchSortedCategories(batchNumber.value)

  // Marcas del lote indexadas por id para lookup rápido
  const batchBrandMap = {}
  for (const group of folder.value.brandGroups) {
    batchBrandMap[group.brand.id] = group
  }

  // 1. Categorías del lote (se muestran aunque estén vacías)
  for (const cat of batchCats) {
    const groups = cat.brandIds
      .filter(bid => batchBrandMap[bid])
      .map(bid => batchBrandMap[bid])
      .sort((a, b) => a.brand.name.localeCompare(b.brand.name, 'es'))
    result.push({ id: cat.id, category: cat.name, groups })
  }

  // 2. Marcas del lote sin categoría local
  const categorizedBrandIds = new Set(batchCats.flatMap(c => c.brandIds))
  const uncategorizedGroups = folder.value.brandGroups
    .filter(g => !categorizedBrandIds.has(g.brand.id))
    .sort((a, b) => a.brand.name.localeCompare(b.brand.name, 'es'))
  if (uncategorizedGroups.length > 0) {
    result.push({ id: null, category: '', groups: uncategorizedGroups })
  }

  // 3. Filtrar por búsqueda (si hay query activo)
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return result

  return result
    .map(catGroup => ({
      ...catGroup,
      groups: catGroup.groups.filter(g => g.brand.name.toLowerCase().includes(q)),
    }))
    .filter(catGroup => catGroup.groups.length > 0)
})

watch(folder, (val, oldVal) => {
  if (oldVal && !val) router.push('/catalog?tab=batches')
})

function handleDeleteCat(id) {
  if (migratingCatId.value === id) cancelMigrate()
  store.deleteBatchCategory(batchNumber.value, id)
}

function handleRenameCat(id, newName) {
  store.renameBatchCategory(batchNumber.value, id, newName)
}

// ─── NUEVA CATEGORÍA ─────────────────────────────────────────────────────────

const showNewCatSheet = ref(false)
const newCatName = ref('')
const newCatError = ref('')
const newCatInputRef = ref(null)

function openNewCatSheet() {
  newCatName.value = ''
  newCatError.value = ''
  showNewCatSheet.value = true
  nextTick(() => newCatInputRef.value?.focus())
}

function closeNewCatSheet() {
  showNewCatSheet.value = false
  newCatName.value = ''
  newCatError.value = ''
}

function handleCreateCat() {
  const n = newCatName.value.trim()
  if (!n) {
    newCatError.value = 'El nombre no puede quedar vacío'
    return
  }
  const ok = store.addBatchCategory(batchNumber.value, n)
  if (!ok) {
    newCatError.value = 'Ya existe un grupo con ese nombre'
    return
  }
  closeNewCatSheet()
}

// ─── NUEVA MARCA ─────────────────────────────────────────────────────────────

const showNewBrandSheet = ref(false)
const newBrandName = ref('')
const newBrandError = ref('')
const newBrandInputRef = ref(null)

function openNewBrandSheet() {
  newBrandName.value = ''
  newBrandError.value = ''
  showNewBrandSheet.value = true
  nextTick(() => newBrandInputRef.value?.focus())
}

function closeNewBrandSheet() {
  showNewBrandSheet.value = false
  newBrandName.value = ''
  newBrandError.value = ''
}

function handleCreateBrand() {
  const n = newBrandName.value.trim()
  if (!n) {
    newBrandError.value = 'El nombre no puede quedar vacío'
    return
  }
  const id = store.addBrand(n)
  if (id) store.addBrandToFolder(batchNumber.value, id)
  closeNewBrandSheet()
}

// ─── AJUSTES SHEET ───────────────────────────────────────────────────────────

// IDs de marcas presentes en este lote (para filtrar el settings sheet)
const batchBrandIds = computed(() =>
  folder.value ? folder.value.brandGroups.map(g => g.brand.id) : []
)

const {
  showSettingsSheet,
  openSettingsSheet,
  closeSettingsSheet,
  settingsSearchQuery,
  filteredSettingsCategories,
  filteredSettingsBrands,
  settingsEditingCatId,
  settingsEditingBrandId,
  settingsEditValue,
  settingsEditError,
  settingsInputRefs,
  startSettingsCatEdit,
  confirmSettingsCatRename,
  handleSettingsDeleteCat,
  startSettingsBrandEdit,
  confirmSettingsBrandRename,
  handleSettingsDeleteBrand,
  cancelSettingsEdit,
} = useSettingsSheet({
  getCategories: () => store.getBatchSortedCategories(batchNumber.value),
  getSortedCategories: () => store.getBatchSortedCategories(batchNumber.value),
  getSortedBrands: () => store.sortedBrands,
  getBrand: store.getBrand,
  addCategory: (name) => store.addBatchCategory(batchNumber.value, name),
  renameCategory: (id, name) => store.renameBatchCategory(batchNumber.value, id, name),
  deleteCategory: (id) => store.deleteBatchCategory(batchNumber.value, id),
  addBrand: store.addBrand,
  editBrandName: store.editBrandName,
  deleteBrand: store.markDeleteBrand,
}, {
  batchBrandIds,
  onRenameCat: (id, val) => store.renameBatchCategory(batchNumber.value, id, val),
  onDeleteCat: (id) => store.deleteBatchCategory(batchNumber.value, id),
})

// ─── MIGRATE STATE ────────────────────────────────────────────────────────────

const migratingCatId = ref(null)
const selectedBrandIds = ref(new Set())
const showMigrateSheet = ref(false)
const migrateTargetId = ref(null)

const migratingCatName = computed(() => {
  if (migratingCatId.value === '__sin_cat__') return 'Sin categoría'
  return store.getBatchSortedCategories(batchNumber.value).find(c => c.id === migratingCatId.value)?.name ?? ''
})

const migrationTargets = computed(() =>
  store.getBatchSortedCategories(batchNumber.value).filter(c => c.id !== migratingCatId.value)
)

const currentCatBrands = computed(() => {
  if (!migratingCatId.value) return []
  const catGroup = categorizedGroups.value.find(g =>
    migratingCatId.value === '__sin_cat__' ? g.id === null : g.id === migratingCatId.value
  )
  return catGroup ? catGroup.groups.map(g => g.brand.id) : []
})

const isAllBrandsSelected = computed(() =>
  currentCatBrands.value.length > 0 &&
  currentCatBrands.value.every(bid => selectedBrandIds.value.has(bid))
)

function toggleSelectAllBrands() {
  if (isAllBrandsSelected.value) {
    selectedBrandIds.value = new Set()
  } else {
    selectedBrandIds.value = new Set(currentCatBrands.value)
  }
}

function toggleMigrateMode(catId) {
  if (migratingCatId.value === catId) {
    cancelMigrate()
  } else {
    migratingCatId.value = catId
    selectedBrandIds.value = new Set()
  }
}

function cancelMigrate() {
  migratingCatId.value = null
  selectedBrandIds.value = new Set()
  showMigrateSheet.value = false
  migrateTargetId.value = null
}

function toggleBrandSelect(bid) {
  const s = new Set(selectedBrandIds.value)
  if (s.has(bid)) s.delete(bid)
  else s.add(bid)
  selectedBrandIds.value = s
}

function openMigrateSheet() {
  if (selectedBrandIds.value.size === 0) return
  migrateTargetId.value = null
  showMigrateSheet.value = true
}

function confirmMigrate() {
  if (!migrateTargetId.value) return
  const fromCatId = migratingCatId.value === '__sin_cat__' ? null : migratingCatId.value
  for (const brandId of selectedBrandIds.value) {
    store.moveBrandInBatch(batchNumber.value, brandId, fromCatId, migrateTargetId.value)
  }
  showMigrateSheet.value = false
  migratingCatId.value = null
  selectedBrandIds.value = new Set()
  migrateTargetId.value = null
}
</script>