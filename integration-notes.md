# Working-activity review and future integration

Status: full development flow implemented and checked; awaiting designer inspection before final polish. Treadmill motion and the revised interface direction are approved. Live AI remains disconnected. No physics-reference file has been created.

## Items for this review

- **Formula scene:** four controls under the scene, a compact colour-coded formula below, and a separate response column. Rotation is counterclockwise and relative airflow moves left; force starts at the sphere's centre and points upward throughout. The introduction and tennis example use this same convention.
- **Latest review changes:** the initial treadmill prediction uses three direction buttons and is recorded locally without evaluation. Controls appear with the exploration invitation after the first reveal. Subsequent runs retain one faint dashed previous path and apex shadow for comparison. Task prompts have larger, darker text beneath small task numbers.
- **Draft content:** task prompts, illustrated Magnus introduction, the backspin tennis example, and timed fallback descriptions. These are implemented drafts for review, not newly confirmed scientific requirements.
- **Formula ranges and visuals:** the following are provisional implementation choices for designer inspection. They are positive, bounded, and remain usable at combined extremes.

| Slider | Parameter | Range | Initial value | Visual cue |
| --- | --- | --- | --- | --- |
| 1 | Lift coefficient | 0.1–0.5 | 0.3 | Counterclockwise rotation speed |
| 2 | Fluid density | 0.6–1.8 kg/m³ | 1.2 kg/m³ | 6–18 air lines; initially 12, with staggered dash offsets |
| 3 | Translational velocity | 4–12 m/s | 8 m/s | Air-line travel speed |
| 4 | Cross-sectional area | 0.01–0.05 m² | 0.03 m² | Sphere radius in the illustration |

The exact formula is used without the treadmill's teaching multiplier. The vector's display length uses a bounded square-root scale (26–138 SVG units); it remains visible at low values. The sphere stays centred. Flow and pressure patterns are explanatory drawings, not computed fluid dynamics. Rotation speed represents lift-coefficient changes visually; it is not a substitution for C_L in the formula. Symbols, names, units, and terms remain hidden until discovery or explicit timed reveal.

## AI boundary and what is simulated

The learner's Check action is the only evaluator trigger. Its server result contains acceptance, revision, and development/live mode. Diagnostics and checked-answer history remain server-side and are added to tutor context. Technical failures are not counted as learning attempts.

The controller owns locks, timers, reveals, completion, and navigation. Tutoring cannot award completion. The tutor interface returns a structured help/wait decision, target, and Socratic message. Reactive AI Help appears only beside treadmill direction, treadmill speed, and the four parameter sliders. Requests identify that specific control; the server supplies its canonical label, current value/unit, related rubric and private diagnostics. Treadmill context distinguishes selected settings from the run already shown. Proactive guidance targets those same controls, or the initial prediction choices. Guidance occupies space rather than covering editable inputs, persists until dismissed, and is limited to one panel at a time. Formula guidance uses the full width directly below the sliders, labelled with its parameter, so opening or closing guidance does not move the sliders.

The current evaluator's keyword recognition can misclassify answers, including negation or unusual phrasing. It must not be used to validate study responses. The developer outcomes make accepted/rejected/error paths inspectable independently of these heuristics.

The current tutor's templates and simple combined-signal demonstration are also substitutes, not the final intervention policy. Its illustrative Short/Balanced/Extended timings are 35/75/120 seconds of time without accepted progress, combined with a failed check or interaction-plus-draft context; elapsed time alone is insufficient. **These numbers do not define the future LLM policy.** The approved representation is Short/Balanced/Extended, initially Balanced. The precise interpretation and tutor behavior still need review with live-model examples.

Proactive calls are scheduled at most once per 45 seconds and only with current, changed context. The payload covers the current task's drafts/outcomes, the latest eight summarized interactions, task time without accepted progress, up to four relevant checks, and up to three relevant tutor messages. It excludes full event logs and previous tasks' written responses. There are no calls while a bubble/request is open or the page is hidden. The server supplies private diagnostics rather than exposing them to the learner. Unsuccessful reactive checks never request tutoring automatically.

## Future OpenAI connection

[openai.ts](./server/ai/openai.ts) contains separate evaluator and tutor factories using the official SDK and Responses API with JSON-schema structured outputs. `optionsFromEnvironment` resolves role-specific models, falling back to a shared model:

```text
OPENAI_API_KEY
OPENAI_MODEL
OPENAI_EVALUATOR_MODEL
OPENAI_TUTOR_MODEL
```

Both roles may use the same model. Factories require a reviewed, relevant scientific excerpt in addition to model/key configuration. They use `store: false`, bounded output tokens, a request timeout, and limited retries. No API connection is instantiated by the running application, even when environment variables are present. Credentials and participant mapping/handout files are ignored by Git and denied by the development file server; production serving is restricted to the built client files.

Activation remains separate work: load reviewed excerpts from the designer's reference, select the role providers in the server, validate model outputs against agreed examples, and change the explicit AI-mode notice only after live behavior has been checked. [Official structured-output documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) informed these adapter contracts.

Materials or decisions still needed:

1. The designer's physics reference, API account/billing/key, and a model selection.
2. Reviewed accepted/rejected answer examples, especially intuitive density/velocity descriptions, negation, and borderline responses; the current rubrics are in [server contracts](./server/ai/contracts.ts).
3. Examples to validate Socratic answer protection and proactive help/wait judgment, including the intended influence of the thinking allowance.
4. Pre-test and post-test content. The current pages are placeholders only.
5. Key reuse policy for study sessions. Keys currently fix condition and participant ID, and allow repeat entry with a new session ID. Key assignment is explicit; no randomization or balancing protocol has been invented.
6. The later study-data recording contract and persistence destination. Current session storage and in-memory tutor context are not a durable research dataset.

## Verification evidence

`npm test` passes seven tests, and `npm run build` passes TypeScript and the production bundle build.

| Verification | Result |
| --- | --- |
| Approved treadmill regression | Identical model samples to the approved standalone prototype at all 18 permitted speed/direction settings |
| Trajectory bounds | 82 sampled speed/direction runs remain finite, mirrored, and visible, with initial beltward travel followed by opposite curvature |
| Formula | Exact velocity-squared behavior; all 16 combined range extremes and each independent visual mapping checked |
| Server contracts | Condition assignment, random session identity, private diagnostics, technical failures, condition-specific tutoring, and disabled developer/demo routes checked |
| Participant-key utility | Hash mapping, opaque unique keys, random IDs, explicit condition assignment, and private handout generation checked in an isolated fixture |
| Reactive browser flow | Pre-test through post-test; rejected/accepted explanations, requested help, independent parameter checks, technical retry, and 3 discovered + 1 revealed |
| Proactive browser flow | No AI Help controls; explicit help and wait outcomes; 1 contextual bubble; skipped explanation; 0 discovered + 4 individually revealed |
| Timer and preservation | Hidden-tab pause, independent task timers, no reset on partial discovery, preserved drafts on technical error and reveal, and no automatic navigation checked |
| Layout | Formula controls separated from responses; all four controls available; 390 px viewport without horizontal overflow checked |
| Feedback revision: treadmill | Controls absent before reveal, three locked prediction choices without evaluator calls, Task 1/2 presentation, previous-run shadow, playback locks, and two control-specific reactive help buttons checked |
| Feedback revision: formula | Centred force origin, leftward flow, counterclockwise spin, 12 initially staggered air lines, compact formula, renamed accepted/revealed headings, and adjacent discovery/reveal counter checked |
| Feedback revision: guidance | Six control targets exercised in API tests; related private diagnostics routed correctly, unrelated diagnostics excluded, and unavailable/non-control reactive requests rejected. Both browser conditions checked; four formula help buttons only in reactive, one contextual panel in proactive, preserved guidance on refresh, and stable slider positions with guidance checked |

Browser technical-error tests deliberately produce a 503 response; that is the simulated failure path. No live-model accuracy, teaching effectiveness, quiz behavior, or study-data durability is claimed by these checks.
