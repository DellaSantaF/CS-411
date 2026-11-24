# Prompt for the next implementation session

Copy the following into a new agent session in this repository:

---

Implement the first hosting milestone in [hosting-plan.md](./hosting-plan.md). Read that plan, [activity-specification.md](./activity-specification.md), [integration-notes.md](./integration-notes.md) and [open-items.md](./open-items.md) first. Inspect code rather than assuming planned features exist.

This is a classroom project for 20–30 participants. The human has validated the live learning experience as sufficient for version one. Prioritize working Netlify hosting and understandable human instructions. Preserve learning flow, rubrics/prompts, models, physics, conditions and timers. Quizzes, detailed analytics and optional fine-tuning follow hosting.

Implement:

1. Netlify Functions for the existing same-origin API, reusing core logic while retaining local development. Commit build/runtime/routing configuration; bundle the required physics reference.
2. Private site-wide Netlify Blobs for mapping, authentication/session state, tutoring history and minimum records. In-memory maps cannot authenticate across instances. No SQL/Supabase/Sheets integration.
3. Existing explicit-condition key/participant-ID generation plus a minimal password-protected `/admin` page to import the hashed mapping, view sessions and export CSV. Researchers randomize/distribute keys themselves. Separate participant ID from session ID; key re-entry may create a new attempt. One tab per attempt, no accounts/reconnection subsystem.
4. Different participants can use the site simultaneously. Follow the plan's per-tab queue for all session mutations, strong reads, unique event records and persistence before replies. Strong reads are not atomic updates; a process-local mutex is insufficient across instances. No shared whole-dataset JSON/CSV writes. Ambiguous timeout/persistence failure may end the attempt rather than replay billable requests or require distributed recovery.
5. Raise the default/shareable configuration to 200 attempted live provider calls/session. Persist reservations before calls; count failed calls and model wait decisions, exempt cached/local responses. Set/export reached-limit flag/timestamp as soon as the 200th allowance is consumed, plus used/allowed counts and subsequent blocked events. Give a distinct learner limit message. Do not edit or expose the private `.env`; explain an existing override the human must change.
6. Minimum `sessions.csv`/`events.csv`: IDs/condition, start/stage, evaluator submissions/outcomes, tutor help/wait, technical errors and cap flags. Include incomplete attempts; keep diagnostics private from participant responses. Escape CSV properly and neutralize learner spreadsheet formulas. Detailed exploration/timing/token/test data follows later.
7. Disable production demo keys/developer endpoints with `DEVELOPER_TOOLS=0`. Authorize admin import/export with a server-only researcher secret entered in the page and sent in a header, never in URLs/frontend bundle variables. No large admin/security framework.
8. Write a short human deployment/operation guide with actual Netlify steps, environment variables, supported Node version, key-generation/import commands, URLs, exports and error/usage locations. Explain frontend/functions/storage in everyday language. Clearly identify any remaining human setup.

Use the plan's acceptance checklist: existing tests/build, focused storage/session isolation tests, mocked small-cap/export tests and overlapping hosted participant sessions where access allows. Do not spend 200 live calls testing the cap. Prior learning validation is accepted; only verify hosting preserves it. No new pedagogy gate, multi-device recovery, randomization engine, versioning framework or complex backups.

Proceed with implementation rather than another plan. Finish code/config/docs even if account access is missing. Use available authorized tooling to inspect the existing Netlify setup; request only genuinely missing account information or secret entry. Never ask for API keys in chat, invent a site ID or claim an unobserved deployment. No paid provider/plan by default.

Update [README.md](./README.md), [integration-notes.md](./integration-notes.md), [open-items.md](./open-items.md), [openai-setup.md](./openai-setup.md) and shareable environment examples to reflect actual changes. Distinguish local/hosted operation and implemented features/pending setup. Report validation and any remaining deployment block.

---
