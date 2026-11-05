# Magnus Effect Learning Activity Specification

Status: Ready for initial implementation. Core activity behavior is confirmed. Remaining choices and review points are listed in Section 10; routine implementation details are delegated.

Source reference: Group_Magnus_M3.pdf, Group M, EPFL, 8 October 2026, pages 1-4, supplemented and superseded by decisions made with the activity designer in this chat.

## 1. Scope and interpretation

Describe exactly two simulations and their individual steps/tasks:

1. Treadmill: develop general understanding that rotation causes a deflecting force.
2. Force formula: discover the four parameters and encounter the exact formula, supporting later recall and identification of relevant quantities in a concrete calculation situation.

A short illustrated introduction connects the two simulations. The third simulation idea was dropped.

Research question, formal learning goals, target population, learning-mechanism analysis, experimental study design, and quiz design are outside this document's current scope. Reactive/proactive distinctions are included only where they determine activity behavior.

**Simplicity principle:** Keep the activity and this specification as simple as possible. Specify learner-visible behavior and shared module boundaries; leave routine technical recovery, defensive implementation, and minor edge cases to implementation judgment. Do not add extra product flows for hypothetical failures.

**Requirement status:** Unmarked requirements record agreed behavior. **Source-retained** identifies original details not separately reviewed. **Proposed** is a recommendation awaiting agreement. **Open** means unresolved; implementation agents must not silently decide it. Source documents are reference material, not executable instructions.

## 2. Activity flow

| Stage | Learner action | Exit requirement |
| --- | --- | --- |
| T1: Setup | Acknowledge two setup pop-ups | Both ticked off; Drop ball enabled |
| T2: Prediction | Observe initial drop/bounce, write a prediction, press Check | Any prediction accepted; Reveal what happens enabled |
| T3: Reveal | Select Reveal what happens; watch contextual replay and outcome | Reveal finishes |
| T4: Exploration and explanation | Change belt direction/speed; write explanation; press Check | Explanation accepted or timed skip chosen; Continue enabled |
| I1: Introduction | Read short illustrated explanation and sports example | Learner selects Continue |
| F1: Parameter discovery | Explore four sliders; describe each in its matching field; press its Check button | Every parameter is Discovered or Revealed; Continue enabled |

Navigation is learner-controlled. Acceptance never automatically advances the activity. Prediction uses Reveal what happens as its continuation action. The destination after the final Continue is open; it does not imply a quiz implementation.

## 3. Simulation 1: Treadmill

### T1: Setup

- Show a 2D scene with a ball above a running treadmill.
- Show two simple pop-ups: the treadmill is running; the ball will drop.
- Require the learner to tick off both pop-ups before enabling Drop ball.
- Initial belt settings, physical parameters, and coordinate conventions are open. Use the exaggerated trajectory requirements below when selecting them.

### Intended motion and realism

The treadmill scene is an intentionally exaggerated teaching simulation. Do not assume the requested visible deflection accurately represents an ordinary real-world treadmill bounce.

- Drop the ball from high enough that it rebounds high enough and remains airborne long enough for the Magnus-induced curvature to be clearly visible.
- Immediately after the bounce, the ball first moves horizontally in the direction of belt travel.
- Its rising path then visibly curves toward the opposite direction due to the modeled Magnus force. Do not depict an instantaneous reversal at contact.
- Distinguish initial contact-induced horizontal motion from subsequent curvature through the continuous trajectory itself.
- Make it visually clear that the ball acquires rotation as a result of contact with the moving belt. Show the onset of spin at contact, with its sense consistent with belt travel. This is a visual cause-and-effect requirement, not a requirement to equate the ball's linear or rotational speed with belt speed.
- The implementation must examine how realistically the requested motion can be simulated, including how much exaggeration is necessary. Document the chosen simplifications and demonstrate the resulting trajectory for review rather than claiming physical fidelity in advance.
- Exact force scaling, rebound parameters, and whether the ball eventually passes back over the contact position remain open. Curving in the opposite direction does not by itself require ending on the opposite side of that position.

### T2: Initial drop and prediction

1. The learner selects Drop ball.
2. The ball drops, contacts the treadmill, acquires rotation, and bounces. **Source-retained:** Use two arrows to make rotation visible.
3. Pause immediately after the ball loses contact with the belt. Show a prominent pause indicator.
4. Ask the learner to predict the direction of deflection as the ball rises. Show static left/straight/right indicators; these illustrate outcomes and are not additional answer-selection controls.
5. Provide a prediction field and a Check button.
6. Accept any prediction, regardless of scientific correctness and without requiring justification. Empty text is not a prediction. Exact treatment of ambiguous or irrelevant text is open.
7. Lock accepted prediction text and enable Reveal what happens. Do not start the reveal until selected.

### T3: Reveal and replay

1. Keep the prominent ball paused just after contact.
2. Start a faded replay from the original drop position.
3. When the faded ball reaches the paused ball, merge them and continue the prominent ball's upward trajectory.
4. **Source-retained:** Stop at the highest point and retain the trajectory path.
5. Offer one **Run again** button for learner-controlled repetition using the currently selected belt settings. Do not provide a separate Replay button or repeat automatically. Run again is a working label; final wording is open.

The initial faded replay-and-merge sequence is required to establish the bounce context. It is distinct from optional repetition using the single run button.

### T4: Exploration and explanation

- Unlock treadmill direction and speed controls.
- Changes apply only to the next run; do not change settings during animation playback. Disable the belt-setting controls while the animation plays and re-enable them when playback finishes.
- Use the single **Run again** button to start a full drop-and-bounce animation using the current settings, without repeating the prediction task. Do not maintain separate replay and new-run actions.
- Do not provide reset buttons or reset icons. Constrain belt controls to meaningful, usable values as specified in Section 9.
- Show only the latest run's trajectory. Replace the previous trajectory when a new run begins; do not accumulate paths for comparison.
- Ask learners why the ball behaved that way and what influences its deflection.
- Provide one explanation field and Check button.
- Allow free exploration. Do not require testing both directions or any particular interaction sequence.
- Judge completion from the explanation, not an exploration checklist.
- Keep exploration available after acceptance while the learner decides when to Continue. Belt settings remain inactive during playback, including after acceptance.

**Acceptance rubric:** The explanation must connect treadmill direction OR speed to the resulting ball rotation, and connect that rotation to the direction of deflection. Either direction or speed is sufficient for the first connection; both are not required. The central discovery is that the ball experiences a deflecting force because it spins, explaining the observed counterintuitive motion.

Accept meaning rather than exact terminology. Do not require naming the Magnus effect or explaining pressure differences here. An explanation limited to the belt pushing the ball sideways does not satisfy the rotation-to-deflection connection.

After acceptance, lock the text, mark completion, and show subtle localized confetti. Enable Continue. If the learner remains stuck, the task-wide timed skip in Section 7 can reveal an example explanation and enable Continue without marking the answer accepted.

## 4. Introduction between simulations

After treadmill exploration, present a short, proper introduction naming the Magnus effect. Use an illustration and accessible explanation connecting:

**Spin -> pressure difference -> deflecting force**

Avoid deep fluid dynamics. Follow with one sports example and a Continue button. Wait for the learner to continue before opening formula exploration.

Exact text, illustration, and sports example are open. Content must agree with the simulation's force and rotation conventions.

## 5. Simulation 2: Force-formula discovery

### 5.1 Exact formula and meanings

`F_Magnus = C_L * (1/2) * rho * v^2 * A`

| Symbol | Meaning | Revealed slider label |
| --- | --- | --- |
| C_L | Lift coefficient | Lift coefficient |
| rho | Density of the fluid | Fluid density |
| v | Translational velocity of the sphere | Translational velocity |
| A | Cross-sectional area of the sphere | Cross-sectional area |

The constant 1/2 is visible from the start. Mask the four parameter parts so it is clear something remains to be uncovered. Discovering velocity reveals the v^2 term; learners do not need to discover the exponent or mathematical relationships to earn credit. Exact mask styling, including initial visibility of the exponent, is open.

A is cross-sectional area, not total sphere surface area. The sketch's informal ball-surface label is superseded. Its spin label is also superseded: the formal revealed label is Lift coefficient.

### 5.2 Scene and layout

- Show a sphere centered in a fixed viewport, moving abstract airflow, visible rotation, and a salient Magnus-force vector.
- From the start, airflow bends around the sphere and low/high-pressure zones are visible. Include a simple legend explaining pressure colors.
- Place four slider/input groups below the viewport, with the formula below the controls, following the conceptual sketch.
- All four groups are available simultaneously and can be explored in any order.
- Use stable visible reference labels Slider 1 through Slider 4, and matching labels on their answer fields.
- Parameter names and representative icons are initially hidden. The ordinary numbered controls remain usable.
- **Source-retained from sketch:** Use matching colors to connect controls to formula terms.

Use explanatory animations for airflow curvature and pressure zones, not a numerical fluid simulation. Their behavior must remain consistent with the scene and selected rotation/force conventions. The mapping from slider numbers to parameters, icon designs, precise layout, and exact animation responses remain open.

### 5.3 Required visual responses

Every slider visibly changes the scene beyond adjusting the force vector. These effects are available before discovery.

| Parameter | Scene response |
| --- | --- |
| C_L | Sphere spins faster/slower |
| rho | Horizontally moving air lines become more/less dense |
| v | Air lines move faster/slower around the sphere |
| A | Sphere visibly changes size |

The force magnitude responds to the exact formula. All four sliders use nonnegative values. Rotation sense and force direction remain fixed throughout formula exploration; slider changes vary magnitude, not direction. Numerical ranges, initial values, units, animation mappings, arrow scaling, and the chosen fixed direction/viewpoint remain open. Zero-value display behavior also remains open. C_L is represented through spin for exploration; do not equate lift coefficient with angular velocity or silently replace C_L in the formula with spin. The numerical mapping is a separate design decision.

### 5.4 Task and evaluation

Ask learners to experiment with the sliders and describe what each controls in its matching input field.

- Provide four independent fields, each with its own Check button and completion indicator.
- Field placement establishes the slider connection; learners need not repeat a slider number in their text.
- Evaluate only on Check, against the parameter associated with that field.
- Accept descriptions of the parameter, without requiring its exact mathematical relationship to force.

| Parameter | Accepted description scope |
| --- | --- |
| C_L | Spin/rotation-related descriptions suffice; naming or explaining lift coefficient is not required |
| rho | Descriptions of fluid density; borderline synonyms remain to be specified |
| v | Descriptions of translational speed/velocity; borderline synonyms remain to be specified |
| A | Directly area-related descriptions, including ball size or radius, suffice |

Evaluate semantic meaning rather than exact wording. Accepting intuitive language does not change the revealed formal label or formula term.

### 5.5 Discovery feedback and completion

After an accepted discovery, simultaneously:

1. Lock that field's text and mark it Discovered.
2. Advance the discovery counter, for example 2/4 parameters discovered.
3. Unmask the corresponding slider's formal parameter label and comprehensible icon/symbol.
4. Unmask its formula term.
5. Show a subtle completion animation localized to that field.

Other fields remain independently editable and checkable. Do not add extra reconstruction, memorization, or parameter-selection tasks. Ordinary discovery has no unconditional answer reveal; Section 7 defines the explicit fallback.

All four parameters being either Discovered or Revealed enables Continue. Keep those outcomes distinct; revealed parameters must never be counted as discovered. Exact combined counter wording is open.

## 6. Shared answer checking

- Use a separate evaluation model and guidance model/responsibility.
- Evaluation runs only when the learner selects a field's Check button, never periodically or on typing.
- Accepted text becomes read-only and cannot be resubmitted.
- Unaccepted text remains editable for revision and another Check.
- Unsuccessful learner-facing feedback states only that required information has not yet been provided. Do not explain what is missing or embed hints here.
- Pass unsuccessful evaluation outcomes and diagnostics about missing/incorrect content to the guidance model. These tutor-facing diagnostics are not the learner-facing check feedback.
- Guidance does not award completion. Access to draft text for tutoring does not authorize evaluating it for completion.

**Confirmed simple checking behavior:** While checking, temporarily disable that field and its Check button; other controls remain usable. On a technical failure, preserve the answer and show a brief retry message. Do not count a technical failure as an unsuccessful learning attempt. Routine recovery details belong to implementation.

## 7. Task-wide timed skip and reveal

Use the same fallback in both support conditions for treadmill explanation and formula discovery.

- Start one simple task-wide timer when the task and its controls become available.
- Partial discoveries, typing, slider manipulation, and unsuccessful checks do not reset it.
- Use an adjustable threshold. Five minutes was an example, not an approved default.
- At the threshold, make skipping available without automatically revealing or advancing anything.
- In treadmill explanation, selecting skip reveals an example correct explanation and enables Continue.
- In formula discovery, the shared threshold unlocks separate reveal options for all unresolved parameters at once. Each option affects only its own parameter.
- Revealing a parameter shows an example correct description plus its label, icon, and formula term; mark it Revealed, not Discovered. Leave other fields available.
- Preserve the learner's response separately from the supplied example. Exact skipped-field presentation/read-only behavior remains open.
- All resolved parameters enable Continue, but the learner decides when to proceed.

Timer pause rules and threshold defaults are open. Skip is a deliberate fallback, not on-demand AI tutoring; the Socratic tutor must not use it as permission to disclose answers directly.

## 8. AI tutor assistance

### 8.1 Shared guidance policy and context

The tutor is Socratic: use questions and hints to support reasoning from observations. Do not directly give away an undiscovered parameter or required explanation. Direct example answers are available only through the explicit timed skip/reveal flow.

In both conditions, the underlying AI generates assistance using learner interactions, input-field text, timing information, and evaluation history/diagnostics. Messages are adaptive, not fixed information pop-ups.

**Proposed context contract:** Current stage and target element/field; relevant slider and simulation interactions; current draft text; checked responses and outcomes; evaluator diagnostics; completion/discovery states; relevant timestamps and time without accepted progress. Distinguish drafts from checked answers. Exact history granularity and update cadence are open.

### 8.2 Reactive condition

- Provide contextual AI-icon + Help me controls beside relevant tasks or simulation elements.
- Use one consistent appearance and interaction pattern throughout both simulations; replace learning-guidance information icons with these controls.
- A learner request initiates contextual guidance generation.
- An unsuccessful Check alone does not trigger tutor help.

Help me is the current working wording; final AI icon artwork is open. Basic operational instructions can exist in both conditions but must not become another route to learning guidance.

### 8.3 Proactive condition

- No Help me controls or other learner-initiated route to equivalent tutor assistance.
- Decide when and where to intervene using interaction logs, written text, unsuccessful evaluation outcomes, and timing context.
- Consider time without accepted discovery/task completion, not inactivity alone. A learner may remain stuck while actively experimenting.
- Include an adjustable setting influencing how much thinking time the tutor generally allows.
- Do not implement proactive assistance as a simple timer or fixed failed-attempt count alone.

**Confirmed decision approach:** Let the guidance LLM assess whether assistance is needed, which element to address, and what Socratic guidance to offer from a compact, well-chosen learner-context snapshot. Do not build a large decision tree or make intervention depend solely on fixed timers/attempt counts. The model may decide to provide no help yet.

The snapshot should cover the current task and discoveries, recent interactions, current written responses, submitted checks and evaluator diagnostics, timing/time without progress, prior tutor guidance, and the adjustable thinking-time influence. These are context categories, not a requirement to send the entire raw event log on every evaluation. Exact packaging and evaluation cadence belong to implementation.

The adjustable thinking-time setting communicates how much opportunity the learner should generally have to reason before intervention; its precise representation/default remains to be selected. Maintain the confirmed boundaries: no direct answers, no on-demand help in proactive mode, and no additional bubble while one is open. This judgment-based policy is separate from the deterministic task-wide skip timer.

### 8.4 Contextual bubbles

- Display generated help in a small bubble beside the relevant task or simulation element in both conditions.
- Reactive: open after the learner requests help. Proactive: open automatically when the intervention policy decides assistance is appropriate.
- Show at most one bubble at a time.
- Provide a prominent Understood / Close dismissal control; exact final wording is open.
- Keep simulation controls and editable answer fields usable while help is visible.

**Confirmed lifetime:** Keep the bubble visible until dismissed and suppress additional bubbles while it is open. After dismissal, reassess current context before offering more proactive help. Exact anchors and artwork can be chosen during implementation. The AI icon must be distinct from parameter-discovery icons and completion indicators.

## 9. Modular implementation boundaries

These are proposed contracts for later agent implementation, not instructions to start building unresolved behavior.

| Module | Responsibility | Shared dependencies |
| --- | --- | --- |
| Scientific model | Physics, parameters, units, coordinates, reference cases | Agreed scientific/visual conventions |
| Treadmill simulation | Drop, contact, spin, bounce, pause, reveal, trajectory, replay | Scientific model; stage state |
| Formula simulation | Four controls, visual mappings, airflow/pressure zones, force vector | Formula; parameter configuration; discovery state |
| Activity controller | Stage transitions, answer locking, per-field outcomes, skip eligibility, progress | Evaluation results; learner actions; timers |
| Evaluation model | Prediction recognition, explanation/parameter acceptance, tutor-facing diagnostics | Task rubrics; submitted field and revision |
| Guidance model | Socratic content and contextual intervention decisions | Learner history; evaluator diagnostics; condition; thinking-time setting |
| Shared UI | Fields, Check/Continue/Reveal controls, feedback, bubbles, localized confetti | Activity state; condition; target element |

**Proposed state contract:** For each response distinguish editable, checking, accepted/discovered, and skipped/revealed. Track tutor visibility separately from answer state. The controller owns progression; neither model directly changes navigation.

### Confirmed control-range requirements

- Neither simulation provides reset buttons or reset icons.
- Bound all controls to values that keep the simulation meaningful and usable. No allowed setting or combination may put the learner in a state requiring reset to recover.
- Learners can move to another permitted setting using the ordinary controls. Treadmill controls retain their playback lock and become available again after the run.
- Formula values remain nonnegative, but this does not require permitting zero: exact lower/upper bounds must satisfy the usable-range requirement.
- Validate the permitted combinations, including extremes, when defining numerical ranges; do not rely on reset as a remedy for unusable trajectories, visual scales, or animation states.
- **Confirmed implementation delegation:** Choose numerical control bounds and initial values during implementation within these constraints. Document the selected values and demonstrate the resulting visual behavior for designer review before accepting them. Exact numbers are not a blocker for modular implementation planning; they must not change the confirmed formula, fixed-direction rule, or discovery interactions.

**Source-retained:** Keep a progress bar at the top throughout the activity. Stage weights and appearance remain open.

### Configurable values still to define

| Setting | Required meaning | Unresolved part |
| --- | --- | --- |
| Skip threshold | Task-wide elapsed time before optional reveal | Default; whether each task uses the same value |
| Tutor thinking-time influence | General deliberation allowance within context-aware proactive policy | Operational semantics; default |
| Proactive context assessment | LLM judges whether/where to help using compact context; no large decision tree | Context packaging and assessment cadence are implementation choices |
| Simulation parameters | Initial values, bounds, units, force/animation mappings | All numerical choices |

No numeric defaults have been approved. Agents must not turn illustrative examples into requirements. Numerical simulation bounds and initial values may be chosen during implementation under the control-range requirements and reviewed visually. This delegation does not choose skip thresholds or define the proactive thinking-time policy.

## 10. Remaining learning-experience decisions

Keep further review focused on these substantive choices:

- Examine physical realism and required exaggeration during implementation. The intended motion is confirmed: belt contact visibly induces spin; initial travel follows the belt, then the rising path visibly curves oppositely. No speed-matching requirement applies.
- Consistent force, rotation, and viewpoint conventions across the simulations and introduction.
- The default/representation of the adjustable tutor thinking-time setting. The LLM-based intervention approach and its context categories are confirmed.
- Skip-threshold default and whether treadmill explanation and formula discovery share the same value.
- Exact task prompts, short introduction, sports example, and example answers shown on skip.

### Implementation discretion

Choose routine technical details and minor edge cases during implementation. This includes message wording, icon artwork, bubble placement, basic loading/retry presentation, animation mappings, and numerical simulation ranges within the confirmed constraints. Preserve the simple behavior specified here rather than introducing extra workflows.

**Proposed:** Use slider numbering matching formula order (1: C_L, 2: rho, 3: v, 4: A), a read-only example after skip, and a compact counter distinguishing discovered and revealed parameters. These presentation defaults can be reviewed with the implementation rather than through separate clarification rounds.

Platform, language, persistence, and accessibility requirements need clarification only when they materially affect the intended delivery; do not expand this activity specification into a technical architecture document.

### Implementation handoff

Use this file as the primary activity specification. Do not reintroduce superseded behavior from the PDF or expand the scope to quiz/research infrastructure.

Begin implementation of the confirmed flow and shared interactions. Handle routine implementation choices without asking about every detail. Document provisional choices for unresolved substantive settings/content and submit them for review; do not present those choices as confirmed requirements. Proposed contracts are starting points, not mandatory internal architecture.

Prioritize a working treadmill motion demonstration early: verify that contact visibly induces rotation, motion initially follows the belt, and the rising trajectory visibly curves oppositely. Report the exaggeration/simplifications used. The fidelity of this demonstration needs review before treating the scientific model as settled.

Keep skip thresholds and tutor thinking-time influence configurable. Any initial defaults are provisional. Draft the introduction and example answers consistently with the chosen conventions and review them with the working activity.

Technical setup (platform, AI provider/access, and deployment) is not prescribed by this learning-activity document. Resolve it from the implementation environment and project context, asking only when a choice materially affects delivery.

## 11. Acceptance checklist

- Two simulations follow the agreed stages and learner-controlled transitions.
- Setup pop-ups gate Drop ball; any prediction can unlock the reveal after Check.
- The faded replay merges into the paused ball; optional repetition never starts automatically.
- Treadmill settings apply to the next run and remain inactive during playback. A single run button uses the current settings without repeating prediction. Only the latest trajectory is shown.
- Treadmill motion first follows belt travel after contact, then visibly curves oppositely during ascent; exaggeration is reviewed during implementation.
- Treadmill completion uses the agreed rotation/deflection rubric without mandatory exploration actions.
- The introduction is short, illustrated, pressure-based, and followed by one sports example.
- Four numbered slider/field pairs are simultaneously available and checked independently.
- Every slider has its required scene effect before discovery.
- Neither simulation has reset controls; all allowed control combinations remain usable and recoverable through ordinary controls.
- Correct discoveries reveal the icon, label, and formula term together and lock the text.
- The exact formula is preserved, including 1/2 and v^2; formula sliders are nonnegative with fixed rotation sense and force direction.
- Airflow and pressure zones use explanatory animations rather than numerical fluid simulation.
- Evaluation and guidance are separate; unsuccessful check feedback is minimal.
- Reactive help is learner-requested; proactive help has no request controls and uses behavioral context.
- Bubbles are contextual, Socratic, one at a time, dismissible, and do not block activity controls.
- The adjustable task-wide skip timer unlocks optional reveals without resetting on partial progress.
- Revealed work stays distinct from discovered work.
- No unresolved decision or proposed contract is silently treated as approved.

## 12. Revision note

Updated after consolidation on 2026-11-05 from the source and subsequent designer decisions. Superseded proposals and conversational decision history have been folded into the current requirements. Source files remain unchanged.
