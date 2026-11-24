# Deploy and run the classroom activity

The hosting code is implemented. Deployment to the existing Netlify site still requires account access and server secrets. No deployed URL or hosted test is claimed here. Use Node **24.x** (local verification: 24.13.1); Node 22.18+ also runs local development.

## What runs where

The **frontend** is the activity downloaded into the participant’s browser. **Functions** are the server code Netlify runs when the browser checks a key, checks an answer, or requests help. They keep the OpenAI key away from participants. **Blobs** is private storage in the same Netlify site: it holds hashed participant mappings, session authentication, recent tutor context and research records. No SQL, Supabase or Google Sheets connection is needed. OpenAI calls remain billable; hosting targets the existing free Netlify plan.

## Deploy the existing site

1. Sign in at [Netlify](https://app.netlify.com/), open the **existing project**, then **Project configuration → Build & deploy → Continuous deployment**. Connect `DellaSantaF/CS-411` and select the branch containing these changes. If the site previously used drag-and-drop uploads, connect Git now: uploading only the frontend folder does not deploy the backend.
2. Use the repository root as the base directory. The committed [configuration](./netlify.toml) sets build command `npm run build`, publish directory `dist`, functions directory `netlify/functions`, Node 24 and API routing before the page fallback. Build/runtime must both use Node 24 (`NODE_VERSION=24`, `AWS_LAMBDA_JS_RUNTIME=nodejs24.x`). Do not create another site or upgrade the plan by default.
3. In **Project configuration → Environment variables → Add a variable**, add the following. Put secrets in **Functions** scope if your account supports scopes; otherwise use the available server environment setting. Limit live values to the intended production context, not untrusted deploy previews. Netlify configuration-file build variables alone are not a substitute for function runtime variables.

   | Name | Value |
   | --- | --- |
   | `AI_MODE` | `live` |
   | `OPENAI_API_KEY` | Enter the existing API key privately in Netlify |
   | `OPENAI_MODEL` | `gpt-6-luna` |
   | `OPENAI_MAX_CALLS_PER_SESSION` | `200` |
   | `DEVELOPER_TOOLS` | `0` (hosted function also hard-disables developer tools) |
   | `ADMIN_SECRET` | A new long random researcher password, saved privately by the team |

   Leave `OPENAI_EVALUATOR_MODEL` and `OPENAI_TUTOR_MODEL` absent/blank unless intentionally overriding the shared model. Never use a `VITE_` prefix for secrets, put secrets in URLs, commit them, or send them in chat. Enter secrets yourself in the dashboard.
4. **Deploys → Trigger deploy → Deploy site** (or push the selected Git branch). Wait for a successful production deploy. Inspect the deploy log and Functions list: an `api` function must exist. The physics reference is explicitly included in its bundle. Open the project’s actual production URL from Netlify; no site ID is supplied by this repository.
5. Open that URL with `/admin` appended. Enter `ADMIN_SECRET` in its password field. The page retains it only until reload; authorized requests send it in a header. Import the generated hashed mapping below. Named private site-wide Blobs stores are created on their first writes; there is no separate database initialization. They survive function instances and redeploys of this same site.

## Generate and distribute keys

From the repository folder in PowerShell:

```powershell
npm.cmd ci
npm.cmd run keys -- --condition reactive --count 15
npm.cmd run keys -- --condition proactive --count 15
```

These append to the private ignored `participants.local.json` mapping and create separate `participant-keys-<condition>-<timestamp>.csv` handout files containing raw keys, participant IDs and conditions. Keep both private. Researchers choose randomization and distribute each learner’s own key themselves.

At `/admin`, select **Import participant mapping** and upload `participants.local.json`, not a handout CSV. The confirmation reports counts by condition. Reimporting the same mapping is safe; new IDs merge, and attempts to change existing identities/conditions fail. If an import is interrupted, repeat the same file; no existing assignment is replaced. Importing works without restarting/deploying the hosted API. For the ordinary local Node server, restart to load files generated since startup, or import through its local admin page.

The activity URL is `/`. `/admin` is for researchers. `/developer` and `/api/developer` are unavailable on the hosted function; demo keys cannot start hosted sessions. Participants need internet and **one tab per attempt**. Different keys can run simultaneously. A participant ID stays the same when a key is reused, but each entry creates a new **session ID** (attempt). Exclude duplicates manually using session IDs. Same-tab refresh normally keeps progress; do not promise recovery after an interruption or across devices.

## Pilot before distributing real keys

Use separate pilot keys, one reactive and one proactive, in two browser profiles. Overlap their sessions: enter keys, check different answers, request reactive help and allow proactive help/wait. Confirm the correct condition, separate session/participant IDs, independent history/counts, and no reactive Help buttons in the proactive condition. Refresh one tab after completed requests to check that authentication survives another function invocation. Confirm `/developer` fails and demo keys are rejected.

In a logged-out admin page, session lists/imports/exports must fail. Log in to `/admin`, refresh the list and download both CSVs. Open them in Excel or import into Google Sheets and verify the pilot rows and multiline answers. Do not make 200 live calls to test the cap: automated tests use a small cap and mocked providers. Existing tests preserve the approved rubrics, controls, physics and timers; no new learning-validation gate is required.

Only local/emulated overlapping sessions have been verified so far. The hosted overlap, live physics loading, request duration, account usage and production route checks above remain human/account-access checks.

Local checks: `npm.cmd test`, `npm.cmd run build`, `npm.cmd run hosting:check`. The last command checks Netlify packaging and runs the packaged function with local Blobs and external requests blocked. TypeScript 6 is pinned because the packaging parser currently fails with TypeScript 7’s native API.

## Export and interpret records

At `/admin`, enter the password, choose **Refresh sessions**, **Download sessions.csv**, and **Download events.csv**. Export after requests have finished. Event downloads fetch one attempt at a time and combine them in the browser, avoiding a single classroom-sized function request. Keep the page open until the download finishes. If any request fails, no partial download is silently presented as complete; retry the read-only export. Downloads are snapshots, not transactional freezes while learners are still writing.

`sessions.csv` includes every started attempt, including incomplete ones:

| Columns | Meaning/example |
| --- | --- |
| `participant_id`, `session_id`, `condition` | Stable generated participant UUID, distinct attempt UUID, `reactive`/`proactive` |
| `started_at`, `stage` | Server UTC start, last recorded stage such as `formula` |
| `ai_calls_used`, `ai_call_limit` | For example `17`, `200`; reservations count before the provider call |
| `ai_limit_reached`, `ai_limit_reached_at` | Set immediately on reserving the last allowance, even if no further call is requested |
| `attempt_ended`, `technical_error` | Interrupted or pending request/review flag; refresh after an active request finishes |

`events.csv` has `event_id`, `participant_id`, `session_id`, `condition`, `server_time`, `event_type`, `stage`, `target`, `text`, `result`, `details`. Examples: `evaluation_submitted` with the learner’s response; `evaluation_result` with `accepted` or `not_accepted`; `tutor_help` or `tutor_wait`; `technical_error`; `ai_call_reserved`; `ai_limit_blocked`. Stage entries are recorded, but a `posttest` stage only means the placeholder was reached, not a submitted test or proven completion. Detailed slider, timing, token and test analytics are deferred.

CSV quotes/commas/newlines are escaped. Potential spreadsheet formulas in learner text receive a leading apostrophe, so spreadsheet programs treat them as text. Tokens and private evaluator diagnostics are never exported or returned to participants. Records are private Blobs JSON internally; CSV is generated on demand. Store downloaded exports privately after class; no automatic backup service is included.

For scripted researcher reads, use the password in an `Authorization: Bearer …` header: `GET /api/admin/sessions`, `GET /api/admin/sessions.csv`, `GET /api/admin/events.csv?session_id=<attempt-UUID>`. Import uses `POST /api/admin/import` with `{ "participants": [ ...hashed mapping... ] }`. Do not put the password in the query string.

## Errors, usage and local operation

Netlify **Deploys** shows build errors. The project’s **Logs & metrics → Functions** (or **Functions → api → logs**, depending on dashboard layout) shows runtime errors and provider usage counts. Logs omit credentials, learner text and private evaluator diagnostics. `/admin` and the exports show interrupted attempts, cap counts and minimum error records. If storage itself fails, an error may exist only in function logs or as a pending reservation; exclude that attempt manually rather than retrying a billable request.

The browser serializes every session mutation in its tab. Functions use strong reads and persist reservations/results before replying. Strong reads are not atomic updates; this design relies on the supported single-tab writer. There is no process-local lock or global classroom queue. Duplicating an attempt’s tab or sharing its token is unsupported. An ambiguous timeout/persistence error stops queued mutations and asks the learner to contact the researcher. Drafts stay in that tab; a fresh attempt requires researcher guidance/key re-entry, not automatic replay.

Each attempt allows **200 attempted live provider calls** by default. Failed calls and model-generated wait decisions count; cached evaluations, local throttle waits and untouched-slider prompts do not. The 200th reservation sets the reached flag/timestamp. Further provider requests record blocked events and show a distinct limit message; they do not count as incorrect answers or complete tasks. This is not an account-wide spending limit. A new key entry creates a fresh attempt/allowance. Check Netlify’s team **Usage & billing** and the OpenAI project usage/budget controls after the overlapping pilot. Confirm the existing free plan’s actual allowance; no paid upgrade is assumed.

For free local substitutes, use `AI_MODE=development`, then `npm.cmd run dev`, and open `http://127.0.0.1:5173/`. Local `/admin` works if you set `ADMIN_SECRET` locally. Ordinary local development uses memory-only storage and loses server records on restart; hosted functions always use Blobs with no memory fallback. To preview the built local site, run `npm.cmd run build`, then `npm.cmd start` and open `http://127.0.0.1:3001/`. Existing demo keys work locally when developer tools are enabled.

**The private local `.env` was not read or changed for this work.** If it already sets `OPENAI_MAX_CALLS_PER_SESSION=40`, change that override yourself to `200` and restart. A terminal environment override also takes precedence. The shareable [.env.example](./.env.example) now uses 200. Local secrets are not automatically copied to Netlify.

Remaining setup: sign in/select the existing site, connect/deploy the implementation branch, enter production secrets/runtime variables, import pilot keys, run the overlapping hosted checks, inspect usage and privately retain exports. Quizzes, detailed analytics and optional tuning follow hosting. Freeze the activity before real recruitment.
