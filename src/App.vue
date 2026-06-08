<template>
  <div class="phone-shell__frame">
    <router-view />
    <transition name="toast">
        <div v-if="productsStore.pendingDelete" class="toast" role="alert" aria-live="assertive">
          <span class="toast__msg">Producto eliminado</span>
          <button class="toast__undo" @click="productsStore.undoDelete()">Deshacer</button>
        </div>
        <div v-else-if="ordersStore.pendingDeleteOrder" class="toast" role="alert" aria-live="assertive">
          <span class="toast__msg">Pedido eliminado</span>
          <button class="toast__undo" @click="ordersStore.undoDeleteOrder()">Deshacer</button>
        </div>
        <div v-else-if="productsStore.productUpdated" class="toast" role="status" aria-live="polite">
          <span class="toast__msg">Producto actualizado</span>
        </div>
        <div v-else-if="productsStore.pendingDeleteBrand" class="toast" role="alert" aria-live="assertive">
          <span class="toast__msg">Marca eliminada</span>
          <button class="toast__undo" @click="productsStore.undoDeleteBrand()">Deshacer</button>
        </div>
        <div v-else-if="productsStore.pendingDeleteCategory" class="toast" role="alert" aria-live="assertive">
          <span class="toast__msg">Categoría eliminada</span>
          <button class="toast__undo" @click="productsStore.undoDeleteCategory()">Deshacer</button>
        </div>
        <div v-else-if="productsStore.pendingDeleteBatchFolder" class="toast" role="alert" aria-live="assertive">
          <span class="toast__msg">Lote eliminado</span>
          <button class="toast__undo" @click="productsStore.undoDeleteBatchFolder()">Deshacer</button>
        </div>
        <div v-else-if="productsStore.pendingDeleteBatchItem" class="toast" role="alert" aria-live="assertive">
          <span class="toast__msg">Producto quitado del lote</span>
          <button class="toast__undo" @click="productsStore.undoDeleteBatchItem()">Deshacer</button>
        </div>
        <div v-else-if="productsStore.pendingDeleteProductCat" class="toast" role="alert" aria-live="assertive">
          <span class="toast__msg">Categoría eliminada</span>
          <button class="toast__undo" @click="productsStore.undoDeleteCategoryInBrand()">Deshacer</button>
        </div>
        <div v-else-if="catStore.pendingDeleteCat" class="toast" role="alert" aria-live="assertive">
          <span class="toast__msg">Grupo eliminado</span>
          <button class="toast__undo" @click="catStore.undoDeleteCat()">Deshacer</button>
        </div>
        <div v-else-if="catStore.pendingMoveBrands" class="toast" role="alert" aria-live="assertive">
          <span class="toast__msg">{{ catStore.pendingMoveBrands.brandIds.length === 1 ? 'Marca movida' : 'Marcas movidas' }}</span>
          <button class="toast__undo" @click="catStore.undoMoveBrands()">Deshacer</button>
        </div>
      </transition>
  </div>
</template>

<script setup>
import { useProductsStore }        from './stores/products.js'
import { useOrdersStore }          from './stores/orders.js'
import { useBrandCategoriesStore } from './stores/brandCategories.js'

const productsStore = useProductsStore()
const ordersStore   = useOrdersStore()
const catStore      = useBrandCategoriesStore()
</script>