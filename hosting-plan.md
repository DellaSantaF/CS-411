# Minimal Netlify hosting plan

Agreed scope: 24 November 2026. This is a plan, not an implemented deployment. Use [the next-agent prompt](./hosting-agent-prompt.md) to start implementation.

## Purpose and scope

Deliver a classroom experiment for **20–30 participants**. The user has validated the live learning experience as sufficient for version one. Preserve the approved activity; optional fine-tuning follows later.

First implement hosting, participant access and minimum persistent/exportable data. Then integrate pre-/post-tests, detailed data collection and experience refinements. Freeze the activity before inviting real participants. No SQL knowledge, automatic randomization, study/test versioning, offline mode, multi-device recovery or large admin dashboard is required.

Participants stay online and keep one tab open. Interrupted/failed attempts may be excluded manually. Preserve existing same-tab refresh behavior where straightforward; do not build a reconnection subsystem.

## Architecture in everyday language

Use **Netlify for the frontend, backend functions, and private JSON storage (Netlify Blobs)**. No separate Supabase account or SQL database is proposed for this scope.

```text
Participant browser
  ├─ loads the React activity from Netlify
  └─ calls /api/... on the same Netlify site
        ├─ Netlify Functions check access and run evaluator/tutor logic
        ├─ functions call OpenAI with a server-only API key
        └─ functions read/write private records in Netlify Blobs

Researcher browser → /admin → import participants / inspect sessions / export CSV
Downloaded CSV → Excel or Google Sheets
```

**Yes, a backend is required:** it protects the AI key, checks participant access and stores data. Netlify runs it on demand; no researcher laptop/terminal needs to stay running. Blobs is managed storage in the same Netlify account. JSON is the internal format; CSV is the human-facing export.

A direct Google Sheets integration is unnecessary initially: it adds account/API configuration and credentials. Import downloaded CSV into Sheets instead. A live Sheet can be added later if useful.

### Platform facts and costs

Netlify offers key/value storage with optional strong reads. Overlapping writes to the same key can overwrite each other. Use private **site-wide** stores rather than deploy-specific stores. [Blobs documentation](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)

Functions have a documented 60-second synchronous limit; retain the existing 30-second AI timeout and check total deployed request duration. [Function configuration](https://docs.netlify.com/build/functions/configuration/)

Free hosting is the target, not a capacity guarantee. Check this account's actual plan and usage after simultaneous live sessions. The current credit-based Free plan has 300 monthly credits; existing accounts may use legacy billing. AI requests are billed separately. At 30 participants × 200 calls, the upper bound is 6,000 live requests, not expected usage. [Netlify plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/), [function billing](https://docs.netlify.com/build/functions/usage-and-billing/)

## Human interfaces

| Interface | Purpose |
| --- | --- |
| Local terminal | Generate participant IDs/access keys with explicit conditions |
| Netlify dashboard | Connect repository, configure secrets, inspect deployments/function errors and usage |
| Private `/admin` page | Import generated participant mapping, view sessions, download CSV |
| Participant site URL | Enter a provided access key and complete the activity |
| Excel/Google Sheets | Open the exports and compare conditions |

Build a small admin page: password entry, mapping upload, session list, export buttons. Use one server-side `ADMIN_SECRET` shared by the class team; no accounts/permission system. Enter it in the page, keep it only in page memory, and send it in an authorization header. Never put it in a URL, public frontend variable or log. Reloading may require entry again.

Imports/exports must require researcher authorization. Participant endpoints cannot expose other participants' records or private diagnostics. The existing `/developer` page is a local review tool, not this admin interface; disable production developer endpoints and demo keys.

## Participant workflow

Keep [the existing key generator](./scripts/create-keys.mjs), which creates random IDs/access keys, a hashed-key mapping, and explicit reactive/proactive assignments. Example existing commands, from the project folder:

```powershell
npm.cmd run keys -- --condition reactive --count 15
npm.cmd run keys -- --condition proactive --count 15
```

1. Researchers choose how to randomize and distribute these keys.
2. Upload the private `participants.local.json` mapping through the planned `/admin` interface. Validate it, report counts/conditions, and merge new IDs without silently changing existing assignments. This replaces the local-server need to restart after generation.
3. The private handout CSV links key, participant ID and condition. Give each participant only their own key and the activity URL.
4. The server derives identity/condition from the mapping, never a browser-supplied condition.
5. Entering a key creates a new session ID. Same-tab refresh keeps the existing token/session. Re-entering the key may create another attempt under the same participant ID; researchers exclude duplicates manually by session ID. No one-time-key enforcement or resume selector is needed.

Export participant ID and session ID. **Different participants can participate simultaneously with different keys.** Sharing a key or opening duplicate tabs for one attempt is outside the supported workflow.

## Implementation work

### 1. Adapt the backend, preserve learning behavior

- Extract reusable request logic from [server/index.ts](./server/index.ts) into Netlify-compatible handlers; retain the local Node entry point.
- Preserve same-origin `/api/session`, `/api/evaluate` and `/api/tutor` routes, condition boundaries and shared types where possible.
- Reuse existing AI adapters, model settings, rubrics, protection, physics, timers, progression and simulations.
- Bundle the physics reference with functions or embed the same selected excerpts during build; verify deployed loading.
- Commit Netlify configuration: `npm run build`, publish `dist`, functions directory, supported Node version meeting [package.json](./package.json), API routing before frontend fallback.
- Publish only intended assets/functions. Confirm `/admin` works and `/developer` plus its API are unavailable with `DEVELOPER_TOOLS=0`.

### 2. Persist the minimum server state

In-memory maps cannot be shared between function instances. This is necessary hosting work even though participant reconnection is out of scope.

Use separate private site-wide stores/namespaces for participant mapping, server sessions and data records. Sessions need identity/condition, settings, limited check/hint history for tutoring, used calls, proactive throttle time and authentication lookup. Store a hash of the random bearer token as its lookup key; never export tokens.

Write research events under unique session/event keys. Do not append all participants into one shared JSON file or maintain a shared writable CSV. Generate CSV on export; handle listing pagination if needed.

### 3. Support concurrency simply

Different participants have separate records and may send requests simultaneously. No global request queue.

For the supported **one tab per attempt** workflow, queue every session-mutating API request in that browser tab: evaluator, tutor and recording calls. Start the next after the prior response completes. Each function finishes saving before replying. Keep simulation rendering and editable inputs usable; retain per-response checking feedback.

Use strong reads for mutable sessions. Strong reads do not make read/modify/write atomic. Verify all session writers use the queue; no hidden/background writer may update that same session concurrently. Unique event keys avoid shared append races. Process-local locks do not protect different function instances. Duplicate-tab concurrency is not promised.

On ambiguous timeout or failed persistence, do not automatically replay a billable request or continue queued session mutations. Show a short technical-error message and flag the attempt for review where storage is available. Accept exclusion instead of adding distributed locking/recovery.

### 4. Raise the live-call cap to 200 and export its status

Current code/defaults/examples still use 40. During implementation update the default, shareable example, hosted setting and setup docs to **200 attempted live calls per session**. Do not edit/expose the private local `.env`; tell the human to update any existing override.

Preserve counting: failed provider attempts and model-generated proactive `wait` count; cached checks and local untouched-slider prompts do not. Persist the increment before calling the provider and save results/history before replying. Failed storage ends the attempt instead of silently reverting to memory.

When call 200 is reserved, persist `ai_limit_reached=true` and `ai_limit_reached_at`, even if it succeeds and no 201st call is requested. Block later provider calls; record an `ai_limit_blocked` event if another is attempted. Export `ai_calls_used`, `ai_call_limit`, `ai_limit_reached`, `ai_limit_reached_at` and blocked-call events. Show a clear limit message, not a generic retry prompt. Never treat it as an incorrect learning answer or automatic completion. Test using a small injected cap and mocked AI, not 200 paid calls.

### 5. Minimum data now, detailed data later

Hosting is complete only when records survive separate function invocations and export correctly. Full analytics is not part of this milestone.

**Initial records:** participant/condition, session/start time, last recorded stage, cap flags/counts, evaluator submissions/results, tutor help/wait and technical errors. Provide `sessions.csv` and `events.csv` with readable headings and examples in the guide. Include incomplete sessions. Last recorded stage is not proof of completion; reaching the post-test placeholder is not submitting a post-test.

Suggested common event fields: `event_id`, `participant_id`, `session_id`, `condition`, `server_time`, `event_type`, `stage`, `target`, `text`, `result`, optional details. Irrelevant fields may be empty. Use JSON internally and flatten meaningful fields for export. Escape CSV commas/quotes/newlines and neutralize spreadsheet formulas in learner-provided text.

**Following milestone:** prediction, slider changes on release/throttled, simulation settings/runs, discoveries versus reveals with original wording, hint display/dismissal, active/elapsed time, token/latency details and pre-/post-test responses/scores. The prior proposed categories remain the working target; exact columns can change before recruitment. No study/test version framework or keystroke/animation-frame recording.

Names/emails are unnecessary. Researchers download and privately retain exports after participation; no automated backup service is required.

## Human setup sequence

The implementer must convert this into a verified click-by-click guide once configuration exists. Variables/routes below are proposed, not claimed to be implemented.

1. Keep the existing Netlify site. Connect the appropriate Git repository/branch if needed. Build from source so functions deploy too; uploading only the frontend build directory is insufficient.
2. Set build command `npm run build`, publish directory `dist`, and the documented supported Node version. Let committed configuration define functions/routing.
3. In Netlify environment-variable settings, set server-side `AI_MODE=live`, `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-6-luna`, `OPENAI_MAX_CALLS_PER_SESSION=200`, `DEVELOPER_TOOLS=0` and a new random `ADMIN_SECRET`. No `VITE_` prefix for secrets. Leave role overrides blank unless intentionally used; restrict live secrets to the intended deployment context.
4. Deploy. Open `/admin`, enter the researcher password, import the generated mapping. Document any actual storage initialization; no separate database account should be needed.
5. Test a reactive key and a proactive key simultaneously in separate browser profiles. Confirm correct conditions and separate IDs/history/export rows.
6. Download/open CSVs. Check function errors and Netlify usage. Use separate test keys for pilot records.
7. Continue with quizzes/data details/refinement. When ready, freeze the code, distribute participant keys and require one open tab plus internet connectivity.

If account access/tools are missing, finish implementation/local verification and state exact remaining human actions. Never invent a site ID or claim deployment without observing it. A paid plan/new provider is not the default fallback.

## Hosting acceptance checklist

- Existing tests/build pass; report unavailable tooling honestly.
- Local development still works with free substitutes.
- Hosted API uses live AI, protects secrets, disables demo/developer access and loads physics excerpts.
- Authentication, tutor context and counters work across fresh function instances.
- Two different participants overlap without sharing history, condition, counters or records.
- Single-tab queued writes preserve independent checks and tutor history; no whole-dataset append race.
- Unauthenticated admin imports/exports fail; participant routes cannot export data.
- Mocked small-cap tests cover last allowed call, blocked next call, technical versus learning errors and export flags.
- CSVs open in Sheets/Excel with multiline answers intact and no executable learner formulas.
- Human guide covers setup, key generation/import, URLs, exports and error/usage locations.

These are targeted hosting checks, not a new pedagogical-validation gate or comprehensive failure-recovery project.

## Current implementation boundary

[server/index.ts](./server/index.ts) currently uses memory-only sessions/history/counters and a local mapping file; [src/state.ts](./src/state.ts) uses tab session storage; [src/api.ts](./src/api.ts) makes same-origin requests. [src/App.tsx](./src/App.tsx) clears saved progress on any initial session-fetch failure. Avoid that destructive clearing on a transient error if a small change suffices; no broader resume system.

This session changes documentation only: no deployed functions, storage, admin pages, exports or increased running cap. Tests/build were not rerun for these docs. Historical evidence is in [integration notes](./integration-notes.md).
