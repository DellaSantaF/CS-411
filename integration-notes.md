# Integration and agent handoff

Updated 24 November 2026. The activity and live OpenAI integration work; the user confirms the integration. Preserve the approved baseline while applying the next requested improvements.

## Read first

- [Activity specification](./activity-specification.md): current learner behavior and invariants.
- [Open items](./open-items.md): the single list of remaining decisions/work.
- [OpenAI setup](./openai-setup.md): local key, startup, review keys and live-check commands.
- [Physics reference](./magnus_effect_physics_reference.md) and [motion details](./motion-review.md): scientific grounding and teaching simplifications. The motion document is historical; its statement that live AI is disabled is superseded here.

## Implemented boundary

| Responsibility | Files |
| --- | --- |
| Flow, drafts, timers, reveals and navigation | [Controller](./src/App.tsx), [state](./src/state.ts) |
| Shared request/result types and control targets | [Shared contracts](./src/shared/contracts.ts) |
| Authentication, conditions, private history and request limits | [Server](./server/index.ts) |
| Explicit live/development selection | [Provider routing](./server/ai/providers.ts) |
| Responses API, structured outputs, validation and usage counts | [OpenAI adapters](./server/ai/openai.ts) |
| Separate evaluator/tutor interfaces and semantic rubrics | [AI contracts](./server/ai/contracts.ts) |
| Relevant reference sections and current-scene clarification | [Physics excerpts](./server/ai/physics.ts) |

AI_MODE=live activates the official SDK adapters; missing credentials fail startup. Without an explicit mode, development substitutes are used. Live mode never mixes in forced simulated outcomes; developer timing controls remain usable. The learner banner reflects the session's provider mode.

Evaluator replies expose acceptance, short learner-facing clarification feedback, revision and mode; private diagnostics remain separate. Diagnostics and checked-answer history stay server-side and enter relevant tutor context. Guidance returns help/wait, target and message; it does not control progression. Treadmill context distinguishes selected settings from the observed run.

The reference is read at startup. Its older force-view section describes separate ball/airflow/spin controls absent from this website; excerpt selection excludes that section and states the actual four-control scene. Do not silently add those older controls.

## Cost and context limits

- Both roles default to gpt-6-luna, reasoning low. Role-specific model overrides remain available.
- Evaluator output cap: 800 tokens; tutor: 1,000, including reasoning. Tutor instructions request at most 45 words.
- Requests use store=false, a 30-second timeout and zero automatic retries. No tools or full transcript are sent.
- Tutor context: current task drafts/outcomes, eight recent interactions, four relevant checks, three prior hints, timing and thinking allowance.
- Proactive scheduling: at most once per 45 seconds, changed context only; paused for hidden tabs and open guidance/requests. The server also enforces the interval.
- Recent identical checks reuse their result. Default session cap: 40 attempted live calls, including failed calls and wait decisions. It is in memory, resets with new sessions, and is not an account-wide money limit.
- Terminal logs contain token counts, not credentials or learner text. API keys and participant mapping/handout files are ignored by Git and blocked by the development file server.

## Sessions and review tools

Participant keys assign condition server-side. Generated keys map to a stable participant ID; each entry creates a new session ID. Progress persists in tab session storage; server sessions, checks and guidance are memory-only. Restarting the API requires key entry again.

The separate /developer page provides timing controls, private diagnostics and review shortcuts. Forced accept/reject/help/wait/error outcomes apply only in development mode. DEVELOPER_TOOLS=0 disables developer routes and demo keys.

A terminal OPENAI_API_KEY can override the saved local key; clearing that process's override resolved the initial authentication failure. Follow [setup instructions](./openai-setup.md); never copy credentials into handoff materials.

## Verification evidence

| Evidence | Recorded result and limit |
| --- | --- |
| Automated checks | Last recorded run: 20 tests and production build passed (24 November iterations). Covers physics ranges/formula, contracts, routing, privacy, errors, request settings, caching, limits and key generation. |
| Browser | Both complete support-condition flows were previously checked with substitutes. Integration-stage formula fixtures checked reactive help/acceptance and a single proactive panel without Help controls. |
| Live check, 17 November | Three calls passed: intuitive density accepted, explicit rotation negation rejected, Socratic reactive prompt returned. Usage: 2,581 input + 132 output tokens, including 29 reasoning tokens. |
| User confirmation, 24 November | AI integration works. This does not establish comprehensive live grading accuracy or study readiness. |

For code changes, run npm.cmd test and npm.cmd run build, then check the affected browser behavior in both conditions. npm.cmd run ai:check makes three billable calls; adding -- --full makes 12. The broader check is available but has no recorded passing run here. No new live calls or test runs were needed for this documentation-only consolidation.

## First improvement iteration — 24 November

Implemented the prototype feedback: relaxed treadmill Task 2 rubric; current selected versus observed speed guidance; longer treadmill skip delay; modal control-linked help bubbles and cross buttons; compact gradient question-mark help controls; larger formula; mandatory moving-through-air introduction; faster velocity-proportional airflow; explanations of all formal slider quantities while preserving accepted learner wording; contextual clarification on rejected checks; Ctrl/Cmd+Enter checking; persistent slider-use context; untouched-slider observation prompts; and hidden-name/unit protection.

Implementation choices beyond explicit wording: six-minute treadmill threshold (1.5× the configurable base), airflow scale derived from the displayed radius and physical cross-sectional area, native modal dialogs with focus containment and Escape dismissal, viewport-aware pointers, and a server-side fallback for obvious answer leaks. Pending hints are discarded after settings/run changes to prevent stale advice.

Validation for this iteration uses simulated providers and mocked Responses API requests; live pedagogical quality still requires the review listed in open items. No billable live regression was requested as part of this UI iteration.

Browser verification (development providers, seeded task states): reactive formula introduction and help dialogs opened modally; clicks on other controls were blocked; “the spin” was accepted by Ctrl+Enter with the formal explanation preserved under Parameter 1; “the speed” remained editable with “The speed of what exactly?”; treadmill help distinguished selected 10 m/s from observed 8 m/s and requested Run again; skip was absent at 250 seconds. Proactive formula and treadmill bubbles blocked other controls and showed no Help buttons. These are targeted interaction checks, not full end-to-end or live-model validation.

## Second improvement iteration — 24 November

Completed parameter cards now hide the input, retain the learner wording, and show a large formal name beneath a small muted uppercase Parameter X caption. Reactive help stays visible but disabled for resolved parameters. Slider names occupy a separate row below help controls, allowing long names to wrap. Formula multiplication uses dots, masked terms use the parameter colour as their background, and subscripts sit below the baseline. Removed static rotation arrows from the formula scene.

Formula evaluator rubrics now require identifying a physical property, not just describing graphical changes. Intuitive physical wording such as “the spin” and “the ball size” still counts; formal names and force relationships are not required. Development heuristics and regression examples follow this boundary. Revealed parameters receive the same completed-card layout and disabled-help treatment. Existing reviewed airflow slowdown and opacity are preserved.

Second-iteration verification: all 20 tests and the production build passed. Seeded reactive browser checks confirmed hidden completed inputs, retained wording and formal headings, disabled discovered/revealed help, enabled unresolved help, rejected graphical-only density wording, removed rotation arrows, coloured hidden terms, and no slider-name/button overlap or horizontal overflow at 390 px width. Live grading was not rerun.
