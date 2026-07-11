import { useRef, useState } from "react"
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"

import {
  ActionButton,
  ActionLink,
  MobileSheet,
  Modal,
  Popover,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Tooltip,
} from "../src/components/ui/index.js"

describe("Actions", () => {
  test("locked actions stay native-disabled and expose the lock reason", () => {
    render(<ActionButton isLocked lockedReason="Reach level 5">Ranked queue</ActionButton>)

    const action = screen.getByRole("button", {
      name: /Ranked queue.*Locked: Reach level 5/,
    })
    expect(action.disabled).toBe(true)
    expect(action.dataset.status).toBe("locked")
    expect(action.querySelector("svg")).not.toBeNull()
  })
})

function TabsHarness({ orientation = "horizontal" }) {
  const [value, setValue] = useState("overview")

  return (
    <Tabs value={value} onValueChange={setValue} orientation={orientation}>
      <TabList aria-label="Arena views">
        <Tab value="overview">Overview</Tab>
        <Tab value="locked" disabled>Locked</Tab>
        <Tab value="stats">Stats</Tab>
        <Tab value="history">History</Tab>
      </TabList>
      <TabPanel value="overview">Overview panel</TabPanel>
      <TabPanel value="locked">Locked panel</TabPanel>
      <TabPanel value="stats">Stats panel</TabPanel>
      <TabPanel value="history">History panel</TabPanel>
    </Tabs>
  )
}

describe("Tabs", () => {
  test("wires tab and panel relationships with one roving tab stop", () => {
    render(<TabsHarness />)

    const tabs = screen.getAllByRole("tab")
    const overviewTab = screen.getByRole("tab", { name: "Overview" })
    const overviewPanel = screen.getByRole("tabpanel", { name: "Overview" })

    expect(tabs.filter((tab) => tab.tabIndex === 0)).toEqual([overviewTab])
    expect(overviewTab.getAttribute("aria-controls")).toBe(overviewPanel.id)
    expect(overviewPanel.getAttribute("aria-labelledby")).toBe(overviewTab.id)
    expect(screen.queryByRole("tabpanel", { name: "Stats" })).toBeNull()
  })

  test("arrow, Home, and End keys wrap and skip disabled tabs", async () => {
    const user = userEvent.setup()
    render(<TabsHarness />)

    const overview = screen.getByRole("tab", { name: "Overview" })
    const stats = screen.getByRole("tab", { name: "Stats" })
    const history = screen.getByRole("tab", { name: "History" })

    overview.focus()
    await user.keyboard("{ArrowRight}")
    expect(document.activeElement).toBe(stats)
    expect(stats.getAttribute("aria-selected")).toBe("true")
    expect(screen.getByRole("tabpanel", { name: "Stats" }).textContent).toBe("Stats panel")

    await user.keyboard("{End}")
    expect(document.activeElement).toBe(history)

    await user.keyboard("{ArrowRight}")
    expect(document.activeElement).toBe(overview)

    await user.keyboard("{Home}")
    expect(document.activeElement).toBe(overview)
  })

  test("vertical tabs use Up and Down rather than Left and Right", async () => {
    const user = userEvent.setup()
    render(<TabsHarness orientation="vertical" />)

    const overview = screen.getByRole("tab", { name: "Overview" })
    const stats = screen.getByRole("tab", { name: "Stats" })
    overview.focus()

    await user.keyboard("{ArrowRight}")
    expect(document.activeElement).toBe(overview)
    await user.keyboard("{ArrowDown}")
    expect(document.activeElement).toBe(stats)
  })
})

function DialogHarness({
  dismissible = true,
  onOpenChange,
  presentation = "modal",
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const initialFocusRef = useRef(null)
  const DialogComponent = presentation === "sheet" ? MobileSheet : Modal

  function handleOpenChange(nextOpen, detail) {
    setOpen(nextOpen)
    onOpenChange?.(nextOpen, detail)
  }

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>Open settings</button>
      <DialogComponent
        open={open}
        onOpenChange={handleOpenChange}
        title="Arena settings"
        description="Adjust this round."
        triggerRef={triggerRef}
        initialFocusRef={initialFocusRef}
        dismissible={dismissible}
        footer={<button type="button">Save settings</button>}
      >
        <label>
          Player label
          <input ref={initialFocusRef} />
        </label>
      </DialogComponent>
    </>
  )
}

function DialogWithPopoverHarness() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>Open player tools</button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Player tools"
        triggerRef={triggerRef}
      >
        <Popover
          title="Quick actions"
          content={<button type="button">View player profile</button>}
        >
          <button type="button">Show quick actions</button>
        </Popover>
        <Tooltip content="Session rating details">
          <button type="button">Rating help</button>
        </Tooltip>
      </Modal>
    </>
  )
}

describe("Modal and MobileSheet", () => {
  test("labels the dialog, focuses its requested target, traps Tab, and restores its trigger", async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)

    const trigger = screen.getByRole("button", { name: "Open settings" })
    await user.click(trigger)

    const dialog = screen.getByRole("dialog", { name: "Arena settings" })
    const input = within(dialog).getByRole("textbox", { name: "Player label" })
    const close = within(dialog).getByRole("button", { name: "Close dialog" })
    const save = within(dialog).getByRole("button", { name: "Save settings" })

    expect(dialog.getAttribute("aria-modal")).toBe("true")
    expect(document.activeElement).toBe(input)

    await user.tab()
    expect(document.activeElement).toBe(save)
    await user.tab()
    expect(document.activeElement).toBe(close)
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(save)

    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  test("a nondismissible dialog ignores Escape and backdrop presses", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<DialogHarness dismissible={false} onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole("button", { name: "Open settings" }))
    const dialog = screen.getByRole("dialog", { name: "Arena settings" })
    fireEvent.mouseDown(dialog.parentElement)
    await user.keyboard("{Escape}")

    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog", { name: "Arena settings" })).toBe(dialog)
  })

  test("a dismissible backdrop press reports its reason and closes", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<DialogHarness onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole("button", { name: "Open settings" }))
    const dialog = screen.getByRole("dialog", { name: "Arena settings" })
    fireEvent.mouseDown(dialog.parentElement)

    expect(onOpenChange.mock.calls.at(-1)[1].reason).toBe("backdrop")
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  test("the sheet shares the modal Escape and focus-restore contract", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<DialogHarness presentation="sheet" onOpenChange={onOpenChange} />)

    const trigger = screen.getByRole("button", { name: "Open settings" })
    await user.click(trigger)
    const dialog = screen.getByRole("dialog", { name: "Arena settings" })
    expect(dialog.dataset.presentation).toBe("sheet")

    await user.keyboard("{Escape}")
    expect(onOpenChange.mock.calls.at(-1)[1].reason).toBe("escape")
    expect(document.activeElement).toBe(trigger)
  })

  test("an owned popover remains inside the modal focus scope", async () => {
    const user = userEvent.setup()
    render(<DialogWithPopoverHarness />)

    await user.click(screen.getByRole("button", { name: "Open player tools" }))
    await user.click(screen.getByRole("button", { name: "Show quick actions" }))
    const popoverAction = screen.getByRole("button", { name: "View player profile" })
    popoverAction.focus()
    expect(document.activeElement).toBe(popoverAction)

    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close dialog" }))

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog", { name: "Quick actions" })).toBeNull()
    expect(screen.getByRole("dialog", { name: "Player tools" })).not.toBeNull()

    await user.click(screen.getByRole("button", { name: "Rating help" }))
    expect(await screen.findByRole("tooltip")).not.toBeNull()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("tooltip")).toBeNull()
    expect(screen.getByRole("dialog", { name: "Player tools" })).not.toBeNull()
  })
})

describe("Tooltip and Popover", () => {
  test("shows nonessential tooltip copy on focus and closes it with Escape", async () => {
    const user = userEvent.setup()
    render(
      <Tooltip content="Rating gained this session">
        <button type="button">Rating help</button>
      </Tooltip>
    )

    const trigger = screen.getByRole("button", { name: "Rating help" })
    await user.tab()
    const tooltip = await screen.findByRole("tooltip")
    expect(trigger.getAttribute("aria-describedby")).toContain(tooltip.id)

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("tooltip")).toBeNull()
  })

  test("exposes popover disclosure state and dismisses on Escape", async () => {
    const user = userEvent.setup()
    render(
      <Popover title="Player summary" content={<button type="button">View profile</button>}>
        <button type="button">Open player summary</button>
      </Popover>
    )

    const trigger = screen.getByRole("button", { name: "Open player summary" })
    await user.click(trigger)
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByRole("dialog", { name: "Player summary" })).not.toBeNull()

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog", { name: "Player summary" })).toBeNull()
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
  })
})

test("a disabled ActionLink remains an anchor but cannot activate", async () => {
  const user = userEvent.setup()
  const onClick = vi.fn()
  render(
    <ActionLink href="/danger" isDisabled onClick={onClick}>
      Unavailable action
    </ActionLink>
  )

  const link = screen.getByRole("link", { name: "Unavailable action" })
  expect(link.tagName).toBe("A")
  expect(link.getAttribute("aria-disabled")).toBe("true")
  await user.click(link)
  expect(onClick).not.toHaveBeenCalled()
})
