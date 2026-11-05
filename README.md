# Magnus effect learning activity

Working-activity review build. The treadmill motion and visual direction are approved; the complete flow is ready for designer inspection before final polish. The external activity specification remains the primary source, with subsequent approved feedback taking precedence. It has not been copied into this repository.

## Run locally

Node **22.18 or later** is required (verified with Node 24.13.1). From this folder:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:5173/**. The API runs locally on port 3001. No API key or physics reference is needed. Keep the terminal open; Ctrl+C stops both servers.

| Review key | Assigned support condition |
| --- | --- |
| `DEMO-R7K2` | Reactive: AI Help beside each simulation control |
| `DEMO-P9M4` | Proactive: no learner-requested help controls |

These keys are for development only. The session receives a random ID on entry. Progress is kept in the current tab's session storage so refreshing preserves it. The API's session and tutor context are in memory; restarting the API requires key entry again. This is not durable study-data recording.

For a production-style local preview:

```powershell
npm.cmd run build
npm.cmd start
```

Then open **http://127.0.0.1:3001/**. This still uses simulated AI. The commands above use `npm.cmd` for Windows PowerShell; `npm` is equivalent in other shells.

## Inspect the complete flow

Participant key → pre-test placeholder → treadmill → illustrated introduction → formula discovery → post-test placeholder.

The simulations, controls, response states, independent checks, progression, timed fallbacks, and tutor interfaces work. The quiz pages are placeholders for content supplied later. [Motion notes](./motion-review.md) describe the approved treadmill exaggerations. [Integration notes](./integration-notes.md) identify pending review choices and future AI materials.

**AI is simulated.** The development evaluator uses limited keyword recognition; it is not a validated semantic assessor. The development tutor uses contextual question templates and a small demonstration of help/wait decisions; it is not an LLM. These substitutes exercise the full interfaces without awarding progress on a tutor's behalf. The official SDK adapters are prepared but disconnected. Providing a key in the environment does not activate them.

## Developer review controls

After entering a key, open **http://127.0.0.1:5173/developer** in the **same tab**. This separate page provides:

- Configurable skip threshold (default 240 seconds, paused when the tab is hidden) and Short/Balanced/Extended thinking allowance.
- Evaluator outcomes: keyword demonstration, accepted, not accepted, or technical failure.
- Tutor outcomes: contextual demonstration, help, wait, or technical failure.
- A shortcut to make the current task's timed reveals eligible, without revealing anything automatically.
- A queued proactive context assessment for return to the activity, and private evaluator diagnostics.
- A new review-session action to try another key.

Save settings and use **Return to activity**. An already-open tutor bubble stays open until dismissed; changing the tutor's next outcome does not close it.

The default proactive scheduler considers a compact snapshot at most once per 45 seconds, only while the activity is visible, relevant context has changed, and no bubble/request is open. It does not evaluate drafts for completion. The future guidance model will decide help/wait; the present substitute is only a development demonstration.

## Issue participant keys

Choose the condition explicitly when generating keys; this utility does not implement a study randomization protocol:

```powershell
npm.cmd run keys -- --condition reactive --count 10
npm.cmd run keys -- --condition proactive --count 10
```

This creates or appends to the private, ignored server mapping `participants.local.json` and writes a private `participant-keys-*.csv` handout list. Give each participant only their key. The mapping stores a hash of each key, a random participant ID, and its assigned condition; raw keys are in the handout CSV. Restart the API to load new mappings. Reusing a key currently creates a new session for the same participant and condition; the study's reuse rule is pending.

Set `DEVELOPER_TOOLS=0` in an ignored `.env` file to disable developer endpoints and the demo keys, then restart the server. Generated participant keys continue working. Durable data collection and live AI must be completed separately before study use.

## Verify

```powershell
npm.cmd test
npm.cmd run build
```

Tests cover the approved motion port, all treadmill speed/direction ranges, formula extremes and visual mappings, API condition boundaries, private diagnostics, technical-failure handling, inactive live providers, and key generation. Both full support-condition flows were also checked in the browser, including timer pause, answer locking, independent checks, help/wait, and discovered/revealed counters. See [verification and review notes](./integration-notes.md).

## Main files

- [Activity controller](./src/App.tsx), [state](./src/state.ts), and [shared contracts](./src/shared/contracts.ts).
- [Treadmill component](./src/components/Treadmill.tsx) and [approved numerical model](./src/physics/treadmill.js).
- [Formula scene](./src/components/FormulaScene.tsx) and [formula configuration](./src/physics/formula.ts).
- [Server](./server/index.ts), [development substitutes](./server/ai/development.ts), and [disconnected OpenAI adapters](./server/ai/openai.ts).

The [original layout preview](./design-proposal.html) and [standalone treadmill](./prototype/treadmill.html) remain as review references. Use the local application above for the complete flow.
