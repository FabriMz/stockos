<template>
  <!-- Variant icon-only: solo gear + menú, sin wrapper de fila -->
  <template v-if="variant === 'icon-only'">
    <button ref="gearBtnRef" class="catalog__cat-gear-btn"
      :class="{ 'catalog__cat-gear-btn--active': isMigrating || isEditing, 'catalog__cat-gear-btn--open': menuOpen }"
      :aria-label="`Opciones de ${catName}`" :aria-expanded="String(menuOpen)" :aria-haspopup="true"
      @click.stop="toggleMenu">
      <i class="ti ti-settings" aria-hidden="true"></i>
    </button>

    <Teleport to="body">
      <div v-if="menuOpen" class="cat-sep-backdrop" @click="menuOpen = false" aria-hidden="true"></div>
      <Transition name="cat-sep-menu">
        <div v-if="menuOpen" class="cat-sep-menu" :style="menuStyle" role="menu" @click.stop
          :aria-label="`Opciones de ${catName}`">
          <div v-if="showMigrate" class="cat-sep-menu__item">
            <button class="cat-sep-menu__btn" :class="{ 'cat-sep-menu__btn--active': isMigrating }" role="menuitem"
              :aria-label="isMigrating ? `Cancelar migración de ${catName}` : `${migrateLabel} de ${catName}`"
              @click="handleMigrate">
              <i class="ti ti-arrows-exchange" aria-hidden="true"></i>
              <span>{{ isMigrating ? 'Cancelar migración' : migrateLabel }}</span>
            </button>
          </div>
          <div v-if="showEdit" class="cat-sep-menu__item">
            <button class="cat-sep-menu__btn" role="menuitem" :aria-label="`Renombrar ${catName}`"
              @click="handleRename">
              <i class="ti ti-pencil" aria-hidden="true"></i>
              <span>Renombrar</span>
            </button>
          </div>
          <div v-if="showDelete" class="cat-sep-menu__item">
            <button class="cat-sep-menu__btn cat-sep-menu__btn--danger" role="menuitem"
              :aria-label="`Eliminar ${catName}`" @click="handleDelete">
              <i class="ti ti-trash" aria-hidden="true"></i>
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Rename inline en icon-only: input flotante sobre el header del acordeón -->
    <Teleport to="body">
      <Transition name="cat-sep-menu">
        <div v-if="isEditing" class="cat-sep-rename-overlay" :style="menuStyle" @click.self="cancelEdit">
          <input :id="`cat-edit-${catId}`" :name="`cat-edit-${catId}`"
            class="catalog__cat-edit-input cat-sep-rename-overlay__input" v-model="editValue"
            :aria-label="`Renombrar ${catName}`" :aria-describedby="editError ? `cat-edit-error-${catId}` : undefined"
            autocomplete="off" ref="inputRef" @keydown.enter.prevent="confirmRename" @keydown.escape="cancelEdit" />
          <button type="button" class="cat-sep-rename-overlay__confirm-btn"
            :aria-label="`Confirmar renombrar ${catName}`" @click.stop="confirmRename">
            <i class="ti ti-check" aria-hidden="true"></i>
          </button>
          <p v-if="editError" :id="`cat-edit-error-${catId}`" class="catalog__cat-edit-error" role="alert">{{ editError
            }}</p>
        </div>
      </Transition>
    </Teleport>
  </template>

  <!-- Variant default: fila completa -->
  <div v-else class="catalog__cat-sep" :class="{ 'catalog__cat-sep--migrating': isMigrating }">
    <template v-if="isEditing">
      <input :id="`cat-edit-${catId}`" :name="`cat-edit-${catId}`" class="catalog__cat-edit-input" v-model="editValue"
        :aria-label="`Renombrar ${catName}`" :aria-describedby="editError ? `cat-edit-error-${catId}` : undefined"
        autocomplete="off" ref="inputRef" @keydown.enter.prevent="confirmRename" @keydown.escape="cancelEdit" />
      <button type="button" class="catalog__cat-confirm-btn" :aria-label="`Confirmar renombrar ${catName}`"
        @click.stop="confirmRename">
        <i class="ti ti-check" aria-hidden="true"></i>
      </button>
      <p v-if="editError" :id="`cat-edit-error-${catId}`" class="catalog__cat-edit-error" role="alert">{{ editError }}
      </p>
    </template>
    <span v-else class="catalog__cat-label">{{ catName }}</span>
    <span v-if="!isEditing" class="catalog__cat-dots" aria-hidden="true"></span>

    <button v-if="!isEditing" ref="gearBtnRef" class="catalog__cat-gear-btn"
      :class="{ 'catalog__cat-gear-btn--active': isMigrating || isEditing, 'catalog__cat-gear-btn--open': menuOpen }"
      :aria-label="`Opciones de ${catName}`" :aria-expanded="String(menuOpen)" :aria-haspopup="true"
      @click.stop="toggleMenu">
      <i class="ti ti-settings" aria-hidden="true"></i>
    </button>

    <Teleport to="body">
      <div v-if="menuOpen" class="cat-sep-backdrop" @click="menuOpen = false" aria-hidden="true"></div>
      <Transition name="cat-sep-menu">
        <div v-if="menuOpen" class="cat-sep-menu" :style="menuStyle" role="menu" @click.stop
          :aria-label="`Opciones de ${catName}`">
          <div v-if="showMigrate" class="cat-sep-menu__item">
            <button class="cat-sep-menu__btn" :class="{ 'cat-sep-menu__btn--active': isMigrating }" role="menuitem"
              :aria-label="isMigrating ? `Cancelar migración de ${catName}` : `${migrateLabel} de ${catName}`"
              @click="handleMigrate">
              <i class="ti ti-arrows-exchange" aria-hidden="true"></i>
              <span>{{ isMigrating ? 'Cancelar migración' : migrateLabel }}</span>
            </button>
          </div>
          <div v-if="showEdit" class="cat-sep-menu__item">
            <button class="cat-sep-menu__btn" role="menuitem" :aria-label="`Renombrar ${catName}`"
              @click="handleRename">
              <i class="ti ti-pencil" aria-hidden="true"></i>
              <span>Renombrar</span>
            </button>
          </div>
          <div v-if="showDelete" class="cat-sep-menu__item">
            <button class="cat-sep-menu__btn cat-sep-menu__btn--danger" role="menuitem"
              :aria-label="`Eliminar ${catName}`" @click="handleDelete">
              <i class="ti ti-trash" aria-hidden="true"></i>
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useBrandCategoriesStore } from '../../stores/brandCategories.js'

const props = defineProps({
  catId: { type: String, required: true },
  catName: { type: String, required: true },
  showMigrate: { type: Boolean, default: false },
  showDelete: { type: Boolean, default: true },
  showEdit: { type: Boolean, default: true },
  isMigrating: { type: Boolean, default: false },
  migrateLabel: { type: String, default: 'Migrar marcas' },
  variant: { type: String, default: 'default' }, // 'default' | 'icon-only'
})

const emit = defineEmits(['delete', 'renamed', 'toggle-migrate'])

const catStore = useBrandCategoriesStore()
const isEditing = ref(false)
const editValue = ref('')
const editError = ref('')
const inputRef = ref(null)
const gearBtnRef = ref(null)
const menuOpen = ref(false)
const menuStyle = ref({})

function toggleMenu() {
  if (menuOpen.value) {
    menuOpen.value = false
    return
  }
  const btn = gearBtnRef.value
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  menuStyle.value = {
    top: `${rect.bottom + 6}px`,
    right: `${window.innerWidth - rect.right}px`,
  }
  menuOpen.value = true
}

function handleDelete() {
  menuOpen.value = false
  emit('delete')
}

function handleRename() {
  menuOpen.value = false
  startEdit()
}

function handleMigrate() {
  menuOpen.value = false
  emit('toggle-migrate')
}

function startEdit() {
  editValue.value = props.catName
  editError.value = ''

  if (props.variant === 'icon-only') {
    const btn = gearBtnRef.value
    const header = btn?.closest('.cat-accordion__header')
    const anchor = header ?? btn
    if (anchor) {
      const rect = anchor.getBoundingClientRect()
      menuStyle.value = {
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      }
    }
  }

  isEditing.value = true
  nextTick(() => inputRef.value?.focus())
}

function cancelEdit() {
  isEditing.value = false
  editError.value = ''
}

function confirmRename() {
  const val = editValue.value.trim()
  if (!val) {
    editError.value = 'El nombre no puede quedar vacío'
    return
  }
  if (val === props.catName) {
    cancelEdit()
    return
  }
  if (catStore.categories.some(c => c.name === val && c.id !== props.catId)) {
    editError.value = 'Ya existe un grupo con ese nombre'
    return
  }
  emit('renamed', val)
  isEditing.value = false
  editError.value = ''
}
</script>