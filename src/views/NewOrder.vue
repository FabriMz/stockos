<template>
  <div class="screen">
    <TopBar variant="back" back-label="Pedidos" back-to="/orders" title="Nuevo pedido" />

    <div class="scroll-content">
      <p class="section-label">Identificación</p>
      <div class="form-section">
        <div class="form-group">
          <label class="form-label" for="np-name">Proveedor / descripción</label>
          <input class="form-input" id="np-name" name="np-name" type="text" v-model="form.name"
            placeholder="Ej. Polli — Reposición salsas" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="np-ref">Referencia</label>
            <input class="form-input" id="np-ref" name="np-ref" type="text" v-model="form.ref"
              placeholder="Ej. PO-2025-033" />
          </div>
          <div class="form-group">
            <label class="form-label" for="np-section">Sección</label>
            <select class="form-select" id="np-section" name="np-section" v-model="form.active">
              <option :value="true">En curso</option>
              <option :value="false">Historial</option>
            </select>
          </div>
        </div>
      </div>

      <p class="section-label">Detalle</p>
      <div class="form-section">
        <div class="form-group">
          <label class="form-label" for="np-status">Estado</label>
          <input class="form-input" id="np-status" name="np-status" type="text" v-model="form.status"
            placeholder="Ej. en preparación" />
        </div>
        <div class="form-group">
          <label class="form-label" for="np-amount">Monto</label>
          <input class="form-input" id="np-amount" name="np-amount" type="number" v-model.number="form.amount"
            placeholder="0" inputmode="decimal" />
        </div>
        <div class="form-group">
          <label class="form-label" id="np-color-label">Color de estado</label>
          <div class="orders__color-picker" role="group" aria-labelledby="np-color-label">
            <label v-for="c in colors" :key="c.value" class="orders__color-option" :aria-label="c.label">
              <input type="radio" :id="`np-color-${c.value}`" name="np-color" :value="c.value" v-model="form.color" />
              <span class="orders__color-dot" :style="{ background: c.value }"></span>
              <span class="orders__color-label">{{ c.label }}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="spacer--sm"></div>
    </div>

    <div class="btn-group">
      <button class="btn btn--primary" type="button" :disabled="!isFormValid" @click="save">
        Guardar pedido
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/layout/TopBar.vue'
import { useOrdersStore } from '../stores/orders.js'
import { ORDER_COLORS } from '../constants/orderColors.js'

const router = useRouter()
const store = useOrdersStore()

const colors = ORDER_COLORS

const nextRef = computed(() => {
  const nums = store.orders.map(p => {
    const m = p.ref.match(/PO-\d{4}-(\d+)/)
    return m ? parseInt(m[1]) : 0
  })
  const max = nums.length ? Math.max(...nums) : 0
  return `PO-${new Date().getFullYear()}-${String(max + 1).padStart(3, '0')}`
})

const form = ref({
  name: '',
  ref: nextRef.value,
  status: '',
  amount: null,
  color: '#C07828',
  active: true,
})

const isFormValid = computed(() =>
  form.value.name.trim() &&
  form.value.ref.trim() &&
  form.value.status.trim() &&
  form.value.amount > 0
)

function save() {
  if (!isFormValid.value) return
  store.addOrder({ ...form.value })
  router.push('/orders')
}
</script>