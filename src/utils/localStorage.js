/**
 * Reads a localStorage value and returns a boolean.
 * @param {string} key
 * @param {boolean} fallback
 * @returns {boolean}
 */
export function readBooleanFromStorage(key, fallback = false) {
  if (typeof window === "undefined") return fallback
  return window.localStorage.getItem(key) === "true"
}

/**
 * Reads a localStorage value and returns a non-negative number.
 * @param {string} key
 * @param {number} fallback
 * @returns {number}
 */
export function readNumberFromStorage(key, fallback = 0) {
  if (typeof window === "undefined") return fallback

  const parsedValue = Number(window.localStorage.getItem(key))
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : fallback
}

/**
 * Reads a localStorage value and returns an array.
 * @param {string} key
 * @returns {Array<unknown>}
 */
export function readArrayFromStorage(key) {
  if (typeof window === "undefined") return []

  try {
    const parsedValue = JSON.parse(window.localStorage.getItem(key) ?? "[]")
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

/**
 * Reads a localStorage value and returns a string.
 * @param {string} key
 * @param {string} fallback
 * @returns {string}
 */
export function readStringFromStorage(key, fallback) {
  if (typeof window === "undefined") return fallback
  return window.localStorage.getItem(key) || fallback
}
