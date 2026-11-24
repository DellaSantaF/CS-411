# Open decisions and remaining work

Updated 24 November 2026 after the user's scope decisions. Use with the [activity specification](./activity-specification.md), [integration notes](./integration-notes.md) and [hosting plan](./hosting-plan.md). Classroom experiment: 20–30 participants. The user accepts live learning behavior for version one; further tuning is optional later.

## First priority: minimal Netlify hosting

| Item | Remaining decision or work |
| --- | --- |
| Backend/storage | Implemented: shared local/function logic, private site-wide Blobs for hosted authentication, histories, counters and unique event records; committed build/runtime/routing and bundled physics reference. Deploy to the existing site. |
| Researcher interface | Implemented: `/admin` with memory-only password entry, hashed mapping import, session list and safe CSV downloads. Set server-only `ADMIN_SECRET` and import pilot mapping. |
| Participants/concurrency | Implemented: explicit-condition generator, distinct participant/attempt IDs and one per-tab queue for all session writes. Strong reads do not make updates atomic; duplicate tabs are unsupported. Verify overlapping hosted participants. |
| Call cap | Implemented: 200 default/shareable allowance, persistent pre-call reservations, last-allowance flag/timestamp and blocked events. Human must change any existing private local 40-call override; it was not read/edited. |
| Human setup | Follow the [deployment/operation guide](./hosting-guide.md): sign in, select existing site, connect/deploy this branch, enter server secrets/runtime settings, import mapping, inspect exports/logs/usage. |
| Verification | Existing tests/build pass; local Blobs emulator covers fresh instances and overlapping isolated sessions, mocked small caps and safe exports. Dashboard is at login: hosted live overlap/reference/routing/duration/usage checks remain unverified. No repeated learning-validation gate. |

## After hosting works

| Item | Remaining decision or work |
| --- | --- |
| Quizzes | Supply and implement pre-/post-test content and scoring; both pages are placeholders. |
| Research data | Extend minimum hosted session/AI/error records with exploration, discovery/reveal, hint display, timing and test data; finalize CSV columns before recruitment. |
| Experience refinement | Optional evaluator/tutor/content tuning, including thinking allowance interpretation; not a prerequisite for first hosting. |

## Handoff boundary

Keep Netlify and aim for free hosting; live AI remains billable. No SQL/Supabase administration, live Google Sheets connection, automatic randomization, study/test versioning or substantial reconnection/failure framework. Participants remain online in one tab; interrupted attempts may be excluded manually. Re-entering a key may create another session under the same participant ID. Freeze the activity before distributing real participant keys. Hosting/storage/admin/export features and the 200-call cap are implemented in code. Deployment and the hosted pilot remain pending account access and human secret entry; no observed deployment is claimed.

API access, model choice, live activation, interface approval, control ranges, six-minute treadmill/four-minute formula skip timing and the Balanced default are already in place. No additional interface-polish checkpoint is pending. Change these only when a new user requirement calls for it.
