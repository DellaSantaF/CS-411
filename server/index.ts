import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivityHandler } from './activity.ts';

export async function createActivityServer(options: Parameters<typeof createActivityHandler>[0] = {}) {
  const handler = await createActivityHandler(options);
  return createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url ?? '/', 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        const headers = new Headers();
        for (const [key, value] of Object.entries(incoming.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value);
        const request = new Request(url, { method: incoming.method, headers,
          ...(!['GET', 'HEAD'].includes(incoming.method ?? 'GET') ? { body: Readable.toWeb(incoming) as ReadableStream, duplex: 'half' } : {}) } as RequestInit);
        const response = await handler(request);
        outgoing.writeHead(response.status, Object.fromEntries(response.headers));
        outgoing.end(Buffer.from(await response.arrayBuffer())); return;
      }
      if (incoming.method !== 'GET' || (url.pathname === '/developer' && (options.developerEnabled ?? process.env.DEVELOPER_TOOLS !== '0') === false)) {
        outgoing.writeHead(404); outgoing.end('Not found.'); return;
      }
      const root = resolve('dist');
      const pathname = decodeURIComponent(url.pathname);
      const filename = resolve(root, ['/', '/developer', '/admin'].includes(pathname) ? 'index.html' : '.' + pathname);
      if (!filename.startsWith(root + sep)) throw new Error('Not found');
      const content = await readFile(filename);
      const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
      outgoing.writeHead(200, { 'content-type': (types[extname(filename)] ?? 'application/octet-stream') + '; charset=utf-8', 'x-content-type-options': 'nosniff' });
      outgoing.end(content);
    } catch { outgoing.writeHead(404); outgoing.end('Not found. Build with npm run build, or use npm run dev.'); }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const server = await createActivityServer();
  const port = Number(process.env.PORT) || 3001;
  server.listen(port, '127.0.0.1', () => console.log(`Activity API: http://127.0.0.1:${port} · AI mode: ${process.env.AI_MODE || 'development'}`));
}
