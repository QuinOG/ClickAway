import { BuildIdentityGlyph } from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"

/**
 * Mode matrix, reborn (Phase 8): one manifest plate showing the active build's
 * five readouts across all three modes at once. Each value already reads
 * against that mode's own baseline (buildLoadoutPresentation derives
 * summaryStats from the mode/build delta), so nothing here needs re-framing —
 * "Forgiving" in Practice and "Forgiving" in Ranked both mean "safer than this
 * mode's default."
 */
export default function ArmoryModeManifest({ loadoutName, modePresentations = [] }) {
  if (!modePresentations.length) return null

  const statLabels = modePresentations[0].presentation.summaryStats.map((stat) => stat.label)

  return (
    <section className="armoryModeManifest" aria-label="Mode manifest">
      <header className="armoryModeManifestHeader">
        <p className="armoryModeManifestEyebrow">Manifest</p>
        <h3 className="armoryModeManifestTitle">{loadoutName} across modes</h3>
      </header>

      <div className="armoryModeManifestGrid">
        {modePresentations.map(({ mode, presentation }) => (
          <article
            key={mode.id}
            className="armoryModeManifestColumn"
            data-identity={(presentation.identity.label || "Balanced").toLowerCase()}
          >
            <header className="armoryModeManifestColumnHeader">
              <span className="armoryModeManifestColumnGlyph" aria-hidden="true">
                <BuildIdentityGlyph identity={presentation.identity.label} />
              </span>
              <div>
                <strong className="armoryModeManifestMode">{mode.label}</strong>
                <span className="armoryModeManifestIdentity">{presentation.titleLine}</span>
              </div>
            </header>

            <dl className="armoryModeManifestStats">
              {statLabels.map((label) => {
                const stat = presentation.summaryStats.find((candidate) => candidate.label === label)

                return (
                  <div key={label} className="armoryModeManifestStat">
                    <dt className="armoryModeManifestStatLabel">{label}</dt>
                    <dd className="armoryModeManifestStatValue">{stat?.value ?? "—"}</dd>
                  </div>
                )
              })}
            </dl>

            <p className="armoryModeManifestBestFor">{presentation.bestFor}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
