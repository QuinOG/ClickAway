import {
  createContext,
  useContext,
  useId,
  useMemo,
  useState,
} from "react"

import { composeEventHandlers, joinClassNames } from "../internal/react.js"

const TabsContext = createContext(null)

function useTabsContext(componentName) {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error(`${componentName} must be rendered inside Tabs.`)
  }
  return context
}

function normalizeValueForId(value) {
  return encodeURIComponent(String(value)).replaceAll("%", "-")
}

function getEnabledTabs(tabList) {
  return Array.from(tabList.querySelectorAll('[role="tab"]'))
    .filter((tab) => !tab.disabled && tab.getAttribute("aria-disabled") !== "true")
}

export function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  activationMode = "automatic",
  className = "",
  children,
  ...restProps
}) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
  const generatedId = useId().replaceAll(":", "")
  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue

  const contextValue = useMemo(() => ({
    activationMode,
    baseId: `ui-tabs-${generatedId}`,
    onValueChange: (nextValue) => {
      if (controlledValue === undefined) setUncontrolledValue(nextValue)
      onValueChange?.(nextValue)
    },
    orientation,
    value,
  }), [
    activationMode,
    controlledValue,
    generatedId,
    onValueChange,
    orientation,
    value,
  ])

  return (
    <TabsContext.Provider value={contextValue}>
      <div
        className={joinClassNames("uiTabs", className)}
        data-orientation={orientation}
        {...restProps}
      >
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabList({
  className = "",
  onKeyDown,
  children,
  ...restProps
}) {
  const { activationMode, orientation } = useTabsContext("TabList")

  function handleKeyDown(event) {
    const enabledTabs = getEnabledTabs(event.currentTarget)
    const currentIndex = enabledTabs.indexOf(event.target)
    if (currentIndex < 0 || enabledTabs.length === 0) return

    const isRtl = getComputedStyle(event.currentTarget).direction === "rtl"
    let nextIndex = null

    if (event.key === "Home") nextIndex = 0
    if (event.key === "End") nextIndex = enabledTabs.length - 1

    if (orientation === "horizontal") {
      if (event.key === "ArrowRight") {
        nextIndex = currentIndex + (isRtl ? -1 : 1)
      }
      if (event.key === "ArrowLeft") {
        nextIndex = currentIndex + (isRtl ? 1 : -1)
      }
    } else {
      if (event.key === "ArrowDown") nextIndex = currentIndex + 1
      if (event.key === "ArrowUp") nextIndex = currentIndex - 1
    }

    if (nextIndex === null) return

    event.preventDefault()
    const wrappedIndex = (nextIndex + enabledTabs.length) % enabledTabs.length
    const nextTab = enabledTabs[wrappedIndex]
    nextTab.focus()
    if (activationMode === "automatic") nextTab.click()
  }

  return (
    <div
      {...restProps}
      role="tablist"
      className={joinClassNames("uiTabList", className)}
      aria-orientation={orientation}
      data-orientation={orientation}
      onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown)}
    >
      {children}
    </div>
  )
}

export function Tab({
  value,
  disabled = false,
  className = "",
  onClick,
  children,
  ...restProps
}) {
  const context = useTabsContext("Tab")
  const normalizedValue = normalizeValueForId(value)
  const isSelected = context.value === value
  const tabId = `${context.baseId}-tab-${normalizedValue}`
  const panelId = `${context.baseId}-panel-${normalizedValue}`

  return (
    <button
      {...restProps}
      type="button"
      role="tab"
      id={tabId}
      className={joinClassNames("uiTab", className)}
      aria-controls={panelId}
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      data-state={isSelected ? "active" : "inactive"}
      onClick={composeEventHandlers(onClick, () => context.onValueChange(value))}
    >
      {children}
    </button>
  )
}

export function TabPanel({
  value,
  className = "",
  children,
  ...restProps
}) {
  const context = useTabsContext("TabPanel")
  const normalizedValue = normalizeValueForId(value)
  const isSelected = context.value === value
  const tabId = `${context.baseId}-tab-${normalizedValue}`
  const panelId = `${context.baseId}-panel-${normalizedValue}`

  return (
    <div
      {...restProps}
      role="tabpanel"
      id={panelId}
      className={joinClassNames("uiTabPanel", className)}
      aria-labelledby={tabId}
      tabIndex={0}
      hidden={!isSelected}
      data-state={isSelected ? "active" : "inactive"}
    >
      {children}
    </div>
  )
}
