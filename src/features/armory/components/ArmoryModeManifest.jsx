import { BuildIdentityGlyph } from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"
import { getExactMetric } from "../armoryExactMetrics.js"

/**
 * Mode matrix, reborn (Phase 8): one manifest plate showing the active build's
 * five readouts across all three modes at once. Each value already reads
 * against that mode's own baseline (buildLoadoutPresentation derives
 * summaryStats from the mode/build delta), so nothing here needs re-framing —
 * "Forgiving" in Practice and "Forgiving" in Ranked both mean "safer than this
 * mode's default."
 */
const METRIC_READERS = {
  "Aim Window": (rules) => rules.initialButtonSize,
  "Shrink Pace": (rules) => 1 - rules.shrinkFactor,
  "Combo Ramp": (rules) => rules.comboStep,
  "Miss Cost": (rules) => rules.missPenalty,
  "Power Tempo": (rules) => rules.powerupAwardMultiplier,
}
const MODE_PRESSURE = { easy: 1, normal: 2, hard: 3 }

function getBarPercent(label, rules, modePresentations) {
  const read = METRIC_READERS[label]
  if (!read) return null
  const max = Math.max(...modePresentations.map(({ presentation }) => Number(read(presentation.roundRules)) || 0))
  if (max <= 0) return 6
  return Math.max(6, Math.round(((Number(read(rules)) || 0) / max) * 100))
}

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
            className={`armoryModeManifestColumn mode-${mode.id}`}
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
              <span className="armoryModeManifestPressure" aria-label={`Pressure ${MODE_PRESSURE[mode.id] ?? 2} of 3`}>
                {[1, 2, 3].map((pip) => (
                  <i key={pip} className={pip <= (MODE_PRESSURE[mode.id] ?? 2) ? "isOn" : ""} />
                ))}
              </span>
            </header>

            <dl className="armoryModeManifestStats">
              {statLabels.map((label) => {
                const stat = presentation.summaryStats.find((candidate) => candidate.label === label)
                const barPercent = getBarPercent(label, presentation.roundRules, modePresentations)

                return (
                  <div key={label} className="armoryModeManifestStat">
                    <dt className="armoryModeManifestStatLabel">{label}</dt>
                    <dd className="armoryModeManifestStatValue">
                      {getExactMetric(label, presentation.roundRules).text}
                      <small>{stat?.value ?? "—"}</small>
                      {barPercent !== null ? (
                        <span className="armoryModeManifestBar" aria-hidden="true">
                          <i style={{ width: `${barPercent}%` }} />
                        </span>
                      ) : null}
                    </dd>
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
