<template>
  <div class="screen">
    <TopBar
      variant="home"
      search-id="catalog-search"
      :search-placeholder="activeTab === 'batches' ? 'Buscar lote o producto…' : 'Buscar marca o producto…'"
      v-model="searchQuery"
    />

    <div v-if="!searchQuery.trim()" class="catalog-tabs" role="tablist">
      <button
        id="tab-brands"
        class="catalog-tabs__tab"
        :class="{ 'catalog-tabs__tab--active': activeTab === 'brands' }"
        role="tab"
        :aria-selected="activeTab === 'brands'"
        aria-controls="panel-brands"
        @click="activeTab = 'brands'"
      >
        Marcas
        <span class="catalog-tabs__count">{{ totalBrands }}</span>
      </button>
      <button
        id="tab-batches"
        class="catalog-tabs__tab"
        :class="{ 'catalog-tabs__tab--active': activeTab === 'batches' }"
        role="tab"
        :aria-selected="activeTab === 'batches'"
        aria-controls="panel-batches"
        @click="activeTab = 'batches'"
      >
        Lotes
        <span class="catalog-tabs__count">{{ totalBatchFolders }}</span>
      </button>
    </div>

    <!-- Catalog action bar (brands tab only, no search) -->
    <div
      v-if="activeTab === 'brands' && !searchQuery.trim()"
      class="catalog-action-bar"
      role="toolbar"
      aria-label="Acciones del catálogo"
    >
      <button class="catalog-action-bar__btn" aria-label="Nueva marca" @click="openNewBrandSheet">
        <i class="ti ti-building-store" aria-hidden="true"></i>
        <span>Marca</span>
      </button>
      <button class="catalog-action-bar__btn" aria-label="Nueva categoría" @click="showNewCatSheet = true">
        <i class="ti ti-folder-plus" aria-hidden="true"></i>
        <span>Categoría</span>
      </button>
      <button
        class="catalog-action-bar__btn catalog-action-bar__btn--settings"
        :class="{ 'catalog-action-bar__btn--active': showAjustesSheet }"
        aria-label="Ajustes del catálogo"
        @click="showAjustesSheet = true"
      >
        <i class="ti ti-settings" aria-hidden="true"></i>
        <span>Ajustes</span>
      </button>
    </div>

    <div class="scroll-content">

      <template v-if="searchQuery.trim()">
        <template v-if="activeTab === 'batches'">
          <div
            v-for="folder in filteredBatchFolders"
            :key="folder.batchNumber"
            class="batch-folder batch-folder--link"
            role="button"
            tabindex="0"
            :aria-label="`Ver lote ${folder.batchNumber}`"
            @click="router.push(`/catalog/batch/${encodeURIComponent(folder.batchNumber)}`)"
            @keydown.enter="router.push(`/catalog/batch/${encodeURIComponent(folder.batchNumber)}`)"
          >
            <div class="batch-folder__main">
              <div class="batch-folder__icon">
                <i class="ti ti-folder" aria-hidden="true"></i>
              </div>
              <div class="batch-folder__body">
                <div class="batch-folder__number">{{ folder.batchNumber }}</div>
                <div class="batch-folder__meta">
                  {{ folderItemCount(folder) }} {{ folderItemCount(folder) === 1 ? 'producto' : 'productos' }} · vence {{ formatExpiry(folder.expiry) }}
                </div>
              </div>
              <div class="batch-folder__right">
                <span :class="['badge', expiryBadgeClass(folder.expiry)]">
                  {{ expiryBadgeLabel(folder.expiry) }}
                </span>
              </div>
            </div>
          </div>
          <ProductCard
            v-for="p in filteredBatchProducts"
            :key="p.id"
            :product="p"
          />
          <div v-if="!filteredBatchFolders.length && !filteredBatchProducts.length" class="batch-empty">
            <i class="ti ti-folder-search" aria-hidden="true"></i>
            <p>Sin resultados</p>
            <span>No hay lotes ni productos que coincidan con "{{ searchQuery.trim() }}"</span>
          </div>
        </template>
        <template v-else>
          <ProductCard
            v-for="p in filteredProducts"
            :key="p.id"
            :product="p"
          />
          <p v-if="!filteredProducts.length" class="home__empty">
            Sin resultados para "{{ searchQuery.trim() }}"
          </p>
        </template>
      </template>

      <template v-else-if="activeTab === 'brands'" id="panel-brands" role="tabpanel" aria-labelledby="tab-brands">

        <template v-for="catEntry in sortedBrandCat" :key="catEntry.id">

          <CatalogCatSep
            :cat-id="catEntry.id"
            :cat-name="catEntry.name"
            :show-migrate="true"
            :is-migrating="migratingCatId === catEntry.id"
            @delete="handleDeleteCat(catEntry.id)"
            @renamed="(n) => handleRenameCat(catEntry.id, n)"
            @toggle-migrate="toggleMigrateMode(catEntry.id)"
          />

          <!-- Placeholder for empty category -->
          <div
            v-if="catEntry.bids.length === 0"
            class="catalog__cat-empty"
            aria-label="Sin marcas en esta categoría"
          >
            Sin marcas asignadas
          </div>

          <!-- Normal brand rows -->
          <template v-else-if="migratingCatId !== catEntry.id">
            <BrandRow
              v-for="bid in catEntry.bids"
              :key="bid"
              :brand="getBrand(bid)"
              :to="`/catalog/${bid}`"
              :meta="`${getByBrand(bid).length} productos · ${getBrand(bid).origin}`"
              :stripe="brandStripe(bid)"
            >
              <template #badges>
                <span v-if="hasOutOfStock(bid)" class="badge badge--out"><i class="ti ti-ban"></i>Sin stock</span>
                <span v-if="hasLowStock(bid)"   class="badge badge--low"><i class="ti ti-alert-circle"></i>Stock bajo</span>
                <span v-if="hasExpiry(bid)"     class="badge badge--venc"><i class="ti ti-clock"></i>Por vencer</span>
              </template>
            </BrandRow>
          </template>

          <!-- Migrate mode: selectable brand rows -->
          <template v-else>
            <div
              v-for="bid in catEntry.bids"
              :key="bid"
              class="brand-row brand-row--selectable"
              :class="{ 'brand-row--selected': selectedBrandIds.has(bid) }"
              role="checkbox"
              :aria-checked="String(selectedBrandIds.has(bid))"
              :aria-label="getBrand(bid)?.name"
              tabindex="0"
              @click="toggleBrandSelect(bid)"
              @keydown.enter.prevent="toggleBrandSelect(bid)"
              @keydown.space.prevent="toggleBrandSelect(bid)"
            >
              <div class="brand-row__body">
                <div class="brand-row__header">
                  <div class="brand-row__check">
                    <i
                      class="ti"
                      :class="selectedBrandIds.has(bid) ? 'ti-circle-check' : 'ti-circle'"
                      aria-hidden="true"
                    ></i>
                  </div>
                  <div class="brand-row__icon" :style="{ background: getBrand(bid)?.bg }">
                    <i :class="`ti ${getBrand(bid)?.ic}`" :style="{ color: getBrand(bid)?.col }" aria-hidden="true"></i>
                  </div>
                  <div class="brand-row__info">
                    <div class="brand-row__name">{{ getBrand(bid)?.name }}</div>
                    <div class="brand-row__meta">{{ getByBrand(bid).length }} productos · {{ getBrand(bid)?.origin }}</div>
                  </div>
                </div>
              </div>
            </div>
          </template>

        </template>

        <!-- Brands not assigned to any category -->
        <template v-if="uncategorizedBrands.length">
          <CatalogCatSep
            cat-id="__sin_categoria__"
            cat-name="Sin categoría"
            :show-migrate="true"
            :show-delete="false"
            :show-edit="false"
            :is-migrating="migratingCatId === '__sin_categoria__'"
            @toggle-migrate="toggleMigrateMode('__sin_categoria__')"
          />

          <!-- Normal brand rows -->
          <template v-if="migratingCatId !== '__sin_categoria__'">
            <BrandRow
              v-for="bid in uncategorizedBrands"
              :key="bid"
              :brand="getBrand(bid)"
              :to="`/catalog/${bid}`"
              :meta="`${getByBrand(bid).length} productos · ${getBrand(bid).origin}`"
              :stripe="brandStripe(bid)"
            >
              <template #badges>
                <span v-if="hasOutOfStock(bid)" class="badge badge--out"><i class="ti ti-ban"></i>Sin stock</span>
                <span v-if="hasLowStock(bid)"   class="badge badge--low"><i class="ti ti-alert-circle"></i>Stock bajo</span>
                <span v-if="hasExpiry(bid)"     class="badge badge--venc"><i class="ti ti-clock"></i>Por vencer</span>
              </template>
            </BrandRow>
          </template>

          <!-- Migrate mode: selectable rows -->
          <template v-else>
            <div
              v-for="bid in uncategorizedBrands"
              :key="bid"
              class="brand-row brand-row--selectable"
              :class="{ 'brand-row--selected': selectedBrandIds.has(bid) }"
              role="checkbox"
              :aria-checked="String(selectedBrandIds.has(bid))"
              :aria-label="getBrand(bid)?.name"
              tabindex="0"
              @click="toggleBrandSelect(bid)"
              @keydown.enter.prevent="toggleBrandSelect(bid)"
              @keydown.space.prevent="toggleBrandSelect(bid)"
            >
              <div class="brand-row__body">
                <div class="brand-row__header">
                  <div class="brand-row__check">
                    <i
                      class="ti"
                      :class="selectedBrandIds.has(bid) ? 'ti-circle-check' : 'ti-circle'"
                      aria-hidden="true"
                    ></i>
                  </div>
                  <div class="brand-row__icon" :style="{ background: getBrand(bid)?.bg }">
                    <i :class="`ti ${getBrand(bid)?.ic}`" :style="{ color: getBrand(bid)?.col }" aria-hidden="true"></i>
                  </div>
                  <div class="brand-row__info">
                    <div class="brand-row__name">{{ getBrand(bid)?.name }}</div>
                    <div class="brand-row__meta">{{ getByBrand(bid).length }} productos · {{ getBrand(bid)?.origin }}</div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </template>

        <!-- Products with no brand -->
        <template v-if="unbrandedProducts.length">
          <div class="catalog__cat-sep catalog__cat-sep--no-actions">
            <span class="catalog__cat-label">Sin marca</span>
          </div>
          <ProductCard
            v-for="p in unbrandedProducts"
            :key="p.id"
            :product="p"
          />
        </template>

      </template>

      <div v-else id="panel-batches" class="batch-panel" role="tabpanel" aria-labelledby="tab-batches">
        <div v-if="allBatchFolders.length === 0" class="batch-empty">
          <i class="ti ti-folder-off" aria-hidden="true"></i>
          <p>Sin lotes registrados</p>
          <span>Creá un lote nuevo o clonalo desde el catálogo de una marca</span>
        </div>

        <template v-else>
          <div class="batch-folder-list">
            <div
              v-for="folder in allBatchFolders"
              :key="folder.batchNumber"
              class="batch-folder"
            >
              <div class="batch-folder__main">
                <div class="batch-folder__icon">
                  <i class="ti ti-folder" aria-hidden="true"></i>
                </div>
                <div class="batch-folder__body">
                  <div class="batch-folder__number">{{ folder.batchNumber }}</div>
                  <div class="batch-folder__meta">
                    {{ folderItemCount(folder) }} {{ folderItemCount(folder) === 1 ? 'producto' : 'productos' }} · vence {{ formatExpiry(folder.expiry) }}
                  </div>
                </div>
                <div class="batch-folder__right">
                  <span :class="['badge', expiryBadgeClass(folder.expiry)]">
                    {{ expiryBadgeLabel(folder.expiry) }}
                  </span>
                </div>
              </div>
              <div class="batch-folder__divider" aria-hidden="true"></div>
              <div class="batch-folder__actions">
                <button
                  class="batch-folder__action-btn"
                  :aria-label="`Ver lote ${folder.batchNumber}`"
                  @click="router.push(`/catalog/batch/${encodeURIComponent(folder.batchNumber)}`)"
                >
                  <i class="ti ti-folder-open" aria-hidden="true"></i>
                  Ver
                </button>
                <button
                  class="batch-folder__action-btn"
                  :aria-label="`Editar lote ${folder.batchNumber}`"
                  @click="openEdit(folder)"
                >
                  <i class="ti ti-edit" aria-hidden="true"></i>
                  Editar
                </button>
                <button
                  class="batch-folder__action-btn batch-folder__action-btn--danger"
                  :aria-label="`Eliminar lote ${folder.batchNumber}`"
                  @click="openDelete(folder)"
                >
                  <i class="ti ti-trash" aria-hidden="true"></i>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="spacer--sm"></div>
    </div>

    <!-- Migrate action bar -->
    <Transition name="fab-menu">
      <div v-if="migratingCatId" class="catalog__migrate-bar">
        <span class="catalog__migrate-count">
          {{ selectedBrandIds.size }} marca{{ selectedBrandIds.size !== 1 ? 's' : '' }}
        </span>
        <div class="catalog__migrate-actions">
          <button
            class="btn btn--ghost btn--sm"
            :aria-label="isAllBrandsSelected ? 'Deseleccionar todas' : 'Seleccionar todas'"
            @click="toggleSelectAllBrands"
          >
            <i class="ti" :class="isAllBrandsSelected ? 'ti-square-minus' : 'ti-select-all'" aria-hidden="true"></i>
            {{ isAllBrandsSelected ? 'Ninguna' : 'Todas' }}
          </button>
          <button class="btn btn--secondary btn--sm" @click="cancelMigrate">Cancelar</button>
          <button
            class="btn btn--primary btn--sm"
            :disabled="selectedBrandIds.size === 0"
            @click="openMigrateSheet"
          >
            Migrar
          </button>
        </div>
      </div>
    </Transition>

    <BottomNav />

    <!-- Clone sheets -->
    <CloneSheet
      v-model="showCreateSheet"
      @confirm="handleCreateConfirm"
      @cancel="showCreateSheet = false"
    />

    <CloneSheet
      v-model="showEditSheet"
      :edit-batch="selectedFolder ? { batchNumber: selectedFolder.batchNumber, expiry: selectedFolder.expiry } : null"
      @confirm="handleEditConfirm"
      @cancel="showEditSheet = false"
    />

    <!-- Delete batch confirmation -->
    <Transition name="sheet">
      <div
        v-if="showDeleteConfirm"
        class="sheet-overlay"
        role="dialog"
        aria-label="Confirmar eliminación de lote"
        @click.self="showDeleteConfirm = false"
      >
        <div class="sheet">
          <div class="sheet__handle" aria-hidden="true"></div>
          <div class="sheet__header">
            <div class="sheet__title">¿Eliminar lote?</div>
            <div class="sheet__sub">
              Se eliminarán {{ selectedFolderItemCount === 1 ? 'el producto' : `los ${selectedFolderItemCount} productos` }} dentro de "{{ selectedFolder?.batchNumber }}". Podés deshacer la acción.
            </div>
          </div>
          <div class="btn-group">
            <button class="btn btn--danger" @click="handleDeleteFolder">
              <i class="ti ti-trash" aria-hidden="true"></i>
              Sí, eliminar lote
            </button>
            <button class="btn btn--secondary" @click="showDeleteConfirm = false">Cancelar</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- New category sheet -->
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
              <label class="form-label" for="new-cat-name">Nombre</label>
              <input
                id="new-cat-name"
                name="new-cat-name"
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

    <!-- New brand sheet -->
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
              <label class="form-label" for="new-brand-name">Nombre</label>
              <input
                id="new-brand-name"
                name="new-brand-name"
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

    <!-- Migrate destination sheet -->
    <Transition name="sheet">
      <div
        v-if="showMigrateSheet"
        class="sheet-overlay"
        role="dialog"
        aria-label="Mover marcas"
        @click.self="showMigrateSheet = false"
      >
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
              <button
                v-for="cat in migrationTargets"
                :key="cat.id"
                class="catalog__migrate-dest-item"
                :class="{ 'catalog__migrate-dest-item--selected': migrateTargetId === cat.id }"
                role="option"
                :aria-selected="migrateTargetId === cat.id"
                @click="migrateTargetId = cat.id"
              >
                <span>{{ cat.name }}</span>
                <i
                  v-if="migrateTargetId === cat.id"
                  class="ti ti-check"
                  aria-hidden="true"
                ></i>
              </button>
            </div>
          </div>
          <div class="btn-group">
            <button
              class="btn btn--primary"
              :disabled="!migrateTargetId"
              @click="confirmMigrate"
            >
              <i class="ti ti-arrows-exchange" aria-hidden="true"></i>
              Mover marcas
            </button>
            <button class="btn btn--secondary" @click="showMigrateSheet = false">Cancelar</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ─── AJUSTES SHEET ─────────────────────────────────────────────── -->
    <Transition name="sheet">
      <div
        v-if="showAjustesSheet"
        class="sheet-overlay"
        role="dialog"
        aria-label="Ajustes del catálogo"
        @click.self="closeAjustesSheet"
      >
        <div class="sheet sheet--tall">
          <div class="sheet__handle" aria-hidden="true"></div>
          <div class="sheet__header">
            <div class="sheet__title">Ajustes</div>
            <div class="sheet__sub">Renombra o elimina marcas y categorías</div>
          </div>

          <div class="sheet__body sheet__body--scroll">

            <div class="topbar__search ajustes__search">
              <i class="ti ti-search" aria-hidden="true"></i>
              <input
                id="ajustes-search"
                name="ajustes-search"
                type="search"
                v-model="ajustesSearchQuery"
                placeholder="Buscar marcas y categorías…"
                aria-label="Buscar marcas y categorías"
              />
              <button
                v-if="ajustesSearchQuery"
                class="topbar__search-clear"
                type="button"
                @click="ajustesSearchQuery = ''"
                aria-label="Limpiar búsqueda"
              >
                <i class="ti ti-x" aria-hidden="true"></i>
              </button>
            </div>

            <!-- SECTION: Grupos (brand categories) -->
            <p class="ajustes__section-label">
              <i class="ti ti-folder" aria-hidden="true"></i>
              Categorías de marcas
            </p>
            <div class="ajustes__list" role="list">
              <div
                v-for="cat in filteredAjustesCategories"
                :key="cat.id"
                class="ajustes__item"
                role="listitem"
              >
                <template v-if="ajustesEditingCatId === cat.id">
                  <input
                    :id="`ajustes-cat-${cat.id}`"
                    class="ajustes__edit-input"
                    v-model="ajustesEditValue"
                    autocomplete="off"
                    :ref="el => { if (el) ajustesInputRefs[cat.id] = el }"
                    @keydown.enter.prevent="confirmAjustesCatRename(cat.id)"
                    @keydown.escape="cancelAjustesEdit"
                  />
                  <span v-if="ajustesEditError" class="ajustes__edit-error" role="alert">{{ ajustesEditError }}</span>
                  <div class="ajustes__item-actions">
                    <button class="ajustes__confirm-btn" aria-label="Confirmar" @click="confirmAjustesCatRename(cat.id)">
                      <i class="ti ti-check" aria-hidden="true"></i>
                    </button>
                    <button class="ajustes__cancel-btn" aria-label="Cancelar" @click="cancelAjustesEdit">
                      <i class="ti ti-x" aria-hidden="true"></i>
                    </button>
                  </div>
                </template>
                <template v-else>
                  <div class="ajustes__item-icon ajustes__item-icon--cat">
                    <i class="ti ti-folder" aria-hidden="true"></i>
                  </div>
                  <div class="ajustes__item-info">
                    <span class="ajustes__item-name">{{ cat.name }}</span>
                    <span class="ajustes__item-meta">{{ cat.brandIds.length }} marca{{ cat.brandIds.length !== 1 ? 's' : '' }}</span>
                  </div>
                  <div class="ajustes__item-actions">
                    <button
                      class="ajustes__action-btn"
                      :aria-label="`Renombrar ${cat.name}`"
                      @click="startAjustesCatEdit(cat)"
                    >
                      <i class="ti ti-pencil" aria-hidden="true"></i>
                    </button>
                    <button
                      class="ajustes__action-btn ajustes__action-btn--danger"
                      :aria-label="`Eliminar ${cat.name}`"
                      @click="handleAjustesDeleteCat(cat.id)"
                    >
                      <i class="ti ti-trash" aria-hidden="true"></i>
                    </button>
                  </div>
                </template>
              </div>
              <div v-if="filteredAjustesCategories.length === 0" class="ajustes__empty">
                No se encontraron categorías
              </div>
            </div>

            <!-- SECTION: Marcas -->
            <p class="ajustes__section-label ajustes__section-label--mt">
              <i class="ti ti-building-store" aria-hidden="true"></i>
              Marcas
            </p>
            <div class="ajustes__list" role="list">
              <div
                v-for="brand in filteredAjustesBrands"
                :key="brand.id"
                class="ajustes__item"
                role="listitem"
              >
                <template v-if="ajustesEditingBrandId === brand.id">
                  <input
                    :id="`ajustes-brand-${brand.id}`"
                    class="ajustes__edit-input"
                    v-model="ajustesEditValue"
                    autocomplete="off"
                    :ref="el => { if (el) ajustesInputRefs[brand.id] = el }"
                    @keydown.enter.prevent="confirmAjustesBrandRename(brand.id)"
                    @keydown.escape="cancelAjustesEdit"
                  />
                  <span v-if="ajustesEditError" class="ajustes__edit-error" role="alert">{{ ajustesEditError }}</span>
                  <div class="ajustes__item-actions">
                    <button class="ajustes__confirm-btn" aria-label="Confirmar" @click="confirmAjustesBrandRename(brand.id)">
                      <i class="ti ti-check" aria-hidden="true"></i>
                    </button>
                    <button class="ajustes__cancel-btn" aria-label="Cancelar" @click="cancelAjustesEdit">
                      <i class="ti ti-x" aria-hidden="true"></i>
                    </button>
                  </div>
                </template>
                <template v-else>
                  <div
                    class="ajustes__item-icon"
                    :style="{ background: brand.bg }"
                  >
                    <i :class="`ti ${brand.ic}`" :style="{ color: brand.col }" aria-hidden="true"></i>
                  </div>
                  <div class="ajustes__item-info">
                    <span class="ajustes__item-name">{{ brand.name }}</span>
                    <span class="ajustes__item-meta">{{ getByBrand(brand.id).length }} productos</span>
                  </div>
                  <div class="ajustes__item-actions">
                    <button
                      class="ajustes__action-btn"
                      :aria-label="`Renombrar ${brand.name}`"
                      @click="startAjustesBrandEdit(brand)"
                    >
                      <i class="ti ti-pencil" aria-hidden="true"></i>
                    </button>
                    <button
                      class="ajustes__action-btn ajustes__action-btn--danger"
                      :aria-label="`Eliminar ${brand.name}`"
                      @click="handleAjustesDeleteBrand(brand.id)"
                    >
                      <i class="ti ti-trash" aria-hidden="true"></i>
                    </button>
                  </div>
                </template>
              </div>
              <div v-if="filteredAjustesBrands.length === 0" class="ajustes__empty">
                No se encontraron marcas
              </div>
            </div>

          </div>

          <div class="btn-group">
            <button class="btn btn--secondary" @click="closeAjustesSheet">Cerrar</button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore }       from '../stores/products.js'
import { useBrandCategoriesStore } from '../stores/brandCategories.js'
import TopBar        from '../components/layout/TopBar.vue'
import BottomNav     from '../components/layout/BottomNav.vue'
import BrandRow      from '../components/ui/BrandRow.vue'
import ProductCard   from '../components/ui/ProductCard.vue'
import CloneSheet    from '../components/ui/CloneSheet.vue'
import CatalogCatSep from '../components/ui/CatalogCatSep.vue'

const route    = useRoute()
const router   = useRouter()
const store    = useProductsStore()
const catStore = useBrandCategoriesStore()

const { getBrand, getByBrand, pct } = store

const searchQuery = ref('')
const activeTab   = ref(route.query.tab === 'batches' ? 'batches' : 'brands')

// ─── BATCH STATE ─────────────────────────────────────────────────────────────

const selectedFolder    = ref(null)
const showCreateSheet   = ref(false)
const showEditSheet     = ref(false)
const showDeleteConfirm = ref(false)

watch(() => route.query.newBatch, (val) => {
  if (val === '1') {
    activeTab.value       = 'batches'
    showCreateSheet.value = true
    router.replace({ query: { tab: 'batches' } })
  }
}, { immediate: true })

// ─── NEW CATEGORY STATE ───────────────────────────────────────────────────────

const showNewCatSheet = ref(false)
const newCatName      = ref('')
const newCatError     = ref('')
const newCatInputRef  = ref(null)

watch(() => route.query.newCategory, (val) => {
  if (val === '1') {
    activeTab.value       = 'brands'
    showNewCatSheet.value = true
    router.replace({ query: { tab: 'brands' } })
  }
}, { immediate: true })

watch(showNewCatSheet, val => {
  if (val) {
    newCatName.value  = ''
    newCatError.value = ''
    nextTick(() => newCatInputRef.value?.focus())
  }
})

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

function closeNewCatSheet() {
  showNewCatSheet.value = false
  newCatName.value      = ''
  newCatError.value     = ''
}

// ─── NEW BRAND STATE ──────────────────────────────────────────────────────────

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

// ─── CATEGORY CRUD ───────────────────────────────────────────────────────────

function handleDeleteCat(id) {
  if (migratingCatId.value === id) cancelMigrate()
  catStore.markDeleteCat(id)
}

function handleRenameCat(id, newName) {
  catStore.renameCategory(id, newName)
}

// ─── AJUSTES SHEET ────────────────────────────────────────────────────────────

const showAjustesSheet      = ref(false)
const ajustesEditingCatId   = ref(null)
const ajustesEditingBrandId = ref(null)
const ajustesEditValue      = ref('')
const ajustesEditError      = ref('')
const ajustesInputRefs      = ref({})
const ajustesSearchQuery    = ref('')

const filteredAjustesCategories = computed(() => {
  const q = ajustesSearchQuery.value.trim().toLowerCase()
  if (!q) return catStore.sortedCategories
  return catStore.sortedCategories.filter(cat => {
    if (cat.name.toLowerCase().includes(q)) return true
    return cat.brandIds.some(bid => {
      const brand = getBrand(bid)
      return brand?.name.toLowerCase().includes(q)
    })
  })
})

const filteredAjustesBrands = computed(() => {
  const q = ajustesSearchQuery.value.trim().toLowerCase()
  if (!q) return store.sortedBrands
  return store.sortedBrands.filter(brand => brand.name.toLowerCase().includes(q))
})

function closeAjustesSheet() {
  showAjustesSheet.value      = false
  ajustesEditingCatId.value   = null
  ajustesEditingBrandId.value = null
  ajustesEditValue.value      = ''
  ajustesEditError.value      = ''
}

// Category edit in ajustes
function startAjustesCatEdit(cat) {
  ajustesEditingBrandId.value = null
  ajustesEditingCatId.value   = cat.id
  ajustesEditValue.value      = cat.name
  ajustesEditError.value      = ''
  nextTick(() => ajustesInputRefs.value[cat.id]?.focus())
}

function confirmAjustesCatRename(id) {
  const val = ajustesEditValue.value.trim()
  if (!val) {
    ajustesEditError.value = 'El nombre no puede quedar vacío'
    return
  }
  const cat = catStore.categories.find(c => c.id === id)
  if (!cat) return
  if (val === cat.name) { cancelAjustesEdit(); return }
  const err = catStore.renameCategory(id, val)
  if (err) {
    ajustesEditError.value = err
    return
  }
  ajustesEditingCatId.value = null
  ajustesEditError.value    = ''
}

function handleAjustesDeleteCat(id) {
  if (migratingCatId.value === id) cancelMigrate()
  catStore.markDeleteCat(id)
  ajustesEditingCatId.value = null
}

// Brand edit in ajustes
function startAjustesBrandEdit(brand) {
  ajustesEditingCatId.value   = null
  ajustesEditingBrandId.value = brand.id
  ajustesEditValue.value      = brand.name
  ajustesEditError.value      = ''
  nextTick(() => ajustesInputRefs.value[brand.id]?.focus())
}

function confirmAjustesBrandRename(id) {
  const val = ajustesEditValue.value.trim()
  if (!val) {
    ajustesEditError.value = 'El nombre no puede quedar vacío'
    return
  }
  const brand = store.brands.find(b => b.id === id)
  if (!brand) return
  if (val === brand.name) { cancelAjustesEdit(); return }
  if (store.brands.some(b => b.id !== id && b.name === val)) {
    ajustesEditError.value = 'Ya existe una marca con ese nombre'
    return
  }
  store.editBrandName(id, val)
  ajustesEditingBrandId.value = null
  ajustesEditError.value      = ''
}

function handleAjustesDeleteBrand(id) {
  // markDeleteBrand already migrates products to 'Sin marca'
  store.markDeleteBrand(id)
  ajustesEditingBrandId.value = null
  // Also remove brand from its category
  const cat = catStore.getCategoryForBrand(id)
  if (cat) {
    catStore.categories.find(c => c.id === cat.id)
      ?.brandIds.splice(
        catStore.categories.find(c => c.id === cat.id).brandIds.indexOf(id),
        1
      )
  }
}

function cancelAjustesEdit() {
  ajustesEditingCatId.value   = null
  ajustesEditingBrandId.value = null
  ajustesEditValue.value      = ''
  ajustesEditError.value      = ''
}

// ─── MIGRATE STATE ────────────────────────────────────────────────────────────

const migratingCatId   = ref(null)
const selectedBrandIds = ref(new Set())
const showMigrateSheet = ref(false)
const migrateTargetId  = ref(null)

const migratingCatName = computed(() => {
  if (migratingCatId.value === '__sin_categoria__') return 'Sin categoría'
  return catStore.categories.find(c => c.id === migratingCatId.value)?.name ?? ''
})

const migrationTargets = computed(() =>
  catStore.sortedCategories.filter(c => c.id !== migratingCatId.value)
)

const currentCatBrands = computed(() => {
  if (!migratingCatId.value) return []
  if (migratingCatId.value === '__sin_categoria__') return uncategorizedBrands.value
  return sortedBrandCat.value.find(c => c.id === migratingCatId.value)?.bids ?? []
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
    migratingCatId.value   = catId
    selectedBrandIds.value = new Set()
  }
}

function cancelMigrate() {
  migratingCatId.value   = null
  selectedBrandIds.value = new Set()
  showMigrateSheet.value = false
  migrateTargetId.value  = null
}

function toggleBrandSelect(bid) {
  const s = new Set(selectedBrandIds.value)
  if (s.has(bid)) s.delete(bid)
  else s.add(bid)
  selectedBrandIds.value = s
}

function openMigrateSheet() {
  if (selectedBrandIds.value.size === 0) return
  migrateTargetId.value  = null
  showMigrateSheet.value = true
}

function confirmMigrate() {
  if (!migrateTargetId.value) return
  catStore.markMoveBrands(
    [...selectedBrandIds.value],
    migratingCatId.value === '__sin_categoria__' ? null : migratingCatId.value,
    migrateTargetId.value
  )
  showMigrateSheet.value = false
  migratingCatId.value   = null
  selectedBrandIds.value = new Set()
  migrateTargetId.value  = null
}

// ─── BATCH HANDLERS ───────────────────────────────────────────────────────────

function openEdit(folder) {
  selectedFolder.value = folder
  showEditSheet.value  = true
}

function openDelete(folder) {
  selectedFolder.value    = folder
  showDeleteConfirm.value = true
}

function handleCreateConfirm({ batchNumber, expiry }) {
  store.addEmptyBatchFolder(batchNumber, expiry)
  showCreateSheet.value = false
}

function handleEditConfirm({ batchNumber, expiry }) {
  store.editBatchFolder(selectedFolder.value.batchNumber, { batchNumber, expiry })
  showEditSheet.value  = false
  selectedFolder.value = null
}

function handleDeleteFolder() {
  store.markDeleteBatchFolder(selectedFolder.value.batchNumber)
  showDeleteConfirm.value = false
  selectedFolder.value    = null
}

function folderItemCount(folder) {
  return folder.brandGroups.reduce((sum, g) => sum + g.items.length, 0)
}

// ─── COMPUTED ─────────────────────────────────────────────────────────────────

const allBatchFolders = computed(() => store.getAllBatchFolders())

const totalBatchFolders = computed(() => allBatchFolders.value.length)

const selectedFolderItemCount = computed(() =>
  selectedFolder.value ? folderItemCount(selectedFolder.value) : 0
)

const sortedBrandCat = computed(() =>
  catStore.sortedCategories.map(cat => {
    const bids = cat.brandIds
      .filter(bid => getBrand(bid))
      .sort((a, b) => (getBrand(a)?.name ?? '').localeCompare(getBrand(b)?.name ?? '', 'es'))
    return { id: cat.id, name: cat.name, bids }
  })
)

const totalBrands = computed(() =>
  sortedBrandCat.value.reduce((sum, { bids }) => sum + bids.length, 0)
)

const uncategorizedBrands = computed(() => {
  const categorizedIds = new Set(catStore.categories.flatMap(c => c.brandIds))
  return store.brands
    .filter(b => !categorizedIds.has(b.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .map(b => b.id)
})

const unbrandedProducts = computed(() =>
  store.products.filter(p => !p.bid || !store.getBrand(p.bid))
)

const filteredProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  const result = []
  for (const cat of catStore.categories) {
    for (const bid of cat.brandIds) {
      const brand = getBrand(bid)
      const brandMatches = brand?.name.toLowerCase().includes(q)
      for (const p of getByBrand(bid)) {
        if (brandMatches || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) {
          result.push(p)
        }
      }
    }
  }
  for (const p of unbrandedProducts.value) {
    if (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) {
      result.push(p)
    }
  }
  return result
})

const filteredBatchFolders = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  return allBatchFolders.value.filter(f => f.batchNumber.toLowerCase().includes(q))
})

const filteredBatchProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  return store.products.filter(p =>
    p._batchOnly && (
      p.name.toLowerCase().includes(q) ||
      (p.sku?.toLowerCase()   ?? '').includes(q) ||
      (p.brand?.toLowerCase() ?? '').includes(q) ||
      (p.batch?.toLowerCase() ?? '').includes(q)
    )
  )
})

const prods         = bid => getByBrand(bid)
const hasOutOfStock = bid => prods(bid).some(p => p.stock === 0)
const hasLowStock   = bid => prods(bid).some(p => p.stock > 0 && pct(p) < 25)
const hasExpiry     = bid => prods(bid).some(p => !!p.expiry)
const brandStripe   = bid => {
  if (hasOutOfStock(bid)) return '#791132'
  if (hasLowStock(bid))   return '#90542f'
  if (hasExpiry(bid))     return '#534AB7'
  return ''
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