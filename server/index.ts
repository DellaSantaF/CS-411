import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { controlTargets, fields, helpTargets, targetField } from '../src/shared/contracts.ts';
import { parameters as parameterDefinitions } from '../src/physics/formula.ts';
import type { DeveloperSettings, EvaluationRequest, LearnerContext, SessionInfo, Stage } from '../src/shared/contracts.ts';
import type { CheckedAnswer, GuidanceContext } from './ai/contracts.ts';
import { developmentEvaluator, developmentTutor } from './ai/development.ts';

type Participant = { keyHash: string; participantId: string; condition: SessionInfo['condition'] };
type Session = { info: SessionInfo; settings: DeveloperSettings; checks: CheckedAnswer[]; guidance: { target: string; message: string }[] };
const hash = (key: string) => createHash('sha256').update(key.trim().toUpperCase()).digest('hex');
class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
const defaults = (): DeveloperSettings => ({ skipSeconds: 240, thinkingTime: 'balanced', evaluator: 'auto', tutor: 'auto' });

export async function createActivityServer({ developerEnabled = process.env.DEVELOPER_TOOLS !== '0' } = {}) {
  const sessions = new Map<string, Session>();
  let participants: Participant[] = [];
  try {
    const data: unknown = JSON.parse(await readFile(resolve('participants.local.json'), 'utf8'));
    if (!Array.isArray(data) || !data.every(p => typeof p.keyHash === 'string' && typeof p.participantId === 'string' && ['reactive', 'proactive'].includes(p.condition))) throw new Error('Invalid participant mapping.');
    participants = data;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (developerEnabled) participants.push(
    { keyHash: hash('DEMO-R7K2'), participantId: randomUUID(), condition: 'reactive' },
    { keyHash: hash('DEMO-P9M4'), participantId: randomUUID(), condition: 'proactive' },
  );
  function authenticated(request: IncomingMessage) {
    const token = request.headers.authorization?.replace(/^Bearer /, '') ?? '';
    const session = sessions.get(token);
    if (!session) throw new HttpError(401, 'Enter your participant key to begin.');
    return session;
  }
  const reply = (response: ServerResponse, status: number, value: unknown) => {
    response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    response.end(JSON.stringify(value));
  };
  async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
    let text = '';
    for await (const chunk of request) {
      text += chunk.toString();
      if (Buffer.byteLength(text) > 32_768) throw new HttpError(413, 'Request too large.');
    }
    try { const data = JSON.parse(text); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); return data; }
    catch { throw new HttpError(400, 'Invalid request.'); }
  }
  function context(data: Record<string, unknown>, session: Session): GuidanceContext {
    const value = data.context as LearnerContext | undefined;
    if (!value || !['pretest', 'treadmill', 'introduction', 'formula', 'posttest'].includes(value.stage)
      || !helpTargets.includes(value.target) || !['setup', 'prediction', 'exploration'].includes(value.phase)) throw new HttpError(400, 'Invalid context.');
    const drafts: LearnerContext['drafts'] = {};
    const outcomes: LearnerContext['outcomes'] = {};
    for (const field of fields) {
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
      interactiveControl = { id: value.target as NonNullable<LearnerContext['interactiveControl']>['id'], label: parameterDefinitions[id].name, value: parameters[id], unit: parameterDefinitions[id].unit };
    }
    return { stage: value.stage as Stage, phase: value.phase, target: value.target, drafts, outcomes, parameters, treadmill, interactiveControl, recentInteractions,
      elapsedMs: Math.max(0, Number(value.elapsedMs) || 0), timeWithoutProgressMs: Math.max(0, Number(value.timeWithoutProgressMs) || 0),
      priorGuidance: session.guidance.filter(m => relevant.includes(m.target)).slice(-3).map(m => ({ target: m.target as GuidanceContext['target'], message: m.message })),
      checkedAnswers: session.checks.filter(check => relevant.includes(check.field) && (check.field === field || value.target.endsWith('scene'))).slice(-4)
        .map(check => ({ ...check, text: check.text.slice(0, 1000), diagnostics: check.diagnostics.slice(0, 3) })),
      condition: session.info.condition, thinkingTime: session.settings.thinkingTime };
  }
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (url.pathname === '/api/session' && request.method === 'POST') {
        const data = await body(request);
        const participant = participants.find(p => p.keyHash === hash(typeof data.key === 'string' ? data.key : ''));
        if (!participant) throw new HttpError(400, 'This key was not recognized. Check the key provided for your session.');
        const settings = defaults();
        const info: SessionInfo = { sessionId: randomUUID(), participantId: participant.participantId, condition: participant.condition,
          skipSeconds: settings.skipSeconds, thinkingTime: settings.thinkingTime, aiMode: 'development' };
        const token = randomBytes(32).toString('hex');
        sessions.set(token, { info, settings, checks: [], guidance: [] });
        reply(response, 200, { token, session: info }); return;
      }
      if (url.pathname.startsWith('/api/')) {
        const session = authenticated(request);
        if (url.pathname === '/api/session' && request.method === 'GET') {
          reply(response, 200, { ...session.info, skipSeconds: session.settings.skipSeconds, thinkingTime: session.settings.thinkingTime }); return;
        }
        if (url.pathname === '/api/evaluate' && request.method === 'POST') {
          const data = await body(request);
          if (!fields.includes(data.field as EvaluationRequest['field']) || typeof data.text !== 'string' || data.text.length > 2000 || !Number.isInteger(data.revision)) throw new HttpError(400, 'Invalid answer.');
          const submitted: EvaluationRequest = { field: data.field as EvaluationRequest['field'], text: data.text, revision: data.revision as number };
          // Only this Check endpoint invokes the evaluator. Diagnostics remain server-side.
          const result = await developmentEvaluator(() => session.settings).evaluate(submitted);
          session.checks.push({ ...submitted, ...result, at: Date.now() });
          session.checks = session.checks.slice(-24);
          reply(response, 200, { accepted: result.accepted, revision: submitted.revision, mode: 'development' }); return;
        }
        if (url.pathname === '/api/tutor' && request.method === 'POST') {
          const data = await body(request);
          const requested = data.requested === true;
          if (requested && session.info.condition !== 'reactive') throw new HttpError(403, 'Learner-requested guidance is unavailable in this condition.');
          if (!requested && session.info.condition !== 'proactive') throw new HttpError(403, 'Automatic guidance is unavailable in this condition.');
          const snapshot = context(data, session);
          if (requested && !controlTargets.includes(snapshot.target as typeof controlTargets[number])) throw new HttpError(400, 'Choose an interactive control for guidance.');
          const result = await developmentTutor(() => session.settings).assess(snapshot, requested);
          if (result.decision === 'help') { session.guidance.push({ target: result.target, message: result.message }); session.guidance = session.guidance.slice(-4); }
          reply(response, 200, result); return;
        }
        if (url.pathname === '/api/developer') {
          if (!developerEnabled) throw new HttpError(404, 'Not found.');
          if (request.method === 'PATCH') {
            const data = await body(request);
            if (typeof data.skipSeconds !== 'number' || data.skipSeconds < 1 || data.skipSeconds > 3600
              || !['short', 'balanced', 'extended'].includes(String(data.thinkingTime))
              || !['auto', 'accept', 'reject', 'technical-error'].includes(String(data.evaluator))
              || !['auto', 'help', 'wait', 'technical-error'].includes(String(data.tutor))) throw new HttpError(400, 'Invalid development settings.');
            session.settings = data as unknown as DeveloperSettings;
          }
          reply(response, 200, { settings: session.settings, session: session.info, checks: session.checks, guidance: session.guidance }); return;
        }
        throw new HttpError(404, 'Not found.');
      }
      if (request.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
      if (url.pathname === '/developer' && !developerEnabled) throw new HttpError(404, 'Not found.');
      const root = resolve('dist');
      const pathname = decodeURIComponent(url.pathname);
      const filename = resolve(root, pathname === '/' || pathname === '/developer' ? 'index.html' : '.' + pathname);
      if (!filename.startsWith(root + sep)) throw new HttpError(404, 'Not found.');
      let content: Buffer;
      try { content = await readFile(filename); } catch { throw new HttpError(404, 'Build the application with npm run build, or use npm run dev.'); }
      const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
      response.writeHead(200, { 'content-type': (types[extname(filename)] ?? 'application/octet-stream') + '; charset=utf-8', 'x-content-type-options': 'nosniff' });
      response.end(content);
    } catch (error) {
      const known = error instanceof HttpError;
      reply(response, known ? error.status : 503, { message: known ? error.message : 'The service could not respond. Please try again.' });
    }
  });
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const server = await createActivityServer();
  const port = Number(process.env.PORT) || 3001;
  server.listen(port, '127.0.0.1', () => console.log(`Activity API: http://127.0.0.1:${port} · AI development substitutes only`));
}
