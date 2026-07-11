const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

const modalLayers = []
const environmentOriginals = new Map()
let originalBodyOverflow = ""

function isElementUnavailable(element) {
  if (element.hidden) return true
  if (element.getAttribute("aria-hidden") === "true") return true
  if (element.closest("[inert]")) return true
  if (element.closest("[hidden]")) return true
  const computedStyle = getComputedStyle(element)
  if (computedStyle.display === "none" || computedStyle.visibility === "hidden") return true
  return false
}

function isRadioTabStop(element, container) {
  if (!(element instanceof HTMLInputElement) || element.type !== "radio" || !element.name) {
    return true
  }

  const group = Array.from(container.querySelectorAll('input[type="radio"]'))
    .filter((radio) => radio.name === element.name && radio.form === element.form && !radio.disabled)
  const checkedRadio = group.find((radio) => radio.checked)
  return checkedRadio ? checkedRadio === element : group[0] === element
}

export function getFocusableElements(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter((element) => (
      element.tabIndex >= 0
      && !isElementUnavailable(element)
      && isRadioTabStop(element, container)
    ))
}

function getOwnedLayers(layer, ownerId) {
  if (!layer || !ownerId) return []
  return Array.from(layer.querySelectorAll("[data-ui-dialog-owned]"))
    .filter((element) => element.dataset.uiDialogOwned === ownerId)
}

export function getDialogFocusableElements(surface, layer, ownerId) {
  return [
    ...getFocusableElements(surface),
    ...getOwnedLayers(layer, ownerId).flatMap((element) => getFocusableElements(element)),
  ]
}

export function isInsideDialogFocusScope(target, surface, layer, ownerId) {
  if (surface?.contains(target)) return true
  return getOwnedLayers(layer, ownerId).some((element) => element.contains(target))
}

export function hasOwnedEscapeDismissableLayer(layer, ownerId) {
  return getOwnedLayers(layer, ownerId).some((element) => (
    element.getAttribute("role") === "tooltip"
    || (
      element.getAttribute("role") === "dialog"
      && element.getAttribute("aria-modal") !== "true"
    )
  ))
}

export function focusElement(element) {
  if (!element || typeof element.focus !== "function") return false
  element.focus({ preventScroll: true })
  return document.activeElement === element
}

function rememberEnvironmentState(element) {
  if (environmentOriginals.has(element)) return
  environmentOriginals.set(element, {
    ariaHidden: element.getAttribute("aria-hidden"),
    hadInertAttribute: element.hasAttribute("inert"),
    inert: element.inert,
  })
}

function makeElementInert(element) {
  rememberEnvironmentState(element)
  element.inert = true
  element.setAttribute("inert", "")
  element.setAttribute("aria-hidden", "true")
}

function restoreEnvironment() {
  environmentOriginals.forEach((state, element) => {
    element.inert = state.inert
    if (state.hadInertAttribute) {
      element.setAttribute("inert", "")
    } else {
      element.removeAttribute("inert")
    }

    if (state.ariaHidden === null) {
      element.removeAttribute("aria-hidden")
    } else {
      element.setAttribute("aria-hidden", state.ariaHidden)
    }
  })
  environmentOriginals.clear()
}

function syncModalEnvironment() {
  restoreEnvironment()
  const topLayer = modalLayers.at(-1)
  if (!topLayer) return

  Array.from(document.body.children).forEach((element) => {
    if (element !== topLayer) makeElementInert(element)
  })
}

export function registerModalLayer(layer) {
  if (!layer || modalLayers.includes(layer)) return () => {}

  if (modalLayers.length === 0) {
    originalBodyOverflow = document.body.style.overflow
  }

  modalLayers.push(layer)
  document.body.style.overflow = "hidden"
  syncModalEnvironment()

  return () => {
    const layerIndex = modalLayers.lastIndexOf(layer)
    if (layerIndex >= 0) modalLayers.splice(layerIndex, 1)

    syncModalEnvironment()
    if (modalLayers.length === 0) {
      document.body.style.overflow = originalBodyOverflow
    }
  }
}

export function isTopModalLayer(layer) {
  return modalLayers.at(-1) === layer
}
