<template>
  <div
    class="product-card"
    :class="{ 'product-card--static': showActions }"
    :role="showActions ? undefined : 'button'"
    :tabindex="showActions ? undefined : 0"
    :aria-label="product.name"
    @click="!showActions && navigateToDetail()"
    @keydown.enter="!showActions && navigateToDetail()"
  >
    <div class="product-card__stripe" :class="stripeClass"></div>

    <div class="product-card__body">
      <div class="product-card__header">
        <div class="product-card__icon">
          <img
            v-if="product.img && !imgError"
            :src="product.img"
            :alt="product.name"
            class="product-card__icon-img"
            @error="imgError = true"
          >
          <i v-else :class="`ti ${product.ic}`" :style="{ color: product.col }" aria-hidden="true"></i>
        </div>
        <div class="product-card__info">
          <div class="product-card__name">{{ product.name }}</div>
          <div class="product-card__meta">{{ product.size }}</div>
        </div>

        <button
          v-if="deletable"
          class="product-card__delete-btn"
          :aria-label="`Eliminar ${product.name}`"
          @click.stop="store.markDelete(product.id)"
        >
          <i class="ti ti-trash" aria-hidden="true"></i>
        </button>

        <div v-else class="product-card__badges">
          <span v-if="batchContext" class="badge badge--expiry">
            <i class="ti ti-folder" aria-hidden="true"></i>{{ batchContext.batchNum }}
          </span>
          <template v-else>
            <span v-if="product.stock === 0" class="badge badge--out">
              <i class="ti ti-ban" aria-hidden="true"></i>Sin stock
            </span>
            <span v-else-if="store.pct(product) < 25" class="badge badge--low">
              <i class="ti ti-alert-circle" aria-hidden="true"></i>Stock bajo
            </span>
            <span v-if="product.expiry" class="badge badge--expiry">
              <i class="ti ti-clock" aria-hidden="true"></i>Por vencer
            </span>
            <span v-if="product.stock > 0 && store.pct(product) >= 25 && !product.expiry" class="badge badge--ok">
              <i class="ti ti-circle-check" aria-hidden="true"></i>En stock
            </span>
          </template>
        </div>
      </div>

      <div class="product-card__bottom">
        <div>
          <div class="product-card__price-label">Costo IVA inc.</div>
          <div class="product-card__price">{{ currencyStore.formatProductPriceWithCurrency(product.cost, product.priceCurrency) }}</div>
          <div class="product-card__pvp">Lote: {{ batchContext?.batchNum || product.batch || 'S/N' }}</div>
        </div>
        <div class="product-card__stock-info">
          <div class="stock-bar">
            <div
              class="stock-bar__fill"
              :class="stockFillClass"
              :style="{ width: store.pct(product) + '%' }"
              role="progressbar"
              :aria-valuenow="store.pct(product)"
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
          <div class="product-card__units">{{ product.stock }} uds.</div>
          <div class="product-card__min">mín. {{ product.unitsPerBox }}/caja</div>
        </div>
      </div>

      <template v-if="showActions">
        <div class="product-card__divider" aria-hidden="true"></div>
        <div class="product-card__actions">
          <button
            class="product-card__action-btn"
            :aria-label="`Ver detalle de ${product.name}`"
            @click.stop="navigateToDetail()"
          >
            <i class="ti ti-info-circle" aria-hidden="true"></i>
            Detalle
          </button>
          <button
            class="product-card__action-btn product-card__action-btn--edit"
            :aria-label="`Editar ${product.name}`"
            @click.stop="navigateToEdit()"
          >
            <i class="ti ti-edit" aria-hidden="true"></i>
            Editar
          </button>
          <button
            v-if="batchContext"
            class="product-card__action-btn product-card__action-btn--remove"
            :aria-label="`Quitar ${product.name} del lote`"
            @click.stop="emit('remove', batchContext.itemId)"
          >
            <i class="ti ti-folder-minus" aria-hidden="true"></i>
            Quitar
          </button>
          <button
            v-else
            class="product-card__action-btn product-card__action-btn--clone"
            :aria-label="`Clonar ${product.name}`"
            @click.stop="emit('clone', product)"
          >
            <i class="ti ti-copy" aria-hidden="true"></i>
            Clonar
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProductsStore } from '../../stores/products.js'
import { useCurrencyStore }  from '../../stores/currency.js'

const props = defineProps({
  product:      { type: Object,  required: true },
  showActions:  { type: Boolean, default: false },
  deletable:    { type: Boolean, default: false },
  batchContext: { type: Object,  default: null },
  // shape: { itemId: string, brandId: string, batchNum: string }
})

const emit = defineEmits(['clone', 'remove'])

const router        = useRouter()
const store         = useProductsStore()
const currencyStore = useCurrencyStore()

const imgError = ref(false)

function batchQuery() {
  if (!props.batchContext) return null
  const brandName = store.getBrand(props.batchContext.brandId)?.name ?? ''
  return { from: 'batch', brandId: props.batchContext.brandId, batchNum: props.batchContext.batchNum, brandName }
}

function navigateToDetail() {
  const q = batchQuery()
  router.push(q ? { path: `/product/${props.product.id}`, query: q } : `/product/${props.product.id}`)
}

function navigateToEdit() {
  const q = batchQuery()
  router.push(q ? { path: `/product/${props.product.id}/edit`, query: q } : `/product/${props.product.id}/edit`)
}

const stockFillClass = computed(() => {
  if (props.product.stock === 0) return 'stock-bar__fill--out'
  if (store.pct(props.product) < 25) return 'stock-bar__fill--low'
  return 'stock-bar__fill--ok'
})

const stripeClass = computed(() => {
  if (props.product.stock === 0) return 'product-card__stripe--out'
  if (store.pct(props.product) < 25) return 'product-card__stripe--low'
  return 'product-card__stripe--ok'
})
</script>