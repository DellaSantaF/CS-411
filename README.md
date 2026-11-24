# Magnus effect learning activity

The OpenAI integration prototype is implemented, and the user accepts the live learning experience for the first classroom version. Follow [OpenAI setup](./openai-setup.md) for local operation. Both AI roles default to gpt-6-luna with low reasoning. The approved interface and numerical model are preserved.

Netlify Functions, private site-wide Blobs, a protected `/admin` mapping-import/session-list/CSV-export page and a persistent 200-call allowance are implemented for 20–30 participants. Follow the [deployment and operation guide](./hosting-guide.md). The existing site still needs account access, production secrets, a Git deployment, mapping import and overlapping hosted pilot checks; no deployment is claimed. Quizzes and detailed data follow hosting.

## Run locally

Node **22.18 or later** is required (verified with Node 24.13.1). From this folder:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:5173/**. The API runs locally on port 3001. Without a local .env, the application uses free development substitutes. With AI_MODE=live in .env, an API key and the supplied physics reference are required. Keep the terminal open; Ctrl+C stops both servers.

| Review key | Assigned support condition |
| --- | --- |
| `DEMO-R7K2` | Reactive: AI Help beside each simulation control |
| `DEMO-P9M4` | Proactive: no learner-requested help controls |

These keys are for local development only; hosted demo/developer access is disabled. Each key entry creates a new session/attempt ID under the same participant ID. Progress stays in the current tab. Local Node development keeps server records in memory and loses them on restart; hosted functions persist authentication, tutor context, counters and minimum records in private Blobs. Use one tab per attempt.

For a production-style local preview:

```powershell
npm.cmd run build
npm.cmd start
```

Then open **http://127.0.0.1:3001/**. The AI_MODE setting selects live OpenAI or free development substitutes. The commands above use `npm.cmd` for Windows PowerShell; `npm` is equivalent in other shells.

## Inspect the complete flow

Participant key → pre-test placeholder → treadmill → illustrated introduction → formula discovery → post-test placeholder.

The simulations, controls, response states, independent checks, progression, timed fallbacks, and tutor interfaces work. The quiz pages are placeholders for content supplied later. [Motion notes](./motion-review.md) describe the approved treadmill exaggerations. [Integration notes](./integration-notes.md) provide the next agent's starting points, future AI materials, and remaining integration decisions.

**In AI_MODE=development, AI is simulated.** The development evaluator uses limited keyword recognition; it is not a validated semantic assessor. The development tutor uses contextual question templates and a small demonstration of help/wait decisions; it is not an LLM. These substitutes exercise the full interfaces without awarding progress on a tutor's behalf. Set AI_MODE=live and provide OPENAI_API_KEY to activate the official Responses adapters. See [the setup walkthrough](./openai-setup.md) for costs, limits and verification.

## Developer review controls

After entering a key, open **http://127.0.0.1:5173/developer** in the **same tab**. This separate page provides:

- Configurable skip threshold (default 240 seconds, paused when the tab is hidden) and Short/Balanced/Extended thinking allowance.
- Evaluator outcomes: keyword demonstration, accepted, not accepted, or technical failure.
- Tutor outcomes: contextual demonstration, help, wait, or technical failure.
- A shortcut to make the current task's timed reveals eligible, without revealing anything automatically.
- A queued proactive context assessment for return to the activity, and private evaluator diagnostics.
- A new review-session action to try another key.

Save settings and use **Return to activity**. An already-open tutor bubble stays open until dismissed; changing the tutor's next outcome does not close it.

The default proactive scheduler considers a compact snapshot at most once per 45 seconds, only while the activity is visible, relevant context has changed, and no bubble/request is open. It does not evaluate drafts for completion. In live mode the guidance model decides help/wait; development mode uses the contextual substitute.

## Issue participant keys

Choose the condition explicitly when generating keys; this utility does not implement a study randomization protocol:

```powershell
npm.cmd run keys -- --condition reactive --count 10
npm.cmd run keys -- --condition proactive --count 10
```

This creates or appends to the private, ignored server mapping `participants.local.json` and writes a private `participant-keys-*.csv` handout list. Give each participant only their key. The mapping stores a hash of each key, a random participant ID, and its assigned condition; raw keys are in the handout CSV. For local Node development, restart the API to load new mappings. For hosting, upload the hashed mapping at `/admin`; no restart is needed. Key re-entry creates another attempt for the same participant/condition; researchers exclude duplicates by session ID.

Set `DEVELOPER_TOOLS=0` in an ignored `.env` file to disable developer endpoints and the demo keys, then restart the server. Generated participant keys continue working. Hosted functions persist minimum records; download them through `/admin`. The user has accepted the version-one learning experience. Complete the hosted pilot/setup in the [guide](./hosting-guide.md) before distributing real keys.

## Verify

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run hosting:check
```

Tests cover the approved physics and learning contracts, plus fresh-function Blobs authentication/history isolation, overlapping participants, protected imports/exports, queued writes and small mocked caps. `hosting:check` packages the actual function, verifies the exact physics reference and absence of private files, then exercises live initialization and Blobs with external provider calls blocked. TypeScript is pinned to 6 for Netlify packaging compatibility. See [verification and review notes](./integration-notes.md).

## Main files

- [Activity controller](./src/App.tsx), [state](./src/state.ts), and [shared contracts](./src/shared/contracts.ts).
- [Treadmill component](./src/components/Treadmill.tsx) and [approved numerical model](./src/physics/treadmill.js).
- [Formula scene](./src/components/FormulaScene.tsx) and [formula configuration](./src/physics/formula.ts).
- [Local server](./server/index.ts), [shared request logic](./server/activity.ts), [storage](./server/storage.ts), [Netlify function](./netlify/functions/api.ts), [development substitutes](./server/ai/development.ts), and [OpenAI adapters](./server/ai/openai.ts).

The [original layout preview](./design-proposal.html) and [standalone treadmill](./prototype/treadmill.html) remain as review references. Use the local application above for the complete flow.
