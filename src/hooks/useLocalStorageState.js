import { useEffect, useState } from "react"

/**
 * Syncs a piece of React state with localStorage.
 * @param {Object} options
 * @param {string} options.key
 * @param {() => any} options.readValue
 * @param {(value: any) => string} options.serialize
 * @returns {[any, Function]}
 */
export function useLocalStorageState({ key, readValue, serialize = String }) {
  const [value, setValue] = useState(readValue)

  useEffect(() => {
    window.localStorage.setItem(key, serialize(value))
  }, [key, serialize, value])

  return [value, setValue]
}
