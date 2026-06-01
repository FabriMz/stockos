<template>
  <div class="screen" v-if="product">
    <TopBar
      variant="back"
      :back-label="backLabel"
      :back-to="backTo"
      title="Detalle"
    >
    </TopBar>

    <div class="scroll-content">
      <div class="detail__header">
        <div class="detail__icon" :style="{ background: product.bg }">
          <img v-if="product.img" :src="product.img" :alt="product.name" class="detail__icon-img">
          <i v-else :class="`ti ${product.ic}`" :style="{ color: product.col }" aria-hidden="true"></i>
        </div>
        <div class="detail__name">{{ product.name }}</div>
        <div class="detail__badge-wrap">
          <StockBadge :product="product" />
        </div>
        <div class="detail__row"><span class="detail__row-label">Marca</span><span class="detail__row-value">{{ product.brand }}</span></div>
        <div class="detail__row"><span class="detail__row-label">SKU</span><span class="detail__row-value">{{ product.sku }}</span></div>
        <div class="detail__row"><span class="detail__row-label">Contenido</span><span class="detail__row-value">{{ product.size }}</span></div>
        <div class="detail__row"><span class="detail__row-label">Origen</span><span class="detail__row-value">{{ product.origin }}</span></div>
        <div class="detail__row"><span class="detail__row-label">Uds. por caja</span><span class="detail__row-value">{{ product.unitsPerBox }}</span></div>
        <div class="detail__row"><span class="detail__row-label">Descuento</span><span class="detail__row-value">26%</span></div>
        <div class="detail__row"><span class="detail__row-label">Nº de lote</span><span class="detail__row-value">{{ product.batch || 'S/N' }}</span></div>
        <div v-if="product.expiry" class="detail__row">
          <span class="detail__row-label">Vencimiento</span>
          <span class="detail__row-value detail__row-value--warn">{{ product.expiry }}</span>
        </div>
      </div>

      <div class="spacer--xs"></div>

      <div class="detail__section">
        <div class="detail__section-title">Precios</div>
        <div class="detail__prices">
          <div class="detail__price-col">
            <div class="detail__price-label">Costo IVA inc.</div>
            <div class="detail__price-value">{{ currencyStore.formatProductPrice(product.cost) }}</div>
          </div>
          <div class="detail__price-col">
            <div class="detail__price-label">PVP sugerido</div>
            <div class="detail__price-value detail__price-value--success">{{ currencyStore.formatProductPrice(product.price) }}</div>
          </div>
        </div>
        <div class="detail__prices detail__prices--secondary">
          <button
            class="detail__price-col detail__currency-col"
            @click.stop="currencyStore.toggleCurrency()"
            :aria-label="`Cambiar a ${currencyStore.currency === 'UYU' ? 'dólares' : 'pesos uruguayos'}`"
          >
            <div class="detail__price-label">Moneda</div>
            <div class="detail__price-value">{{ currencyStore.currency }}</div>
          </button>
          <div class="detail__price-col">
            <div class="detail__price-label">Margen estimado</div>
            <div class="detail__price-value detail__price-value--success">{{ margen }}%</div>
          </div>
        </div>
      </div>

      <div class="spacer--xs"></div>

      <div class="detail__section">
        <div class="detail__section-title">Stock actual</div>
        <div
          class="stock-bar stock-bar--full"
          role="progressbar"
          :aria-valuenow="pct"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="stock-bar__fill" :class="fillClass" :style="{ width: pct + '%' }"></div>
        </div>
        <div class="stock-nums">
          <span>{{ product.stock }} uds. en stock</span>
          <span>cap. {{ product.max }} uds.</span>
        </div>
        <p class="detail__reorder-hint">
          Mín. reposición: 1 caja = {{ product.unitsPerBox }} uds.
        </p>
      </div>

      <div class="spacer--xs"></div>

      <div class="detail__actions" v-if="!confirming">
        <button class="btn btn--primary" @click="goEdit">
          <i class="ti ti-edit" aria-hidden="true"></i>Editar
        </button>
        <button class="btn btn--danger" @click="confirming = true">
          <i class="ti ti-trash" aria-hidden="true"></i>Eliminar
        </button>
      </div>
      <div class="form-view__delete-confirm" v-else>
        <span class="form-view__delete-confirm__msg">¿Eliminar este producto?</span>
        <div class="form-view__delete-confirm__btns">
          <button class="btn btn--danger" @click="remove">
            <i class="ti ti-trash" aria-hidden="true"></i>Sí, remover
          </button>
          <button class="btn btn--secondary" @click="confirming = false">No, cancelar</button>
        </div>
      </div>

      <div class="spacer--sm"></div>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore } from '../stores/products.js'
import { useCurrencyStore }  from '../stores/currency.js'
import { resolveAlertBack } from '../composables/useAlertNavigation.js'
import TopBar    from '../components/layout/TopBar.vue'
import BottomNav from '../components/layout/BottomNav.vue'
import StockBadge from '../components/ui/StockBadge.vue'

const route         = useRoute()
const router        = useRouter()
const store         = useProductsStore()
const currencyStore = useCurrencyStore()
const product       = computed(() => store.getProduct(route.params.id))

const confirming = ref(false)

const alertBack = computed(() => resolveAlertBack(route.query, product.value))
const backTo    = computed(() => alertBack.value?.to ?? `/catalog/${product.value?.bid}`)
const backLabel = computed(() => alertBack.value?.label ?? product.value?.brand ?? 'Atrás')
const margen    = computed(() => product.value ? (((product.value.price - product.value.cost) / product.value.price) * 100).toFixed(0) : 0)
const pct       = computed(() => product.value ? store.pct(product.value) : 0)

function goEdit() {
  router.push({ path: `/product/${product.value.id}/edit`, query: route.query })
}

function remove() {
  if (route.query.from === 'batch') {
    const { batchNum } = route.query
    store.markDelete(product.value.id)
    router.push(`/catalog/batch/${encodeURIComponent(batchNum)}`)
  } else {
    const bid = product.value.bid
    store.markDelete(product.value.id)
    router.push(`/catalog/${bid}`)
  }
}

const fillClass = computed(() => {
  if (!product.value) return ''
  if (product.value.stock === 0) return 'stock-bar__fill--out'
  if (pct.value < 25) return 'stock-bar__fill--low'
  return 'stock-bar__fill--ok'
})
</script>