# Open decisions and remaining work

Updated 24 November 2026. Use this list with the [activity specification](./activity-specification.md) and [integration notes](./integration-notes.md). These items are not blockers for the working local AI prototype.

## Validate the learning behavior

| Item | Remaining decision or work |
| --- | --- |
| Evaluator acceptance | Agree representative accepted/rejected and borderline examples, especially intuitive density/velocity wording, negation and contradictory explanations. Run them live and adjust rubrics/prompts if needed. |
| Tutor behavior | Review Socratic answer protection and proactive help/wait examples. Define the intended influence of Short/Balanced/Extended; Balanced remains the current default. |
| Physics/content alignment | Review the simplified treadmill model, introduction, fallback examples and AI excerpts against the supplied reference. Resolve reference differences explicitly without replacing the approved four-control scene. |
| Full live regression | Exercise both conditions end to end, including technical recovery and reveals. The three-call connection check passed; broader live teaching behavior remains unvalidated. |

## Deferred study work

| Item | Remaining decision or work |
| --- | --- |
| Quizzes | Supply and implement pre-/post-test content and scoring; both pages are placeholders. |
| Participant policy | Decide key reuse and condition-assignment/randomization rules. Current issuance explicitly assigns condition; reuse creates another session for the same participant. |
| Research data | Define what to record and where to persist it. Browser storage and server memory are not a durable study dataset. |

## Handoff boundary

API access, model choice, live activation, interface approval, control ranges, four-minute skip timing and the Balanced default are already in place. No additional interface-polish checkpoint is pending. Change these only when a new user requirement calls for it.
