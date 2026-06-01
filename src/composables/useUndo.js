import { ref } from 'vue'

/**
 * Patrón undo genérico: guarda un snapshot, inicia un timer y
 * expone mark / take / confirm para que el store que lo use
 * maneje su propia lógica de restauración.
 *
 * @param {number} timeoutMs  Milisegundos hasta confirmación automática (default 5000)
 * @returns {{ pending: Ref, mark: Function, take: Function, confirm: Function }}
 */
export function useUndo(timeoutMs = 5000) {
  const pending = ref(null)
  let timer = null

  /**
   * Guarda el snapshot y (re)inicia el timer de confirmación.
   * @param {*} snapshot  Cualquier valor serializable que represente el estado previo.
   */
  function mark(snapshot) {
    pending.value = snapshot
    clearTimeout(timer)
    timer = setTimeout(confirm, timeoutMs)
  }

  /**
   * Devuelve el snapshot y limpia el estado.
   * El store consumidor es responsable de restaurar los datos.
   * @returns {*} snapshot  o  null si no había nada pendiente.
   */
  function take() {
    if (!pending.value) return null
    const snapshot = pending.value
    confirm()
    return snapshot
  }

  /**
   * Confirma la eliminación sin restaurar (timer expirado o confirmación explícita).
   */
  function confirm() {
    clearTimeout(timer)
    pending.value = null
  }

  return { pending, mark, take, confirm }
}