/**
 * storage.js
 * Abstracción de persistencia para StockOS.
 * - En dispositivo (Capacitor): usa @capacitor/preferences → almacenamiento nativo
 * - En navegador / dev server: fallback a localStorage
 */

let _Preferences = null

async function getPreferences() {
  if (_Preferences) return _Preferences
  try {
    const cap = await import('@capacitor/preferences')
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