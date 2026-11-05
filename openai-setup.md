# Connect the activity to OpenAI

The prototype connects the two existing AI roles using **gpt-6-luna** with
**reasoning.effort = low**. The website sends learner input to your local Node
server; only that server sends the request and API key to OpenAI. The browser
never receives the key. Both roles use the same model but different instructions.

## 1. Save your key locally

Open the ignored [.env](./.env) file in the project folder. A blank-key template
has been prepared. Add your key after `OPENAI_API_KEY=` and save:

```dotenv
AI_MODE=live
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-6-luna
OPENAI_MAX_CALLS_PER_SESSION=40
PORT=3001
```

Leave the two role-specific model overrides blank to use Luna for both roles.
Do not paste the key into chat, React code, a participant-key field, or Git.
The [.env.example](./.env.example) file is shareable and must stay blank-key.
If you already have the key in a terminal environment, that value takes precedence
over Node's env-file value. Restart the server after any configuration change.

An API key identifies the OpenAI API project paying for requests. Check that
project's billing and model access in the OpenAI platform. Actual requests are
required to confirm account access; a ChatGPT/Codex model selection alone cannot
confirm it. Review project usage limits/alerts in the platform as well.

## 2. Test the connection cheaply

In PowerShell, in this project folder:

```powershell
npm.cmd run ai:check
```

This makes **three billable calls**: an intuitive density description, an explicitly
incorrect rotation description, and one requested Socratic hint. It prints results
and token counts without printing your key. Expect two PASS lines and a short
question about observing the lines that does not give the parameter name away.

If this fails, inspect the status: 401 typically indicates credentials; 403/404
can indicate project/model access; 429 can indicate quota or rate limits. Verify
the project billing/access rather than repeatedly rerunning. The code does not
automatically retry or substitute another model.

For a broader **12-call** check of intuitive wording, negation, prompt injection,
treadmill explanation, answer protection and proactive help/wait:

```powershell
npm.cmd run ai:check -- --full
```

These synthetic examples are initial prototype checks, not agreed study grading
standards. Inspect the tutor wording yourself. Structured JSON protects the output
format, but does not prove scientific or teaching quality.

## 3. Open the activity

```powershell
npm.cmd run dev
```

Open http://127.0.0.1:5173/ and enter `DEMO-R7K2` for reactive support or
`DEMO-P9M4` for proactive support. The banner after entry must say that the
evaluator and tutor use OpenAI. Selecting a prediction costs no tokens. Check
sends an answer to the evaluator. Reactive AI Help sends the selected control's
context to the tutor. In proactive sessions, the tutor periodically decides
help/wait; **a wait decision still costs tokens**.

For a quick browser walkthrough, open `/developer` in the same tab after entry.
Use the timed-reveal shortcut to reach formula exploration if needed. Timed
reveals remain application behavior and cost no API tokens. Live mode disables
forced simulated outcomes. Set `AI_MODE=development` and restart to use those
free substitutes instead.

## How token use is limited

- Evaluator: one answer, its rubric, relevant physics excerpt; maximum 800 output
  tokens, including reasoning. No requests while typing.
- Tutor: current task only, up to eight interactions, four related checks and
  three recent hints. Maximum 1,000 output tokens, including reasoning; hints
  are instructed to stay under 45 words.
- Both roles use low reasoning, `store: false`, no tools, no full transcript,
  a 30-second timeout and **zero automatic retries**. `store: false` disables
  response storage; it is not a claim of zero provider retention.
- Identical repeated checks reuse the recent server-side answer result. Proactive
  requests remain at most once per 45 seconds and pause for hidden tabs or an
  open hint. The LLM decides when assistance is appropriate.
- The server permits at most **40 attempted AI calls per session**, including
  failures and proactive wait results. This is a request cap, not a money limit:
  input length and actual model usage affect cost. New sessions/server restarts
  reset this in-memory limit. The standalone check script has its own fixed
  three/12-call scope and is outside the session cap.
- The terminal logs counts only: input, output, and reasoning (a subset of output;
  do not add it again). Developer API details expose used/allowed request counts.

Start with reactive support when testing cheaply: requests occur only on Check
or Help. Lowering output caps too far can leave no tokens for the required JSON;
incomplete replies are technical errors, never accepted answers.

## Physics grounding and remaining review

[The supplied reference](./magnus_effect_physics_reference.md) is read at startup.
[Excerpt selection](./server/ai/physics.ts) uses its core, treadmill and simplified
formula sections. Its later force-view section describes older separate ball/
airflow/spin controls that the approved website does not have. That section is
excluded and the current four controls and fixed directions are stated explicitly.
The approved numerical physics, interface, timers and progression are preserved.

Before study use, review representative learner answers and tutor interventions
with the designer. Quizzes and durable study-data collection are still deferred.
The API server binds to localhost. This prototype's in-memory session limit and
demo keys are not an account-wide spending control or a public-deployment design.

## Official references

- [GPT-6 Luna and supported reasoning effort](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [Structured outputs with Responses](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
