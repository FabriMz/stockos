<template>
  <div class="screen">
    <TopBar
      variant="back"
      :title="folder?.batchNumber ?? ''"
      back-label="Lotes"
      back-to="/catalog?tab=batches"
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
        <button
          class="catalog-action-bar__btn catalog-action-bar__btn--settings"
          :class="{ 'catalog-action-bar__btn--active': showSettingsSheet }"
          aria-label="Ajustes del lote"
          @click="openSettingsSheet"
        >
          <i class="ti ti-settings" aria-hidden="true"></i>
          <span>Ajustes</span>
        </button>
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

    <!-- Nueva categoría sheet -->
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
            <div class="sheet__sub">Ingresá el nombre del grupo de marcas</div>
          </div>
          <div class="sheet__body">
            <div class="form-group">
              <label class="form-label" for="batch-new-cat-name">Nombre</label>
              <input
                id="batch-new-cat-name"
                name="batch-new-cat-name"
                class="form-input"
                v-model="newCatName"
                placeholder="Ej: Vinos · Espumantes"
                autocomplete="off"
                ref="newCatInputRef"
                @keydown.enter.prevent="handleCreateCat"
                @keydown.escape="closeNewCatSheet"
              />
              <span v-if="newCatError" class="form-hint form-hint--error" role="alert">{{ newCatError }}</span>
            </div>
          </div>
          <div class="btn-group">
            <button class="btn btn--primary" @click="handleCreateCat">
              <i class="ti ti-plus" aria-hidden="true"></i>
              Crear categoría
            </button>
            <button class="btn btn--secondary" @click="closeNewCatSheet">Cancelar</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Nueva marca sheet -->
    <Transition name="sheet">
      <div
        v-if="showNewBrandSheet"
        class="sheet-overlay"
        role="dialog"
        aria-label="Nueva marca"
        @click.self="closeNewBrandSheet"
      >
        <div class="sheet">
          <div class="sheet__handle" aria-hidden="true"></div>
          <div class="sheet__header">
            <div class="sheet__title">Nueva marca</div>
            <div class="sheet__sub">Se puede completar el resto desde el catálogo de la marca</div>
          </div>
          <div class="sheet__body">
            <div class="form-group">
              <label class="form-label" for="batch-new-brand-name">Nombre</label>
              <input
                id="batch-new-brand-name"
                name="batch-new-brand-name"
                class="form-input"
                v-model="newBrandName"
                placeholder="Ej: Porta · Santa Rita"
                autocomplete="off"
                ref="newBrandInputRef"
                @keydown.enter.prevent="handleCreateBrand"
                @keydown.escape="closeNewBrandSheet"
              />
              <span v-if="newBrandError" class="form-hint form-hint--error" role="alert">{{ newBrandError }}</span>
            </div>
          </div>
          <div class="btn-group">
            <button class="btn btn--primary" @click="handleCreateBrand">
              <i class="ti ti-plus" aria-hidden="true"></i>
              Crear marca
            </button>
            <button class="btn btn--secondary" @click="closeNewBrandSheet">Cancelar</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Ajustes sheet -->
    <Transition name="sheet">
      <div
        v-if="showSettingsSheet"
        class="sheet-overlay"
        role="dialog"
        aria-label="Ajustes del lote"
        @click.self="closeSettingsSheet"
      >
        <div class="sheet sheet--tall">
          <div class="sheet__handle" aria-hidden="true"></div>
          <div class="sheet__header">
            <div class="sheet__title">Ajustes</div>
            <div class="sheet__sub">Renombra o elimina marcas y categorías</div>
          </div>

          <div class="sheet__body sheet__body--scroll">
            <div class="topbar__search settings-sheet__search">
              <i class="ti ti-search" aria-hidden="true"></i>
              <input
                id="batch-settings-search"
                name="batch-settings-search"
                type="search"
                v-model="settingsSearchQuery"
                placeholder="Buscar marcas y categorías…"
                aria-label="Buscar marcas y categorías"
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

            <!-- Categorías -->
            <p class="settings-sheet__section-label">
              <i class="ti ti-folder" aria-hidden="true"></i>
              Categorías de marcas
            </p>
            <div class="settings-sheet__list" role="list">
              <div
                v-for="cat in filteredSettingsCategories"
                :key="cat.id"
                class="settings-sheet__item"
                role="listitem"
              >
                <template v-if="settingsEditingCatId === cat.id">
                  <input
                    :id="`batch-settings-cat-${cat.id}`"
                    class="settings-sheet__edit-input"
                    v-model="settingsEditValue"
                    autocomplete="off"
                    :ref="el => { if (el) settingsInputRefs[cat.id] = el }"
                    @keydown.enter.prevent="confirmSettingsCatRename(cat.id)"
                    @keydown.escape="cancelSettingsEdit"
                  />
                  <span v-if="settingsEditError" class="settings-sheet__edit-error" role="alert">{{ settingsEditError }}</span>
                  <div class="settings-sheet__item-actions">
                    <button class="settings-sheet__confirm-btn" aria-label="Confirmar" @click="confirmSettingsCatRename(cat.id)">
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
                    <span class="settings-sheet__item-meta">{{ cat.brandIds.length }} marca{{ cat.brandIds.length !== 1 ? 's' : '' }}</span>
                  </div>
                  <div class="settings-sheet__item-actions">
                    <button
                      class="settings-sheet__action-btn"
                      :aria-label="`Renombrar ${cat.name}`"
                      @click="startSettingsCatEdit(cat)"
                    >
                      <i class="ti ti-pencil" aria-hidden="true"></i>
                    </button>
                    <button
                      class="settings-sheet__action-btn settings-sheet__action-btn--danger"
                      :aria-label="`Eliminar ${cat.name}`"
                      @click="handleSettingsDeleteCat(cat.id)"
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

            <!-- Marcas -->
            <p class="settings-sheet__section-label settings-sheet__section-label--mt">
              <i class="ti ti-building-store" aria-hidden="true"></i>
              Marcas
            </p>
            <div class="settings-sheet__list" role="list">
              <div
                v-for="brand in filteredSettingsBrands"
                :key="brand.id"
                class="settings-sheet__item"
                role="listitem"
              >
                <template v-if="settingsEditingBrandId === brand.id">
                  <input
                    :id="`batch-settings-brand-${brand.id}`"
                    class="settings-sheet__edit-input"
                    v-model="settingsEditValue"
                    autocomplete="off"
                    :ref="el => { if (el) settingsInputRefs[brand.id] = el }"
                    @keydown.enter.prevent="confirmSettingsBrandRename(brand.id)"
                    @keydown.escape="cancelSettingsEdit"
                  />
                  <span v-if="settingsEditError" class="settings-sheet__edit-error" role="alert">{{ settingsEditError }}</span>
                  <div class="settings-sheet__item-actions">
                    <button class="settings-sheet__confirm-btn" aria-label="Confirmar" @click="confirmSettingsBrandRename(brand.id)">
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
                    <button
                      class="settings-sheet__action-btn"
                      :aria-label="`Renombrar ${brand.name}`"
                      @click="startSettingsBrandEdit(brand)"
                    >
                      <i class="ti ti-pencil" aria-hidden="true"></i>
                    </button>
                    <button
                      class="settings-sheet__action-btn settings-sheet__action-btn--danger"
                      :aria-label="`Eliminar ${brand.name}`"
                      @click="handleSettingsDeleteBrand(brand.id)"
                    >
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

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore }        from '../stores/products.js'
import { useBrandCategoriesStore } from '../stores/brandCategories.js'
import { useSettingsSheet }        from '../composables/useSettingsSheet.js'
import { formatExpiry, expiryBadgeClass, expiryBadgeLabel } from '../utils/alerts.js'
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

// ─── NUEVA CATEGORÍA ─────────────────────────────────────────────────────────

const showNewCatSheet = ref(false)
const newCatName      = ref('')
const newCatError     = ref('')
const newCatInputRef  = ref(null)

function openNewCatSheet() {
  newCatName.value  = ''
  newCatError.value = ''
  showNewCatSheet.value = true
  nextTick(() => newCatInputRef.value?.focus())
}

function closeNewCatSheet() {
  showNewCatSheet.value = false
  newCatName.value  = ''
  newCatError.value = ''
}

function handleCreateCat() {
  const n = newCatName.value.trim()
  if (!n) {
    newCatError.value = 'El nombre no puede quedar vacío'
    return
  }
  const ok = catStore.addCategory(n)
  if (!ok) {
    newCatError.value = 'Ya existe un grupo con ese nombre'
    return
  }
  closeNewCatSheet()
}

// ─── NUEVA MARCA ─────────────────────────────────────────────────────────────

const showNewBrandSheet = ref(false)
const newBrandName      = ref('')
const newBrandError     = ref('')
const newBrandInputRef  = ref(null)

function openNewBrandSheet() {
  newBrandName.value  = ''
  newBrandError.value = ''
  showNewBrandSheet.value = true
  nextTick(() => newBrandInputRef.value?.focus())
}

function closeNewBrandSheet() {
  showNewBrandSheet.value = false
  newBrandName.value  = ''
  newBrandError.value = ''
}

function handleCreateBrand() {
  const n = newBrandName.value.trim()
  if (!n) {
    newBrandError.value = 'El nombre no puede quedar vacío'
    return
  }
  const id = store.addBrand(n)
  if (!id) {
    newBrandError.value = 'Ya existe una marca con ese nombre'
    return
  }
  closeNewBrandSheet()
}

// ─── AJUSTES SHEET ───────────────────────────────────────────────────────────

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
} = useSettingsSheet(store, catStore)
</script>