# Non-Profile phone text clipping

Sweep: 16 screens each at 320x640, 360x740, 390x844 and 1280x800 (64 before and 64 after observations). Screens: Lobby, Armory, Shop, Ladder, Duels, History, Help, login, signup, first-round Lobby, live round, Results, settings, Compare Modes, Spec Sheet and Unlock Wall. Profile was excluded. The existing heuristic expands the viewport vertically to inspect scroll content; the new regression checks also measure text at the actual device heights, including elements outside the viewport.

Every raw clipping finding is retained in phone-clipping-audit.json.

- ClickAway wordmark: clipped by the 1px brandText box at 320/360 on every screen with the shell header. Restored visible text; compact spacing, token-based font size and a smaller player chip below 381px. Checked that the wordmark also clears the player chip.
- Armory Install Anchor: desktop three-column feature grid exceeded its clipping card at 320. Put the action across a separate row and permit wrapping below 381px.
- Lobby Pressure (and the edge of its pips): the visually displayed, aria-hidden brief was excluded by the original heuristic. A direct Range check reproduced the 320px crop. Use two columns for Time/Miss and a full-width Pressure row on narrow phones.
- Round HUD STREAK and streak number: clipped by hudCenterChannel at 320 after eight hits. Redistributed phone score/streak/timer columns to fit both streak and combo without cropping.
- Armory Unlocks at Level 21: narrow tray tile clipped the label; exposed further down the page after expanding the featured card. Wrap the requirement and stack its icon above the text on narrow phones.

Intentional heuristic findings, retained:

- Shop's OWNED state and CORE, COMMON, RARE, EPIC and LEGENDARY rarity spans live in an explicitly visually hidden shopItemHeader (1px, clip-path inset(50%)); state/price is repeated on visible price/action controls and rarity is conveyed by the themed card. These are assistive metadata, not visible cropped copy. No Shop layout was changed.
- The 1280 audit already reports Armory instrument 4.0%/hit and POWER TEMPO. These predate this work and are outside the requested phone fixes; desktop CSS is preserved.
- Existing ellipsized player identity/long names and horizontally/vertically scrollable content remain deliberate; full player identity is available from the player chip. No new scrolling or ellipsis was introduced.

Regression evidence: Lobby Pressure also failed a direct Range check before its fix. Branding test failed at 320/360 before CSS changes (brandText clipping), passed at 390/1280. Armory and round checks also failed at 320 before fixes. Final tests measure all fixed text against clipping ancestors and check wordmark overlap.

Desktop: focused 1280x800 Lobby before/after shots are byte-identical. The audit's Armory, Shop, Ladder, Duels, History and Help desktop captures are also byte-identical; the live Lobby audit capture contains time-dependent decoration. All new CSS is scoped below 381px.

Phone evidence is in shots/cleanup, with before-phone-/after-phone- pairs for branding, armory, round, armory-320, round-320, armory-lock and lobby. The lock-label before image replays its original badge CSS in the browser; all other before images were captured before their respective implementation changes.

Refreshed snapshots: mobile-320-play.png, mobile-320-armory.png, mobile-320-shop.png, mobile-320-profile.png, mobile-320-ladder.png, mobile-320-duels.png, mobile-320-history.png and mobile-320-help.png. Each includes the intended shared-header change; no Profile component or Profile-specific CSS was edited. Desktop snapshots were not refreshed.

Validation: lint passed; Node unit tests 215/215 passed; production build passed (two existing unresolved History art URL warnings). Browser assertions: 164/168 passed initially; all four failed cases passed on focused rerun with the final source/default screenshot tolerance. The final focused phone checks cover 12 cases, including the new direct checks for aria-hidden Lobby stats and offscreen locked Armory labels. Optional zz screenshot/animation tools were not run as assertions; the device audit tool was run separately as described above.

Vitest limitation: the exact requested command started but produced no test results. Retried with --pool=threads --maxWorkers=1; one run reported 44 Armory tests with five 5-second timeouts before being stopped. A final retry with --testTimeout=30000 remained active for over 14 minutes without reporting a completed file and was stopped. No UI test or timeout configuration was changed in the repository; Vitest is not claimed as passing.
