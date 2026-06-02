import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/',                    component: () => import('../views/Home.vue') },
  { path: '/catalog',             component: () => import('../views/BrandCatalog.vue') },
  // Ruta global de lote — debe ir ANTES de /:brandId para no colisionar
  { path: '/catalog/batch/:batchNumber/:brandId', component: () => import('../views/BatchBrandDetail.vue') },
  { path: '/catalog/batch/:batchNumber', component: () => import('../views/BatchDetail.vue') },
  { path: '/catalog/:brandId',    component: () => import('../views/ProductCatalog.vue') },
  // Redirect de ruta antigua con brandId en la URL
  { path: '/catalog/:brandId/batch/:batchNumber', redirect: to => `/catalog/batch/${to.params.batchNumber}` },
  { path: '/product/new',         component: () => import('../views/NewProduct.vue') },
  { path: '/product/:id',         component: () => import('../views/Detail.vue') },
  { path: '/product/:id/edit',    component: () => import('../views/EditProduct.vue') },
  { path: '/alerts',              component: () => import('../views/BrandAlerts.vue') },
  { path: '/alerts/out-of-stock',  component: () => import('../views/AlertCategoryBrands.vue'), meta: { alertType: 'out-of-stock' } },
  { path: '/alerts/out-of-stock/:brandId', component: () => import('../views/AlertCategoryProducts.vue'), meta: { alertType: 'out-of-stock' } },
  { path: '/alerts/low-stock',  component: () => import('../views/AlertCategoryBrands.vue'), meta: { alertType: 'low-stock' } },
  { path: '/alerts/low-stock/:brandId', component: () => import('../views/AlertCategoryProducts.vue'), meta: { alertType: 'low-stock' } },
  { path: '/alerts/expiry',        component: () => import('../views/AlertExpiry.vue') },
  { path: '/alerts/expiry/:year',  component: () => import('../views/AlertExpiry.vue') },
  { path: '/alerts/expiry/:year/:month', component: () => import('../views/AlertExpiry.vue') },
  { path: '/alerts/expiry/:year/:month/:brandId', component: () => import('../views/AlertExpiry.vue') },
  { path: '/alerts/:brandId',     redirect: to => `/alerts/out-of-stock/${to.params.brandId}` },
  { path: '/settings',            component: () => import('../views/Settings.vue') },

  // Redirects from old Spanish paths
  { path: '/catalogo',            redirect: '/catalog' },
  { path: '/catalogo/:brandId',   redirect: to => `/catalog/${to.params.brandId}` },
  { path: '/producto/nuevo',      redirect: '/product/new' },
  { path: '/producto/:id',        redirect: to => `/product/${to.params.id}` },
  { path: '/producto/:id/editar', redirect: to => `/product/${to.params.id}/edit` },
  { path: '/alertas',             redirect: '/alerts' },
  { path: '/alertas/out-of-stock',  redirect: '/alerts/out-of-stock' },
  { path: '/alertas/low-stock', redirect: '/alerts/low-stock' },
  { path: '/alertas/vencimientos', redirect: '/alerts/expiry' },
  { path: '/alertas/:brandId',    redirect: to => `/alerts/out-of-stock/${to.params.brandId}` },
  { path: '/ajustes',             redirect: '/settings' },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})