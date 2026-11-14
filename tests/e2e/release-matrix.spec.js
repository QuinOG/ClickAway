import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

import {
  AUTHENTICATED_ROUTES,
  getOverflowReport,
  gotoRoute,
  installApiMocks,
  prepareDeterministicPage,
} from "./fixtures.js"

const RESPONSIVE_MATRIX = [
  { id: "compact", width: 320, height: 844 },
  { id: "small", width: 360, height: 800 },
  { id: "phone", width: 390, height: 844 },
  { id: "large-phone", width: 430, height: 932 },
  { id: "landscape", width: 667, height: 375 },
  { id: "tablet", width: 768, height: 1024 },
  { id: "laptop", width: 1024, height: 700 },
  { id: "desktop", width: 1440, height: 1000 },
]

test.describe("responsive route matrix", () => {
  for (const viewport of RESPONSIVE_MATRIX) {
    for (const route of AUTHENTICATED_ROUTES) {
    test(`${viewport.id} ${route.id} has no horizontal overflow or clipped primary action`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await prepareDeterministicPage(page)

        await gotoRoute(page, route)
        await page.locator("*").evaluateAll((elements) => {
          elements.forEach((element) => {
            if (getComputedStyle(element).contentVisibility === "auto") {
              element.style.contentVisibility = "visible"
            }
          })
        })
        const report = await getOverflowReport(page)
        expect(
          report.scrollWidth,
          `${route.path} at ${viewport.width}x${viewport.height}: ${JSON.stringify(report.offenders, null, 2)}`
        ).toBeLessThanOrEqual(report.viewportWidth + 1)

        const clippedActions = await page.locator(
          "button.primaryButton:visible, a.primaryButton:visible, [data-ui-action][data-intent='primary']:visible"
        ).evaluateAll((elements) => elements
          .map((element) => {
            const rect = element.getBoundingClientRect()
            return { label: element.textContent?.trim(), left: rect.left, right: rect.right }
          })
          .filter((rect) => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1))
        expect(clippedActions, `${route.path} clipped actions`).toEqual([])
    })
    }
  }
})

for (const route of AUTHENTICATED_ROUTES) {
test(`${route.id} has no serious or critical automated accessibility violations`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepareDeterministicPage(page)

    await gotoRoute(page, route)
    const results = await new AxeBuilder({ page })
      .analyze()
    const blockingViolations = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious"
    )
    expect(blockingViolations, `${route.path} accessibility violations`).toEqual([])
})
}

for (const state of ["gallery", "range", "compare bench", "unlock wall"]) {
  test(`armory ${state} has no serious or critical accessibility violations`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await prepareDeterministicPage(page)
    await gotoRoute(page, { path: "/armory", heading: "Armory" })
    if (state === "gallery") {
      await page.getByRole("button", { name: /Powerups/i }).click()
      await expect(page.getByRole("group", { name: "Powerups", exact: true })).toBeVisible()
    } else if (state === "range") {
      await page.getByRole("button", { name: /Test Run/i }).click()
      await page.getByRole("button", { name: "Start test run" }).click()
      await expect(page.getByRole("group", { name: "Test range", exact: true })).toBeVisible()
    } else if (state === "compare bench") {
      await page.getByRole("button", { name: "Compare with active" }).first().click()
      await expect(page.getByRole("dialog", { name: "Compare bench" })).toBeVisible()
    } else {
      await page.getByRole("button", { name: "Unlock Wall" }).click()
      await expect(page.getByRole("dialog", { name: "Unlock wall" })).toBeVisible()
    }
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([])
  })
}

test("keyboard navigation, mobile More, and settings focus restoration stay coherent", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: () => true,
    })
  })
  await prepareDeterministicPage(page)
  await gotoRoute(page, AUTHENTICATED_ROUTES[0])

  const moreButton = page.getByRole("button", { name: "More" })
  await moreButton.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("dialog", { name: "More", exact: true })).toBeVisible()

  const historyLink = page.getByRole("link", { name: /History/ }).last()
  await historyLink.focus()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/history$/)
  await expect(page.getByRole("heading", { name: "Match history" })).toBeVisible()

  const activeMore = page.getByRole("button", { name: "History" })
  await activeMore.click()
  await page.getByRole("button", { name: /Settings/ }).last().click()
  const settingsDialog = page.getByRole("dialog", { name: "Feedback settings" })
  await expect(settingsDialog).toBeVisible()
  await page.getByLabel("Mute all sound").focus()
  await page.keyboard.press("Space")
  await page.getByLabel("Touch vibration").focus()
  await page.keyboard.press("Space")
  await page.getByRole("button", { name: "Apply" }).click()
  await expect(page.locator("html")).toHaveAttribute("data-sound", "on")
  expect(await page.evaluate(() => JSON.parse(
    localStorage.getItem("clickaway.feedback-preferences.v1")
  ).haptics)).toBe(true)
  await page.keyboard.press("Escape")
  await expect(settingsDialog).toBeHidden()
  await expect(activeMore).toBeFocused()
})

test("touch and pointer inputs expose the same navigation and mode detail", async ({ browser, page }) => {
  const touchContext = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  })
  const touchPage = await touchContext.newPage()
  await prepareDeterministicPage(touchPage)
  await gotoRoute(touchPage, AUTHENTICATED_ROUTES[0])
  await touchPage.getByRole("button", { name: "Select Ranked" }).tap()
  await expect(touchPage.getByRole("button", { name: "Select Ranked" }))
    .toHaveAttribute("aria-pressed", "true")
  await touchPage.getByRole("button", { name: "More" }).tap()
  await expect(touchPage.getByRole("dialog", { name: "More", exact: true })).toBeVisible()
  await touchContext.close()

  await page.setViewportSize({ width: 1440, height: 1000 })
  await prepareDeterministicPage(page)
  await gotoRoute(page, AUTHENTICATED_ROUTES[0])
  await page.getByRole("button", { name: "Select Ranked" }).hover()
  await expect(page.getByRole("tooltip")).toContainText("15s")
})

test("account restore, login, and logout preserve the route contract", async ({ page }) => {
  await installApiMocks(page, { authenticated: false })
  await page.goto("/login")
  await page.getByLabel("Username").fill("Vector")
  await page.locator('input[name="password"]').fill("precision-pass")
  await page.getByRole("button", { name: "Enter arena" }).click()
  await expect(page).toHaveURL(/\/game$/)
  await expect(page.getByRole("heading", { name: "Enter the arena" })).toBeVisible()

  await page.getByRole("link", { name: "Profile" }).click()
  await expect(page).toHaveURL(/\/profile$/)
  await page.getByRole("button", { name: "Log out" }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("heading", { name: "Return to the arena." })).toBeVisible()
})

test("shop unlock-to-equip and duel response journeys keep inline continuity", async ({ page }) => {
  await prepareDeterministicPage(page)
  await page.goto("/shop")
  await expect(page.getByRole("heading", { name: "Cosmetic shop" })).toBeVisible()
  await page.getByRole("button", { name: "Preview Fireball" }).click()
  await page.getByRole("button", { name: /Unlock for .* coins/ }).click()
  await expect(page.getByText(/Fireball unlocked\. Preview held/)).toBeVisible()
  await page.getByRole("button", { name: "Equip Button" }).click()
  await expect(page.getByText("Fireball equipped. Your live loadout is updated.")).toBeVisible()

  await page.goto("/challenges")
  await expect(page.getByRole("heading", { name: "Duel command" })).toBeVisible()
  await page.getByRole("button", { name: "Accept" }).click()
  await expect(page.getByRole("button", { name: "Race Ghost" })).toBeVisible()

  await page.getByLabel("Opponent username").fill("Prism")
  await page.getByRole("radio", { name: /920 Score/ }).check()
  await page.getByRole("button", { name: "Send duel" }).click()
  await expect(page.getByText(/Duel transmitted to Prism/i)).toBeVisible()
})

test("history pagination and Ladder filtering remain recoverable", async ({ page }) => {
  await prepareDeterministicPage(page)
  await page.goto("/history")
  await page.getByRole("button", { name: "Load older rounds" }).click()
  await expect(page.getByRole("button", { name: "Load older rounds" })).toBeHidden()

  await page.goto("/leaderboard")
  const bestScoreTab = page.getByRole("tab", { name: "Best Score" })
  await bestScoreTab.click()
  await expect(bestScoreTab).toHaveAttribute("aria-selected", "true")
  await page.getByRole("button", { name: "Around Me" }).click()
  await expect(page.getByRole("button", { name: "Around Me" })).toHaveAttribute("aria-pressed", "true")
})

test("Armory install and factory reset persist their visible build state", async ({ page }) => {
  await prepareDeterministicPage(page)
  await page.goto("/armory")
  await expect(page.getByRole("heading", { name: "Armory" })).toBeVisible()

  const overdrive = page.locator('[data-part-id="tempo_overdrive"]')
  await overdrive.click()
  await expect(overdrive).toHaveAttribute("aria-pressed", "true")
  await expect(overdrive).toHaveAttribute("data-armory-state", "installed")

  await page.getByText("Build options").click()
  await page.getByRole("button", { name: "Strip to Factory Spec" }).click()
  await page.getByRole("button", { name: "Confirm Strip" }).click()
  await expect(page.locator('[data-part-id="tempo_balanced"]'))
    .toHaveAttribute("data-armory-state", "installed")
})

test("session loading remains explicit until authentication resolves", async ({ page }) => {
  await installApiMocks(page)
  let releaseAuth
  const authGate = new Promise((resolve) => { releaseAuth = resolve })
  await page.route("**/api/auth/me", async (route) => {
    await authGate
    await route.fallback()
  })
  const navigation = page.goto("/game")
  await expect(page.getByRole("heading", { name: "Calibrating your session" })).toBeVisible()
  releaseAuth()
  await navigation
  await expect(page.getByRole("heading", { name: "Enter the arena" })).toBeVisible()

})

for (const dataState of ["sparse", "empty", "error"]) {
  test(`${dataState} leaderboard and duel states remain explicit`, async ({ page: scenarioPage }) => {
    await scenarioPage.setViewportSize({ width: 390, height: 844 })
    await prepareDeterministicPage(scenarioPage, { dataState })

    await scenarioPage.goto("/leaderboard")
    await expect(scenarioPage.getByRole("heading", { name: "Climb the field" })).toBeVisible()
    if (dataState === "error") {
      await expect(scenarioPage.getByRole("alert")).toContainText("temporarily unavailable")
      await expect(scenarioPage.getByRole("button", { name: /retry/i })).toBeVisible()
    } else if (dataState === "empty") {
      await expect(scenarioPage.getByText(/No ranked players|No standings|No players/i).first()).toBeVisible()
    } else {
      await expect(scenarioPage.getByText("Nova").first()).toBeVisible()
    }

    await scenarioPage.goto("/challenges")
    await expect(scenarioPage.getByRole("heading", { name: "Duel command" })).toBeVisible()
    if (dataState === "error") {
      await expect(scenarioPage.getByRole("alert")).toContainText("offline")
      await expect(scenarioPage.getByRole("button", { name: /retry/i })).toBeVisible()
    } else if (dataState === "empty") {
      await expect(scenarioPage.getByText(/No duels|radar is clear|No challenges/i).first()).toBeVisible()
    }
  })
}

test("a cold lazy route keeps its destination-shaped loading scene", async ({ page }) => {
  await installApiMocks(page)
  let releaseRoute
  const routeGate = new Promise((resolve) => { releaseRoute = resolve })
  await page.route("**/src/pages/HistoryPage.jsx*", async (route) => {
    await routeGate
    await route.continue()
  })

  const navigation = page.goto("/history")
  await expect(page.getByText("Reconstructing match data", { exact: true })).toBeVisible()
  await expect(page.locator(".routeFallback")).toHaveAttribute("aria-busy", "true")
  releaseRoute()
  await navigation
  await expect(page.getByRole("heading", { name: "Match history" })).toBeVisible()
})

test("Practice can be selected and entered with keyboard input under reduced feedback", async ({ page }) => {
  await installApiMocks(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/game")
  await expect(page.getByRole("heading", { name: "Enter the arena" })).toBeVisible()

  const practice = page.getByRole("button", { name: "Select Practice" })
  await practice.focus()
  await page.keyboard.press("Enter")
  await expect(practice).toHaveAttribute("aria-pressed", "true")
  await page.getByRole("button", { name: "Start Practice" }).focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("status").filter({ hasText: "3" })).toBeVisible()
  await expect(page.locator(".appShell")).toHaveClass(/isLiveRound/)
})


test("Armory overlays contain keyboard focus and restore their opener", async ({ page }) => {
  await prepareDeterministicPage(page)
  await gotoRoute(page, { path: "/armory", heading: "Armory" })
  for (const [label, name] of [["Spec Sheet", "Build spec sheet"], ["Compare Modes", "Compare bench"], ["Unlock Wall", "Unlock wall"]]) {
    const opener = page.getByRole("button", { name: label, exact: true })
    await opener.click()
    const dialog = page.getByRole("dialog", { name, exact: true })
    await expect(dialog).toBeVisible()
    const buttons = dialog.locator('button:visible:not([disabled]):not([tabindex="-1"])')
    await buttons.last().focus()
    await page.keyboard.press("Tab")
    await expect(buttons.first()).toBeFocused()
    await page.keyboard.press("Shift+Tab")
    await expect(buttons.last()).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  }
})

test("Shop categories support roving arrow, Home, and End keys", async ({ page }) => {
  await prepareDeterministicPage(page)
  await gotoRoute(page, { path: "/shop", heading: "Cosmetic shop" })
  const tabs = page.getByRole("tablist", { name: "Shop categories" }).getByRole("tab")
  await tabs.first().focus()
  const last = await tabs.count() - 1
  for (const [key, index] of [["ArrowLeft", last], ["ArrowRight", 0], ["End", last], ["Home", 0], ["ArrowRight", 1]]) {
    await page.keyboard.press(key)
    await expect(tabs.nth(index)).toBeFocused()
    await expect(tabs.nth(index)).toHaveAttribute("aria-selected", "true")
    await expect(tabs.nth(index)).toHaveAttribute("tabindex", "0")
  }
})
