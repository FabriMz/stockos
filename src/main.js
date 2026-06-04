import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'
import './styles/main.scss'
import { useProductsStore } from './stores/products.js'
import { useOrdersStore } from './stores/orders.js'
import { useBrandCategoriesStore } from './stores/brandCategories.js'

const pinia = createPinia()
const app   = createApp(App)

app.use(pinia)
app.use(router)

// Esperar a que los stores carguen del storage nativo antes de montar
// para evitar el flash de datos vacíos → datos reales
const productsStore        = useProductsStore()
const ordersStore          = useOrdersStore()
const brandCategoriesStore = useBrandCategoriesStore()

function waitReady(store) {
  return new Promise(resolve => {
    if (store._ready) return resolve()
    const stop = store.$subscribe(() => {
      if (store._ready) { stop(); resolve() }
    })
    // Timeout de seguridad: si tarda más de 3s, montar igual
    setTimeout(resolve, 3000)
  })
}

Promise.all([
  waitReady(productsStore),
  waitReady(ordersStore),
  waitReady(brandCategoriesStore),
]).then(() => {
  app.mount('#app')
})