# Open decisions and remaining work

Updated 24 November 2026 after the user's scope decisions. Use with the [activity specification](./activity-specification.md), [integration notes](./integration-notes.md) and [hosting plan](./hosting-plan.md). Classroom experiment: 20–30 participants. The user accepts live learning behavior for version one; further tuning is optional later.

## First priority: minimal Netlify hosting

| Item | Remaining decision or work |
| --- | --- |
| Backend/storage | Implement Netlify Functions and private site-wide Blobs; retain local operation. Follow the [plan](./hosting-plan.md) and [next-agent prompt](./hosting-agent-prompt.md). |
| Researcher interface | Small password-protected mapping-import, session-list and CSV-export page. |
| Participants/concurrency | Researchers randomize using explicit condition-linked keys/IDs. Different participants must work concurrently; one tab per attempt. |
| Call cap | Implement 200 instead of the current 40; persist/export used/allowed counts, reached-limit flag/timestamp and blocked-call events. |
| Human setup | Document actual Netlify configuration, secrets, generation/import commands, URLs, exports and errors/usage. |
| Verification | Existing tests/build and focused hosted checks of conditions, cross-instance state, concurrent participants and protected exports. No repeated learning-validation gate. |

## After hosting works

| Item | Remaining decision or work |
| --- | --- |
| Quizzes | Supply and implement pre-/post-test content and scoring; both pages are placeholders. |
| Research data | Extend minimum hosted session/AI/error records with exploration, discovery/reveal, hint display, timing and test data; finalize CSV columns before recruitment. |
| Experience refinement | Optional evaluator/tutor/content tuning, including thinking allowance interpretation; not a prerequisite for first hosting. |

## Handoff boundary

Keep Netlify and aim for free hosting; live AI remains billable. No SQL/Supabase administration, live Google Sheets connection, automatic randomization, study/test versioning or substantial reconnection/failure framework. Participants remain online in one tab; interrupted attempts may be excluded manually. Re-entering a key may create another session under the same participant ID. Freeze the activity before distributing real participant keys. Hosting/storage/admin/export features and the 200-call cap are planned, not yet implemented by this documentation update.

API access, model choice, live activation, interface approval, control ranges, six-minute treadmill/four-minute formula skip timing and the Balanced default are already in place. No additional interface-polish checkpoint is pending. Change these only when a new user requirement calls for it.
