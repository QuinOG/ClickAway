// The History score chart must stay readable from phones to desktops: separate axis labels,
// nothing overlapping, nothing outside the chart.
import { expect, test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks } from "./fixtures.js"

const history = AUTHENTICATED_ROUTES.find((route) => route.id === "history")

for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
  test(`History chart is readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await installApiMocks(page)
    await gotoRoute(page, history)

    const report = await page.evaluate(() => {
      const chart = document.querySelector(".historyTrajectory")
      const bounds = chart.getBoundingClientRect()
      const box = (element) => element.getBoundingClientRect()
      const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
      const items = [
        ["title", chart.querySelector("h2")],
        ["change", chart.querySelector(".historyTrajectoryDelta")],
        ...[...chart.querySelectorAll(".historyTrajectoryLegend button")].map((el) => [el.textContent.trim(), el]),
        ...[...chart.querySelectorAll(".historyClimbMedal")].map((el, index) => [`score ${index + 1}`, el]),
        ...[...chart.querySelectorAll(".historyClimbAxis span")].map((el) => [`axis ${el.textContent}`, el]),
      ]
      const clashes = []
      for (let i = 0; i < items.length; i += 1) {
        for (let j = i + 1; j < items.length; j += 1) {
          if (overlaps(box(items[i][1]), box(items[j][1]))) clashes.push(`${items[i][0]} / ${items[j][0]}`)
        }
      }
      const outside = items.filter(([, el]) => box(el).left < bounds.left - 1 || box(el).right > bounds.right + 1).map(([name]) => name)
      const axisTops = [...chart.querySelectorAll(".historyClimbAxis span")].map((el) => Math.round(box(el).top))
      const line = chart.querySelector(".historyClimbLine polyline")
      const matrix = line.getScreenCTM()
      const linePoints = [...Array(line.points.numberOfItems).keys()].map((index) => line.points.getItem(index).matrixTransform(matrix))
      const dots = [...chart.querySelectorAll(".historyClimbPillar")].map((el) => ({ x: box(el).left + box(el).width / 2, y: box(el).top + box(el).height / 2 }))
      const lineGap = Math.max(...linePoints.map((point, index) => Math.hypot(point.x - dots[index].x, point.y - dots[index].y)))
      return { clashes, outside, axisTops, lineGap }
    })

    expect(report.clashes, "nothing in the chart overlaps").toEqual([])
    expect(report.outside, "nothing sits outside the chart").toEqual([])
    expect(new Set(report.axisTops).size, "axis labels are on separate lines").toBe(report.axisTops.length)
    expect(report.lineGap, "the trend line passes through every score dot").toBeLessThanOrEqual(2)
  })
}
