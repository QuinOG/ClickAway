export function audit({ touch }) {
  const vw = document.documentElement.clientWidth
  const describe = (el) => {
    const cls = [...el.classList].slice(0, 2).join(".")
    const text = (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 32)
    return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${text ? ` "${text}"` : ""}`
  }
  const shown = (el) => {
    const s = getComputedStyle(el); const r = el.getBoundingClientRect()
    if (!(r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none")) return false
    if (el.closest("[aria-hidden='true'], .uiVisuallyHidden, .srOnly, [hidden]")) return false
    // Content of a collapsed <details> (its summary stays visible).
    const det = el.closest("details:not([open])"); if (det && !el.closest("summary")) return false
    for (let a = el; a; a = a.parentElement) if (Number(getComputedStyle(a).opacity) < 0.05) return false
    return true
  }
  // Is this element what a player actually sees at its centre (not layered under something)?
  const onTop = (el, r) => {
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return Boolean(hit) && (hit === el || el.contains(hit) || hit.contains(el))
  }
  // Inside a pinned bar (nav, header)? Full-screen fixed layers such as a live round still count.
  const inFixed = (el) => {
    for (let a = el; a; a = a.parentElement) {
      const p = getComputedStyle(a).position
      if ((p === "fixed" || p === "sticky") && a.getBoundingClientRect().height < innerHeight * 0.4) return true
    }
    return false
  }
  const all = [...document.querySelectorAll("body *")].filter(shown)
  const issues = { sideways: [], clipped: [], overlaps: [], unreachable: [], smallTargets: [] }

  // 1. Content sticking out of the screen sideways (ignores decorative art).
  for (const el of all) {
    if (el.matches("img, svg, svg *, canvas, video, picture") || getComputedStyle(el).pointerEvents === "none") continue
    if (!el.innerText?.trim() && !el.matches("button, a, input, select, textarea")) continue
    const r = el.getBoundingClientRect()
    if (r.right > vw + 2 || r.left < -2) {
      let clipped = false
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const s = getComputedStyle(a)
        if (/(hidden|clip|auto|scroll)/.test(s.overflowX) && a.getBoundingClientRect().right <= vw + 2) { clipped = true; break }
      }
      if (!clipped) issues.sideways.push(`${describe(el)} [${Math.round(r.left)}→${Math.round(r.right)} of ${vw}]`)
    }
  }

  // 2. Text cut off by a clipping parent, or overflowing its own box without an ellipsis.
  const textEls = all.filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
  for (const el of textEls) {
    const range = document.createRange(); range.selectNodeContents(el)
    const tr = range.getBoundingClientRect(); if (tr.width < 2) continue
    const s = getComputedStyle(el)
    if (s.textOverflow === "ellipsis") continue
    if (!onTop(el, tr)) continue
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const as = getComputedStyle(a)
      // Scrolling areas keep their content reachable, so stop there.
      if (/(auto|scroll)/.test(as.overflowX + as.overflowY)) break
      const clipsX = /(hidden|clip)/.test(as.overflowX), clipsY = /(hidden|clip)/.test(as.overflowY)
      if (!clipsX && !clipsY) continue
      if (as.textOverflow === "ellipsis") break
      const ar = a.getBoundingClientRect()
      const outX = clipsX && (tr.right > ar.right + 2 || tr.left < ar.left - 2)
      const outY = clipsY && (tr.bottom > ar.bottom + 2 || tr.top < ar.top - 2)
      if (outX || outY) { issues.clipped.push(`${describe(el)} cut by ${describe(a).slice(0, 40)}`); break }
    }
  }

  // 3. Text drawn on top of other text.
  const leaves = textEls.filter((el) => !inFixed(el)).map((el) => {
    const range = document.createRange(); range.selectNodeContents(el); return { el, r: range.getBoundingClientRect() }
  }).filter(({ el, r }) => r.width > 4 && r.height > 4 && onTop(el, r))
  // Sweep top to bottom so only text on the same lines is compared.
  leaves.sort((x, y) => x.r.top - y.r.top)
  for (let i = 0; i < leaves.length; i += 1) {
    for (let j = i + 1; j < leaves.length && leaves[j].r.top < leaves[i].r.bottom; j += 1) {
      const a = leaves[i], b = leaves[j]
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)
      const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
      if (w <= 2 || h <= 2) continue
      const smaller = Math.min(a.r.width * a.r.height, b.r.width * b.r.height)
      if ((w * h) / smaller > 0.25) issues.overlaps.push(`${describe(a.el)} × ${describe(b.el)}`)
    }
  }

  // 3b. Buttons and links with something else on top of them (not a dialog or
  // backdrop that covers the page on purpose), so a tap lands on the wrong thing.
  const pageArea = innerWidth * innerHeight
  for (const el of all.filter((e) => e.matches("button, a[href], [role='tab']"))) {
    const r = el.getBoundingClientRect()
    if (r.bottom < 0 || r.top > innerHeight) continue
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    if (!hit || el.contains(hit) || hit.contains(el)) continue
    let layer = hit
    for (let a = hit; a; a = a.parentElement) { const p = getComputedStyle(a).position; if (p === "fixed" || p === "absolute" || p === "sticky") { layer = a; break } }
    const lr = layer.getBoundingClientRect()
    if (lr.width * lr.height > pageArea * 0.35 || hit.closest("[role='dialog'], .gameOverlay")) continue
    issues.unreachable.push(`${describe(el)} under ${describe(hit).slice(0, 40)}`)
  }

  // 4. Touch targets under 32px (touch devices only; 44px is the comfortable size).
  if (touch) {
    for (const el of all.filter((e) => e.matches("button, a[href], input, select, [role='tab'], [role='button']"))) {
      if (el.disabled) continue
      const r = el.getBoundingClientRect()
      if (r.width < 32 || r.height < 32) issues.smallTargets.push(`${describe(el)} ${Math.round(r.width)}×${Math.round(r.height)}`)
    }
  }
  for (const key of Object.keys(issues)) issues[key] = [...new Set(issues[key])].slice(0, 25)
  return { scrollWidth: document.documentElement.scrollWidth, viewportWidth: vw, issues }
}
