import { memoryStorage } from './storage.ts';
import type { Storage } from './storage.ts';
import { csv, eventColumns, sessionColumns, importParticipants, isAdmin, keyHash, tokenHash, validateParticipants } from './records.ts';
import type { Participant, Event } from './records.ts';

import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { controlTargets, fields, helpTargets, targetField } from '../src/shared/contracts.ts';
import { parameters as parameterDefinitions } from '../src/physics/formula.ts';
import type { DeveloperSettings, EvaluationRequest, LearnerContext, SessionInfo, Stage } from '../src/shared/contracts.ts';
import type { CheckedAnswer, GuidanceContext } from './ai/contracts.ts';
import { protectGuidance } from './ai/guidance.ts';
import { providersFromEnvironment } from './ai/providers.ts';
import type { Providers } from './ai/providers.ts';

type Session = { info: SessionInfo; settings: DeveloperSettings; checks: CheckedAnswer[]; guidance: { target: string; message: string }[]; calls: number; pending: number; authKey: string; startedAt: string; stage: Stage; callLimit: number; limitReached: boolean; limitReachedAt: string; ended: boolean; technicalError: string; lastProactive: number };
class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
const defaults = (): DeveloperSettings => ({ skipSeconds: 240, thinkingTime: 'balanced', evaluator: 'auto', tutor: 'auto' });

export async function createActivityHandler({ developerEnabled = process.env.DEVELOPER_TOOLS !== '0', providers: suppliedProviders, storage = memoryStorage(), adminSecret = process.env.ADMIN_SECRET, loadLocalMapping = true, maxLiveCalls = Number(process.env.OPENAI_MAX_CALLS_PER_SESSION || 200) }: { developerEnabled?: boolean; providers?: Providers; storage?: Storage; adminSecret?: string; loadLocalMapping?: boolean; maxLiveCalls?: number } = {}) {
  const providers = suppliedProviders ?? await providersFromEnvironment();
  if (!Number.isInteger(maxLiveCalls) || maxLiveCalls < 1 || maxLiveCalls > 1000) throw new Error('OPENAI_MAX_CALLS_PER_SESSION must be an integer from 1 to 1000.');
  async function invoke<T>(session: Session, action: () => Promise<T>): Promise<T> {
    if (providers.mode === 'live') {
      if (session.calls >= session.callLimit) {
        await event(session, 'ai_limit_blocked');
        throw new HttpError(429, 'You have used all AI calls available for this attempt. Checks and AI help are now unavailable. Your work is saved; please contact the researcher.');
      }
      session.calls++;
      if (session.calls === session.callLimit) {
        session.limitReached = true; session.limitReachedAt = new Date().toISOString();
      }
      // Durable reservation before any billable side effect. Never retry this call.
      await save(session);
      await event(session, 'ai_call_reserved', { result: String(session.calls) });
    }
    try { return await action(); }
    catch (error) {
      if (providers.mode === 'live') console.warn('OpenAI request failed', { status: (error as { status?: number }).status ?? 'unavailable' });
      if (providers.mode === 'development') throw new HttpError(503, 'The development provider could not respond.');
      throw error;
    }
  }
  async function save(session: Session) { await storage.put('sessions', session.authKey, session); }
  async function event(session: Session, event_type: string, values: Partial<Event> = {}) {
    const record: Event = { event_id: randomUUID(), participant_id: session.info.participantId, session_id: session.info.sessionId,
      condition: session.info.condition, server_time: new Date().toISOString(), event_type, stage: session.stage, ...values };
    await storage.put('events', `${record.session_id}/${record.event_id}`, record);
  }
  if (loadLocalMapping) {
    try { await importParticipants(storage, validateParticipants(JSON.parse(await readFile(resolve('participants.local.json'), 'utf8')))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  if (developerEnabled) for (const [key, condition] of [['DEMO-R7K2', 'reactive'], ['DEMO-P9M4', 'proactive']] as const) {
    await storage.create('participants', keyHash(key), { keyHash: keyHash(key), participantId: randomUUID(), condition });
  }
  async function authenticated(request: Request) {
    const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
    const session = await storage.get<Session>('sessions', tokenHash(token));
    if (!session) throw new HttpError(401, 'Enter your participant key to begin.');
    return session;
  }
  const json = (status: number, value: unknown) => Response.json(value, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
  async function body(request: Request, limit = 32_768): Promise<Record<string, unknown>> {
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError(400, 'Invalid request.');
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new HttpError(413, 'Request too large.'); }
      chunks.push(value);
    }
    try { const data = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); return data; }
    catch { throw new HttpError(400, 'Invalid request.'); }
  }
  function context(data: Record<string, unknown>, session: Session): GuidanceContext {
    const value = data.context as LearnerContext | undefined;
    if (!value || !['pretest', 'treadmill', 'introduction', 'formula', 'posttest'].includes(value.stage)
      || !helpTargets.includes(value.target) || !['setup', 'prediction', 'exploration'].includes(value.phase)) throw new HttpError(400, 'Invalid context.');
    const drafts: LearnerContext['drafts'] = {};
    const outcomes: LearnerContext['outcomes'] = {};
    for (const field of fields) {
      if (!(value.stage === 'formula' ? ['cl', 'rho', 'v', 'area'] : value.phase === 'prediction' ? ['prediction'] : ['explanation']).includes(field)) continue;
      drafts[field] = typeof value.drafts?.[field] === 'string' ? value.drafts[field]!.slice(0, 2000) : '';
      const status = value.outcomes?.[field];
      outcomes[field] = status && ['editable', 'checking', 'accepted', 'revealed'].includes(status) ? status : 'editable';
    }
    const recentInteractions = Array.isArray(value.recentInteractions) ? value.recentInteractions.slice(-8).map(event => ({
      kind: String(event.kind).slice(0, 30), target: String(event.target).slice(0, 40), value: String(event.value).slice(0, 80), at: Number(event.at) || 0,
    })) : [];
    const parameters = Object.fromEntries((['cl', 'rho', 'v', 'area'] as const).map(id => [id, Number(value.parameters?.[id]) || 0])) as LearnerContext['parameters'];
    const relevant = value.stage === 'formula' ? ['cl', 'rho', 'v', 'area', 'formula-scene', ...controlTargets.filter(id => id.startsWith('slider-'))]
      : value.phase === 'prediction' ? ['prediction', 'treadmill-scene'] : ['explanation', 'treadmill-scene', 'treadmill-direction', 'treadmill-speed'];
    if (!relevant.includes(value.target)) throw new HttpError(400, 'Control is unavailable at this stage.');
    const belt = (settings: { beltSpeed: number; direction: number } | undefined) => ({
      beltSpeed: Math.min(10, Math.max(6, Number(settings?.beltSpeed) || 8)), direction: settings?.direction === -1 ? -1 : 1,
    });
    const treadmill = value.stage === 'treadmill' ? { controls: belt(value.treadmill?.controls), observedRun: belt(value.treadmill?.observedRun) } : undefined;
    const field = targetField(value.target);
    // Canonical control metadata is derived here, rather than trusting client descriptions.
    let interactiveControl: LearnerContext['interactiveControl'];
    if (value.target === 'treadmill-direction') interactiveControl = { id: value.target, label: 'Treadmill direction', value: treadmill!.controls.direction === -1 ? 'left' : 'right' };
    if (value.target === 'treadmill-speed') interactiveControl = { id: value.target, label: 'Treadmill speed', value: treadmill!.controls.beltSpeed, unit: 'm/s' };
    if (value.target.startsWith('slider-')) {
      const id = field as keyof typeof parameterDefinitions;
      interactiveControl = { id: value.target as NonNullable<LearnerContext['interactiveControl']>['id'], label: `Parameter ${parameterDefinitions[id].number}`, value: parameters[id], ...(['accepted', 'revealed'].includes(outcomes[id] ?? '') ? { label: parameterDefinitions[id].name, unit: parameterDefinitions[id].unit } : {}) };
    }
    return { stage: value.stage as Stage, phase: value.phase, target: value.target, drafts, outcomes, parameters, treadmill, interactiveControl, exploredControls: Array.isArray(value.exploredControls) ? value.exploredControls.filter(id => controlTargets.includes(id as typeof controlTargets[number])).slice(0, 6) : [], recentInteractions,
      elapsedMs: Math.max(0, Number(value.elapsedMs) || 0), timeWithoutProgressMs: Math.max(0, Number(value.timeWithoutProgressMs) || 0),
      priorGuidance: session.guidance.filter(m => relevant.includes(m.target)).slice(-3).map(m => ({ target: m.target as GuidanceContext['target'], message: m.message })),
      checkedAnswers: session.checks.filter(check => relevant.includes(check.field) && (check.field === field || value.target.endsWith('scene'))).slice(-4)
        .map(check => ({ ...check, text: check.text.slice(0, 1000), diagnostics: check.diagnostics.slice(0, 3) })),
      condition: session.info.condition, thinkingTime: session.settings.thinkingTime };
  }
  return async (request: Request): Promise<Response> => {
    let active: Session | undefined; let mutating = false;
    const reply = async (status: number, value: unknown) => {
      if (active && mutating) { active.pending = 0; await save(active); }
      return json(status, value);
    };

    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/admin/')) {
        if (!isAdmin(request.headers.get('authorization'), adminSecret)) throw new HttpError(401, 'Researcher password required.');
        if (url.pathname === '/api/admin/import' && request.method === 'POST') {
          const data = await body(request, 512_000);
          let mapping: Participant[];
          try { mapping = validateParticipants(data.participants); }
          catch (error) { throw new HttpError(400, (error as Error).message); }
          try { return json(200, await importParticipants(storage, mapping)); }
          catch (error) { if ((error as Error).message.includes('mapping') || (error as Error).message.includes('cannot be changed')) throw new HttpError(409, (error as Error).message); throw error; }
        }
        if (request.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
        const summaries = async () => (await storage.list<Session>('sessions')).map(s => ({
          participant_id: s.info.participantId, session_id: s.info.sessionId, condition: s.info.condition,
          started_at: s.startedAt, stage: s.stage, ai_calls_used: s.calls, ai_call_limit: s.callLimit,
          ai_limit_reached: s.limitReached, ai_limit_reached_at: s.limitReachedAt,
          attempt_ended: s.ended || !!s.pending, technical_error: s.technicalError || (s.pending ? 'Unfinished request; may still be running.' : ''),
        }));
        if (url.pathname === '/api/admin/sessions') return json(200, await summaries());
        const name = url.pathname.slice('/api/admin/'.length);
        if (name === 'sessions.csv' || name === 'events.csv') {
          const sessionId = url.searchParams.get('session_id');
          if (name === 'events.csv' && (!sessionId || !/^[a-f0-9-]{36}$/.test(sessionId))) throw new HttpError(400, 'Choose a session_id or use the admin download button to export all sessions.');
          const content = name === 'sessions.csv' ? csv(sessionColumns, await summaries()) : csv(eventColumns, await storage.list<Event>('events', `${sessionId}/`));
          return new Response(content, { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="${name}"` } });
        }
        throw new HttpError(404, 'Not found.');
      }
      if (url.pathname === '/api/session' && request.method === 'POST') {
        const data = await body(request);
        const participant = await storage.get<Participant>('participants', keyHash(typeof data.key === 'string' ? data.key : ''));
        if (!participant) throw new HttpError(400, 'This key was not recognized. Check the key provided for your session.');
        const settings = defaults();
        const info: SessionInfo = { sessionId: randomUUID(), participantId: participant.participantId, condition: participant.condition,
          skipSeconds: settings.skipSeconds, thinkingTime: settings.thinkingTime, aiMode: providers.mode };
        const token = randomBytes(32).toString('hex');
        active = { info, settings, checks: [], guidance: [], calls: 0, pending: 0, lastProactive: 0, authKey: tokenHash(token), startedAt: new Date().toISOString(), stage: 'pretest', callLimit: maxLiveCalls, limitReached: false, limitReachedAt: '', ended: false, technicalError: '' };
        mutating = true;
        await save(active); await event(active, 'session_started');
        return await reply(200, { token, session: info });
      }
      if (url.pathname.startsWith('/api/')) {
        const session = await authenticated(request); active = session;
        mutating = request.method !== 'GET';
        if (mutating) {
          if (session.ended || session.pending) throw new HttpError(409, 'This attempt has stopped after a technical interruption. Please contact the researcher.');
          session.pending = 1; await save(session);
        }
        if (url.pathname === '/api/session' && request.method === 'GET') {
          return await reply(200, { ...session.info, skipSeconds: session.settings.skipSeconds, thinkingTime: session.settings.thinkingTime, attemptEnded: session.ended || !!session.pending });
        }
        if (url.pathname === '/api/record' && request.method === 'POST') {
          const data = await body(request);
          if (!['pretest', 'treadmill', 'introduction', 'formula', 'posttest'].includes(String(data.stage))) throw new HttpError(400, 'Invalid stage.');
          session.stage = data.stage as Stage;
          await event(session, 'stage_entered');
          return await reply(200, { saved: true });
        }
        if (url.pathname === '/api/evaluate' && request.method === 'POST') {
          const data = await body(request);
          if (!fields.includes(data.field as EvaluationRequest['field']) || typeof data.text !== 'string' || data.text.length > 2000 || !Number.isInteger(data.revision)) throw new HttpError(400, 'Invalid answer.');
          const submitted: EvaluationRequest = { field: data.field as EvaluationRequest['field'], text: data.text, revision: data.revision as number };
          session.stage = ['prediction', 'explanation'].includes(submitted.field) ? 'treadmill' : 'formula';
          await event(session, 'evaluation_submitted', { target: submitted.field, text: submitted.text });
          // Only this Check endpoint invokes the evaluator. Diagnostics remain server-side.
          const previous = providers.mode === 'live' ? session.checks.findLast(check => check.field === submitted.field && check.text === submitted.text) : undefined;
          const result = previous ? { accepted: previous.accepted, diagnostics: previous.diagnostics, feedback: previous.feedback } : await invoke(session, () => providers.evaluator(() => session.settings).evaluate(submitted));
          session.checks.push({ ...submitted, ...result, at: Date.now() });
          session.checks = session.checks.slice(-24);
          await event(session, 'evaluation_result', { target: submitted.field, text: submitted.text, result: result.accepted ? 'accepted' : 'not_accepted', details: previous ? 'cached' : providers.mode });
          return await reply(200, { accepted: result.accepted, feedback: result.feedback || '', revision: submitted.revision, mode: providers.mode });
        }
        if (url.pathname === '/api/tutor' && request.method === 'POST') {
          const data = await body(request);
          const requested = data.requested === true;
          if (requested && session.info.condition !== 'reactive') throw new HttpError(403, 'Learner-requested guidance is unavailable in this condition.');
          if (!requested && session.info.condition !== 'proactive') throw new HttpError(403, 'Automatic guidance is unavailable in this condition.');
          const snapshot = context(data, session);
          session.stage = snapshot.stage;
          if (requested && !controlTargets.includes(snapshot.target as typeof controlTargets[number])) throw new HttpError(400, 'Choose an interactive control for guidance.');
          if (providers.mode === 'live' && !requested) {
            if (Date.now() - session.lastProactive < 45_000) { await event(session, 'tutor_wait', { target: snapshot.target, details: 'local_throttle' }); return await reply(200, { decision: 'wait', target: snapshot.target, message: '' }); }
            session.lastProactive = Date.now();
          }
          const untouched = requested && snapshot.target.startsWith('slider-') && !snapshot.exploredControls?.includes(snapshot.target);
          const result = untouched ? { decision: 'help' as const, target: snapshot.target, message: 'Try moving this slider first and observe what changes in the scene. What do you notice at two different settings?' } : protectGuidance(await invoke(session, () => providers.tutor(() => session.settings).assess(snapshot, requested)), snapshot);
          if (result.decision === 'help') { session.guidance.push({ target: result.target, message: result.message }); session.guidance = session.guidance.slice(-4); }
          await event(session, `tutor_${result.decision}`, { target: result.target, text: result.message, details: untouched ? 'local_untouched_control' : providers.mode });
          return await reply(200, result);
        }
        if (url.pathname === '/api/developer') {
          if (!developerEnabled) throw new HttpError(404, 'Not found.');
          if (request.method === 'PATCH') {
            const data = await body(request);
            if (typeof data.skipSeconds !== 'number' || data.skipSeconds < 1 || data.skipSeconds > 3600
              || !['short', 'balanced', 'extended'].includes(String(data.thinkingTime))
              || !['auto', 'accept', 'reject', 'technical-error'].includes(String(data.evaluator))
              || !['auto', 'help', 'wait', 'technical-error'].includes(String(data.tutor))) throw new HttpError(400, 'Invalid development settings.');
            if (providers.mode === 'live' && (data.evaluator !== 'auto' || data.tutor !== 'auto')) throw new HttpError(400, 'Simulated outcomes require AI_MODE=development and a server restart.');
            session.settings = data as unknown as DeveloperSettings;
          }
          return await reply(200, { settings: session.settings, session: session.info, checks: session.checks, guidance: session.guidance, aiRequests: { used: session.calls, limit: maxLiveCalls } });
        }
        throw new HttpError(404, 'Not found.');
      }
      throw new HttpError(404, 'Not found.');
    } catch (error) {
      const known = error instanceof HttpError;
      const fatal = !known || (error as HttpError).status === 409;
      if (active && mutating) {
        if (fatal) { active.ended = true; active.technicalError = 'Technical interruption; review attempt.'; }
        active.pending = 0;
        try {
          await event(active, fatal || known && error.status >= 500 ? 'technical_error' : 'request_blocked', { result: known ? String(error.status) : 'service_failure' });
          await save(active);
        } catch { console.error('Activity persistence failed', { sessionId: active.info.sessionId }); }
      }
      if (!known) console.error('Activity request failed', { sessionId: active?.info.sessionId, type: error instanceof Error ? error.name : 'unknown' });
      return json(known ? error.status : 503, { message: known ? error.message : 'A technical error stopped this attempt. Your draft is saved in this tab. Please contact the researcher.', code: fatal ? 'attempt_ended' : error.status === 429 ? 'ai_limit' : 'request_error' });
    }
  };
}
