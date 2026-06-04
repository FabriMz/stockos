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
        <div class="detail__row"><span class="detail__row-label">Descuento</span><span class="detail__row-value">{{ product.discount ?? '—' }}%</span></div>
        <div class="detail__row"><span class="detail__row-label">Nº de lote</span><span class="detail__row-value">{{ product.batch || 'S/N' }}</span></div>
        <div v-if="formattedExpiry" class="detail__row">
          <span class="detail__row-label">Vencimiento</span>
          <span class="detail__row-value detail__row-value--warn">{{ formattedExpiry }}</span>
        </div>
      </div>

      <div class="spacer--xs"></div>

      <div class="detail__section">
        <div class="detail__section-head">
          <div class="detail__section-title">Precios</div>
          <button
            class="detail__currency-pill"
            @click.stop="currencyStore.toggleCurrency()"
            :aria-label="`Cambiar vista a ${currencyStore.currency === 'UYU' ? 'dólares' : 'pesos uruguayos'}`"
          >
            <i class="ti ti-arrows-exchange" aria-hidden="true"></i>
            <span>{{ currencyStore.currency }}</span>
          </button>
        </div>

        <!-- Fila 1: Precio neto + IVA% -->
        <div class="detail__prices">
          <div class="detail__price-col">
            <div class="detail__price-label">Precio neto</div>
            <div class="detail__price-value">{{ currencyStore.formatProductPriceWithCurrency(product.cost, product.priceCurrency) }}</div>
          </div>
          <div class="detail__price-col">
            <div class="detail__price-label">IVA</div>
            <div class="detail__price-value">
              <template v-if="product.vatRate != null">{{ product.vatRate }}%</template>
              <template v-else>—</template>
            </div>
          </div>
        </div>

        <!-- Fila 2: Margen + PVP -->
        <div class="detail__prices detail__prices--secondary">
          <div class="detail__price-col">
            <div class="detail__price-label">Margen</div>
            <div class="detail__price-value detail__price-value--success">
              <template v-if="product.margin != null">{{ product.margin }}%</template>
              <template v-else>{{ margenCalc }}%</template>
            </div>
          </div>
          <div class="detail__price-col">
            <div class="detail__price-label">PVP sugerido</div>
            <div class="detail__price-value detail__price-value--success">{{ currencyStore.formatProductPriceWithCurrency(product.price, product.priceCurrency) }}</div>
          </div>
        </div>

        <!-- Hint: moneda guardada -->
        <div class="detail__saved-currency">
          <span class="detail__saved-currency__dot"></span>
          <span class="detail__saved-currency__text">guardado en <strong>{{ product.priceCurrency || 'USD' }}</strong></span>
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

// Margen calculado como fallback para productos sin margin guardado
const margenCalc = computed(() => {
  if (!product.value) return '-'
  const { price, cost } = product.value
  if (!price) return '-'
  return (((price - cost) / price) * 100).toFixed(0)
})

const pct = computed(() => product.value ? store.pct(product.value) : 0)

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

const formattedExpiry = computed(() => {
  if (!product.value?.expiry) return null
  const [y, m, d] = product.value.expiry.split('-')
  return `${d}/${m}/${y}`
})

const fillClass = computed(() => {
  if (!product.value) return ''
  if (product.value.stock === 0) return 'stock-bar__fill--out'
  if (pct.value < 25) return 'stock-bar__fill--low'
  return 'stock-bar__fill--ok'
})
</script>