/**
 * storage.js
 * Abstracción de persistencia para StockOS.
 * - En dispositivo (Capacitor): usa @capacitor/preferences → almacenamiento nativo
 * - En navegador / dev server: fallback a localStorage
 */

let _Preferences = null

function isNativeCapacitor() {
  return typeof window !== 'undefined'
    && typeof window.Capacitor !== 'undefined'
    && typeof window.Capacitor.isNativePlatform === 'function'
    && window.Capacitor.isNativePlatform()
}

async function getPreferences() {
  if (_Preferences) return _Preferences
  if (!isNativeCapacitor()) return null

  try {
    const cap = await import('@capacitor/preferences')
    if (!cap?.Preferences || typeof cap.Preferences.get !== 'function') {
      return null
    }
    _Preferences = cap.Preferences
    return _Preferences
  } catch {
    return null
  }
}

export async function storageGet(key) {
  try {
    const Prefs = await getPreferences()
    if (Prefs) {
      const { value } = await Prefs.get({ key })
      return value ?? null
    }
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export async function storageSet(key, value) {
  try {
    const Prefs = await getPreferences()
    if (Prefs) {
      await Prefs.set({ key, value })
    } else {
      localStorage.setItem(key, value)
    }
  } catch { /* noop */ }
}

const _saveTimers = {}
export function scheduleStorageSet(key, value, delay = 300) {
  if (_saveTimers[key]) clearTimeout(_saveTimers[key])
  _saveTimers[key] = setTimeout(async () => {
    try {
      await storageSet(key, value)
    } catch { /* noop */ }
    delete _saveTimers[key]
  }, delay)
}

export async function storageRemove(key) {
  try {
    const Prefs = await getPreferences()
    if (Prefs) {
      await Prefs.remove({ key })
    } else {
      localStorage.removeItem(key)
    }
  } catch { /* noop */ }
}