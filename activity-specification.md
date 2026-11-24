# Magnus effect activity specification

Updated 24 November 2026. Working prototype; the user confirms live AI integration works. The interface and simulation presentation were approved on 5 November. This document records the current behavior to preserve when making improvements.

Read [integration notes](./integration-notes.md) for implementation and verification, and [open items](./open-items.md) for unresolved work. New user instructions take precedence. The original source was Group_Magnus_M3.pdf (Group M, EPFL, 8 October 2026); subsequent approved changes supersede it.

## Flow

Participant key -> pre-test placeholder -> treadmill -> illustrated introduction -> formula discovery -> post-test placeholder.

Navigation is learner-controlled. Acceptance never advances the activity automatically. Exactly two simulations are in scope; quiz content and study-data collection are deferred.

| Step | Behavior and exit |
| --- | --- |
| Treadmill setup | Confirm both scene descriptions to enable Drop ball. |
| Prediction | Pause just after contact. Choose Left, Straight or Right; record and lock the choice locally without AI evaluation. Selection enables Reveal what happens. |
| Reveal | A faded replay starts from the drop position, merges into the paused ball, then continues to the apex. |
| Exploration | Direction/speed controls appear after the first reveal. Run again uses the selected settings. Explain the deflection; acceptance or an explicit timed reveal enables Continue. |
| Introduction | Illustrated spin -> pressure difference -> deflecting force, with a backspin tennis example. Continue opens formula discovery. |
| Formula discovery | Explore all four sliders in any order; describe and Check each independently. All four must be Discovered or Revealed to enable Continue. |

## Treadmill

- Contact visibly induces spin. Initial horizontal travel follows the belt, then the rising path curves oppositely; no instantaneous reversal.
- Belt speed is 6–10 m/s in 0.5 steps, initially 8 m/s; direction is selectable. Settings affect the next run and are locked during playback.
- One Run again button; no automatic repetition or reset. Keep the current trajectory plus one faint dashed previous path and apex shadow.
- Completion requires explaining that the ball curves opposite to the treadmill because it is spinning; comparing settings or reversing the belt/rotation is not required. Intuitive language suffices; naming Magnus or pressure differences is unnecessary. A belt-push-only explanation is insufficient.
- Preserve the approved teaching exaggeration and display mapping. These are not calibrated real-world physics; see [motion details](./motion-review.md).

## Formula discovery

Use the exact magnitude formula: F_M = 0.5 * rho * C_L * A * v^2. Do not apply the treadmill teaching multiplier.

| Parameter | Range; initial | Visual cue | Accepted description |
| --- | --- | --- | --- |
| 1: C_L, lift coefficient | 0.1–0.5; 0.3 | Rotation speed | Spin/rotation; formal coefficient name not required |
| 2: rho, fluid density | 0.6–1.8 kg/m³; 1.2 | Air-line density | Amount of air/fluid per volume |
| 3: v, translational velocity | 4–12 m/s; 8 | Air-line speed | Ball/relative airflow speed; spin speed alone is insufficient |
| 4: A, cross-sectional area | 0.01–0.05 m²; 0.03 | Sphere size | Area, size, radius or diameter; not total surface area |

- Sphere centered; counterclockwise rotation, leftward relative airflow and upward force from the centre. The introduction uses the same convention.
- Four controls below the scene, prominent colour-matched formula below them, separate response column. All controls remain available.
- Initially use Parameter 1–4 labels; hide formal names, units and corresponding formula terms. The constant 1/2 stays visible; velocity discovery reveals v².
- A required modal introduces the scene as a spinning ball moving through air before manipulation. The view follows the ball; the formula timer starts after dismissal.
- Ctrl+Enter (and Cmd+Enter) checks the focused response. Borderline answers receive a short clarification question; bare speed requires specifying what is moving.
- Keep Parameter 1–4 labels after completion, preserve the original wording as “What you called it”, and briefly explain the formal quantity for every discovered/revealed parameter.
- Completed formula cards replace the input with a large formal-name heading below a muted uppercase Parameter X label; accepted wording stays visible. Reactive help is disabled for discovered/revealed sliders. Slider headings wrap below a reserved help row.
- Formula multiplication uses dots; hidden terms have colour-filled backgrounds; formula subscripts sit below the baseline. Only the rotating ball markings indicate spin; the static curved arrows are removed.
- Formula checks require physical meaning: spin, air/fluid density, relative ball/air velocity, or ball size/area. Describing lines, markings or circle changes alone is insufficient; formal terminology and force relationships remain unnecessary.
- Acceptance locks that response, reveals its formal label/unit and formula term, marks Discovered and shows localized completion feedback. Other responses remain editable.
- Count Discovered and Revealed separately. Do not require discovering exponents or force relationships.
- Flow/pressure drawings are explanatory, not computed fluid dynamics. Spin illustrates C_L; it does not replace C_L in the formula.
- Positive bounded controls and bounded arrow scaling keep every allowed combination usable without reset.

## Checking and fallback

- Only Check invokes evaluation of written explanations/parameter descriptions. No evaluation on typing; prediction choices use no evaluator.
- While checking, disable only that response and its Check button. Rejection gives minimal feedback, leaving the response editable.
- Diagnostics remain server-side for tutoring. Technical failures preserve drafts and do not count as unsuccessful learning attempts.
- One timer per explanation/formula task; default 360 seconds for the treadmill explanation and 240 seconds for formula discovery in both conditions (treadmill uses 1.5 times the configurable base), paused while the tab is hidden. Typing, checks, slider changes and partial discoveries do not reset it.
- At the threshold, offer optional reveals without automatic disclosure or advancement. Formula reveals are independent per unresolved parameter.
- Preserve the original response separately from the supplied example. Revealed responses are read-only and never count as discoveries.
- Simulation controls remain available after completion, subject to playback locks.

## Tutor assistance

- Separate evaluator and tutor responsibilities; both currently use gpt-6-luna with low reasoning. The application owns physics, locks, timers, reveals, completion and navigation.
- Tutor guidance is Socratic: a short observation prompt/question, without giving undiscovered parameter names or the required explanation. It cannot award completion.
- Reactive: a small gradient-style ? at the top right of treadmill direction/speed and each formula slider. A failed Check never requests help automatically.
- Proactive: no Help controls. The model assesses current context and returns help or wait; timing or failed-check count alone must not determine intervention. It may target prediction choices or the same simulation controls.
- Thinking allowance is Short/Balanced/Extended, initially Balanced; its live behavioral interpretation still needs review.
- Keep one modal guidance bubble until dismissed, with a pointer to its target control. All other controls are inert until it closes, in both conditions. Close uses a cross; Escape also dismisses.
- Track explored controls across the session. Reactive support for an untouched slider first asks the learner to manipulate it and observe. Subsequent support uses drafts, checks, previous hints and current settings. Discard pending guidance when settings or the observed treadmill run change.
- Unresolved slider metadata omits names/units. Tutor prompts forbid disclosure and a server guard replaces obvious leaked names/units with an observation question.
- Airflow speed uses v multiplied by the displayed radius divided by the physical radius sqrt(A/π), so air travels at the calculation velocity relative to the displayed ball size. Longer dash spacing keeps this faster motion readable. Pressure/streamline shapes remain illustrative.

## Preserve during improvements

Keep the restrained English-language interface, top progress bar, task ordering, independent discoveries, timed fallback, condition distinction and learner-controlled navigation. Current presentation and numerical defaults are settled; do not reopen them unless the requested improvement requires it. Scientific and teaching validation remain distinct from interface approval.
