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
