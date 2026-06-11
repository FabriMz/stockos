<template>
  <div class="screen" v-if="product">
    <TopBar variant="back" :back-label="backLabel" :back-to="backTo" title="Detalle">
    </TopBar>

    <div class="scroll-content">
      <div class="detail__header">
        <div class="detail__icon-wrap">
          <div class="detail__icon">
            <img v-if="product.img" :src="product.img" :alt="product.name" class="detail__icon-img">
            <i v-else :class="`ti ${product.ic}`" :style="{ color: product.col }" aria-hidden="true"></i>
          </div>
          <span v-if="pvpDiscountLabel" class="detail__icon-discount" aria-label="Descuento aplicado">{{ pvpDiscountLabel }}</span>
        </div>
        <div class="detail__name">{{ product.name }}</div>
        <div class="detail__badge-wrap">
          <StockBadge :product="product" />
        </div>
        <div class="detail__row"><span class="detail__row-label">Marca</span><span class="detail__row-value">{{
          product.brand }}</span></div>
        <div class="detail__row"><span class="detail__row-label">SKU</span><span class="detail__row-value">{{
            product.sku }}</span></div>
        <div class="detail__row"><span class="detail__row-label">Contenido</span><span class="detail__row-value">{{
          product.size }}</span></div>
        <div class="detail__row"><span class="detail__row-label">Origen</span><span class="detail__row-value">{{
          product.origin }}</span></div>
        <template v-if="product.unitsPerBox">
          <div v-if="product.boxCount" class="detail__row"><span class="detail__row-label">Cantidad de cajas</span><span class="detail__row-value">{{
            product.boxCount }}</span></div>
          <div class="detail__row"><span class="detail__row-label">Uds. por caja</span><span class="detail__row-value">{{
            product.unitsPerBox }}</span></div>
          <div v-if="product.boxCount" class="detail__row"><span class="detail__row-label">Productos disponibles</span><span class="detail__row-value">{{
            displayStock }}</span></div>
        </template>
        <div v-else class="detail__row"><span class="detail__row-label">Uds.</span><span class="detail__row-value">{{
          product.stock }}</span></div>
        <div class="detail__row"><span class="detail__row-label">Descuento</span><span class="detail__row-value">{{
          product.discount ?? '—' }}%</span></div>
        <div class="detail__row"><span class="detail__row-label">Nº de lote</span><span class="detail__row-value">{{
          product.batch || 'S/N' }}</span></div>
        <div v-if="formattedExpiry" class="detail__row">
          <span class="detail__row-label">Vencimiento</span>
          <span class="detail__row-value detail__row-value--warn">{{ formattedExpiry }}</span>
        </div>
      </div>

      <div class="spacer--xs"></div>

      <div class="detail__section">
        <div class="detail__section-head">
          <div class="detail__section-title">Precios</div>
          <button class="detail__currency-pill" @click.stop="currencyStore.toggleCurrency()"
            :aria-label="`Cambiar vista a ${currencyStore.currency === 'UYU' ? 'dólares' : 'pesos uruguayos'}`">
            <i class="ti ti-arrows-exchange" aria-hidden="true"></i>
            <span>{{ currencyStore.currency }}</span>
          </button>
        </div>

        <!-- Fila 1: Precio neto + IVA% -->
        <div class="detail__prices">
          <div class="detail__price-col">
            <div class="detail__price-label">Precio neto</div>
            <div class="detail__price-value">{{ currencyStore.formatProductPriceWithCurrency(product.cost,
              product.priceCurrency) }}</div>
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
            <div class="detail__price-value detail__price-value--success">{{
              currencyStore.formatProductPriceWithCurrency(product.price, product.priceCurrency) }}</div>
          </div>
        </div>

        <!-- Hint: moneda guardada -->
        <div class="detail__saved-currency">
          <span class="detail__saved-currency__dot"></span>
          <span class="detail__saved-currency__text">guardado en <strong>{{ product.priceCurrency || 'USD'
              }}</strong></span>
        </div>
      </div>

      <div class="spacer--xs"></div>

      <div class="detail__section">
        <div class="detail__section-title">Stock actual</div>
        <div class="stock-bar stock-bar--full" role="progressbar" :aria-valuenow="pct" aria-valuemin="0"
          aria-valuemax="100">
          <div class="stock-bar__fill" :class="fillClass" :style="{ width: pct + '%' }"></div>
        </div>
        <div class="stock-nums">
          <span>{{ product.stock }} uds. en stock</span>
          <span>cap. {{ product.max }} uds.</span>
        </div>
        <p v-if="product.unitsPerBox" class="detail__reorder-hint">
          Mín. reposición: 1 caja = {{ product.unitsPerBox }} uds.
        </p>

        <div class="detail__exit">
          <span class="detail__exit__label">Registrar salida</span>
          <div class="detail__exit__controls" role="group" aria-label="Registrar salida de stock">
            <button
              class="detail__exit__btn"
              @click="decrementExit"
              :disabled="exitQty <= 1"
              aria-label="Restar unidad a la salida"
            >−</button>
            <input
              id="detail-exit-qty"
              name="detail-exit-qty"
              type="number"
              class="detail__exit__input"
              v-model.number="exitQty"
              min="1"
              :max="product.stock"
              step="1"
              inputmode="numeric"
              aria-label="Cantidad a descontar"
              @keydown="onExitKeyDown"
              @input="onExitInput"
              @blur="onExitBlur"
            />
            <button
              class="detail__exit__btn"
              @click="incrementExit"
              :disabled="exitQty >= product.stock"
              aria-label="Sumar unidad a la salida"
            >+</button>
            <button
              class="detail__exit__confirm btn btn--primary btn--sm"
              @click="confirmExit"
              :disabled="product.stock === 0 || exitQty < 1"
              aria-label="Confirmar salida de stock"
            >
              <i class="ti ti-minus" aria-hidden="true"></i>
              Descontar
            </button>
          </div>
          <p v-if="product.stock === 0" class="detail__exit__hint detail__exit__hint--out" role="alert">
            Sin stock disponible
          </p>
          <p v-else-if="exitQty >= product.stock" class="detail__exit__hint detail__exit__hint--warn" role="status">
            Quedarán 0 uds. en stock
          </p>
          <p v-else class="detail__exit__hint" role="status">
            Quedarán {{ product.stock - exitQty }} uds. en stock
          </p>
        </div>
      </div>

      <div class="spacer--xs"></div>

      <div class="detail__actions" v-if="!confirming">
        <button class="btn btn--danger" @click="confirming = true">
          <i class="ti ti-trash" aria-hidden="true"></i>Eliminar
        </button>
        <button class="btn btn--primary" @click="goEdit">
          <i class="ti ti-edit" aria-hidden="true"></i>Editar
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
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore } from '../stores/products.js'
import { useCurrencyStore } from '../stores/currency.js'
import { resolveAlertBack } from '../composables/useAlertNavigation.js'
import TopBar from '../components/layout/TopBar.vue'
import BottomNav from '../components/layout/BottomNav.vue'
import StockBadge from '../components/ui/StockBadge.vue'

const route = useRoute()
const router = useRouter()
const store = useProductsStore()
const currencyStore = useCurrencyStore()
const product = computed(() => store.getProduct(route.params.id))

const confirming = ref(false)

const alertBack = computed(() => resolveAlertBack(route.query, product.value))
const backTo = computed(() => alertBack.value?.to ?? (product.value?.bid ? `/catalog/${product.value.bid}` : '/catalog'))
const backLabel = computed(() => alertBack.value?.label ?? (product.value?.bid ? (product.value?.brand ?? 'Atrás') : 'Catálogo'))

// Margen calculado como fallback para productos sin margin guardado
const margenCalc = computed(() => {
  if (!product.value) return '-'
  const { price, cost } = product.value
  if (!price) return '-'
  return (((price - cost) / price) * 100).toFixed(0)
})

const pct = computed(() => product.value ? store.pct(product.value) : 0)

const displayStock = computed(() => product.value?.stock ?? 0)

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
    router.push(bid ? `/catalog/${bid}` : '/catalog')
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

// ─── Salida de stock ──────────────────────────────────────────────────────────
const exitQty = ref(1)

// Resetear exitQty si el producto cambia o el stock baja por debajo del valor actual
watch(() => product.value?.stock, (stock) => {
  if (stock != null && exitQty.value > stock) {
    exitQty.value = Math.max(1, stock)
  }
})

const BLOCKED_EXIT_KEYS = ['e', 'E', '+', '-', ',', '.']

function onExitKeyDown(e) {
  if (BLOCKED_EXIT_KEYS.includes(e.key)) e.preventDefault()
}

function onExitInput(e) {
  const raw = e.target.value.replace(/[^0-9]/g, '')
  if (raw === '') { exitQty.value = 1; e.target.value = 1; return }
  const val = parseInt(raw, 10)
  if (!isNaN(val)) {
    const clamped = Math.min(Math.max(1, val), product.value?.stock ?? 1)
    exitQty.value = clamped
    e.target.value = clamped
  }
}

function onExitBlur(e) {
  if (!e.target.value || Number(e.target.value) < 1) {
    exitQty.value = 1
    e.target.value = 1
  }
}

function incrementExit() {
  const max = product.value?.stock ?? 0
  if (exitQty.value < max) exitQty.value++
}

function decrementExit() {
  if (exitQty.value > 1) exitQty.value--
}

function confirmExit() {
  if (!product.value || product.value.stock === 0) return
  store.registerExit(product.value.id, exitQty.value)
  exitQty.value = 1
}

const pvpDiscountLabel = computed(() => {
  const raw = product.value?.discount
  if (!raw) return null
  const num = parseFloat(raw)
  if (isNaN(num) || num <= 0) return null
  return `${num}% off`
})
</script>