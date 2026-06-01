<template>
  <div class="screen" v-if="order">
    <TopBar variant="back" back-label="Pedidos" back-to="/orders" title="Editar pedido" />

    <div class="scroll-content">
      <p class="section-label">Identificación</p>
      <div class="form-section">
        <div class="form-group">
          <label class="form-label" for="ep-name">Proveedor / descripción</label>
          <input
            class="form-input"
            id="ep-name"
            name="ep-name"
            type="text"
            v-model="form.name"
            placeholder="Ej. Polli — Reposición salsas"
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ep-ref">Referencia</label>
            <input
              class="form-input"
              id="ep-ref"
              name="ep-ref"
              type="text"
              v-model="form.ref"
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="ep-section">Sección</label>
            <select class="form-select" id="ep-section" name="ep-section" v-model="form.active">
              <option :value="true">En curso</option>
              <option :value="false">Historial</option>
            </select>
          </div>
        </div>
      </div>

      <p class="section-label">Detalle</p>
      <div class="form-section">
        <div class="form-group">
          <label class="form-label" for="ep-status">Estado</label>
          <input
            class="form-input"
            id="ep-status"
            name="ep-status"
            type="text"
            v-model="form.status"
            placeholder="Ej. en preparación"
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="ep-amount">Monto</label>
          <input
            class="form-input"
            id="ep-amount"
            name="ep-amount"
            type="number"
            v-model.number="form.amount"
            placeholder="0"
            inputmode="decimal"
          />
        </div>
        <div class="form-group">
          <label class="form-label" id="ep-color-label">Color de estado</label>
          <div class="orders__color-picker" role="group" aria-labelledby="ep-color-label">
            <label
              v-for="c in colors"
              :key="c.value"
              class="orders__color-option"
              :aria-label="c.label"
            >
              <input
                type="radio"
                :id="`ep-color-${c.value}`"
                name="ep-color"
                :value="c.value"
                v-model="form.color"
              />
              <span class="orders__color-dot" :style="{ background: c.value }"></span>
              <span class="orders__color-label">{{ c.label }}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="spacer--sm"></div>

      <template v-if="!confirming">
        <button class="form-view__delete" type="button" @click="confirming = true" aria-label="Eliminar pedido">
          <i class="ti ti-trash" aria-hidden="true"></i>
          <span>Eliminar pedido</span>
        </button>
      </template>
      <template v-else>
        <div class="form-view__delete-confirm">
          <span class="form-view__delete-confirm__msg">¿Eliminar este pedido?</span>
          <div class="form-view__delete-confirm__btns">
            <button class="btn btn--danger" type="button" @click="remove">
              <i class="ti ti-trash" aria-hidden="true"></i>Sí, remover
            </button>
            <button class="btn btn--secondary" type="button" @click="confirming = false">No, cancelar</button>
          </div>
        </div>
      </template>

      <div class="spacer--sm"></div>
    </div>

    <div class="btn-group">
      <button class="btn btn--primary" type="button" :disabled="!isFormValid" @click="save">
        Guardar cambios
      </button>
    </div>
  </div>

  <div class="screen" v-else>
    <TopBar variant="back" back-label="Pedidos" back-to="/orders" title="Editar pedido" />
    <div class="scroll-content">
      <p class="section-label">Pedido no encontrado.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopBar from '../components/layout/TopBar.vue'
import { useOrdersStore } from '../stores/orders.js'
import { ORDER_COLORS }    from '../constants/orderColors.js'

const route  = useRoute()
const router = useRouter()
const store  = useOrdersStore()

const order      = computed(() => store.orders.find(p => p.id === Number(route.params.id)))
const confirming = ref(false)
const colors = ORDER_COLORS

const form = ref({
  name:    order.value?.name  ?? '',
  ref:     order.value?.ref     ?? '',
  status:  order.value?.status  ?? '',
  amount:  order.value?.amount   ?? null,
  color:   order.value?.color   ?? '#C07828',
  active:  order.value?.active ?? true,
})

const isFormValid = computed(() =>
  form.value.name.trim() &&
  form.value.ref.trim() &&
  form.value.status.trim() &&
  form.value.amount > 0
)

function save() {
  if (!isFormValid.value) return
  store.editOrder(route.params.id, { ...form.value })
  router.push('/orders')
}

function remove() {
  store.markDeleteOrder(route.params.id)
  router.push('/orders')
}
</script>
