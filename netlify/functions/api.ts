import { createActivityHandler } from '../../server/activity.ts';
import { blobStorage } from '../../server/storage.ts';
import { resolve } from 'node:path';
import { providersFromEnvironment } from '../../server/ai/providers.ts';

export default async (request: Request) => {
  try {
    const handler = await createActivityHandler({ storage: blobStorage(), loadLocalMapping: false, developerEnabled: false,
      providers: await providersFromEnvironment(resolve('magnus_effect_physics_reference.md')) });
    const url = new URL(request.url);
    if (url.pathname.startsWith('/.netlify/functions/api/')) {
      url.pathname = url.pathname.replace('/.netlify/functions/api/', '/api/');
      request = new Request(url, request);
    }
    return await handler(request);
  } catch (error) {
    console.error('Activity initialization failed', { type: error instanceof Error ? error.name : 'unknown' });
    return Response.json({ code: 'attempt_ended', message: 'The service is unavailable. Please contact the researcher.' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
};
