import { join } from 'path';
import { existsSync } from 'fs';
import clientHtml from '@client/index.html';
import { loadConfig } from './config';
import { initDeviceDb } from './devices';
import { configApi } from './api/config';
import { devicesApi, devicesIdApi } from './api/devices';
import { sightingsApi } from './api/sightings';

const certPath = join(import.meta.dir, '..', '..', 'certs', 'cert.pem');
const keyPath = join(import.meta.dir, '..', '..', 'certs', 'key.pem');
const useTls = existsSync(certPath) && existsSync(keyPath);

const server = Bun.serve({
  port: 3000,
  development: process.env.NODE_ENV !== 'production',
  ...(useTls && {
    tls: {
      cert: Bun.file(certPath),
      key: Bun.file(keyPath),
    },
  }),
  routes: {
    '/': clientHtml,
    '/devices': clientHtml,
    '/api/config': configApi,
    '/api/devices': devicesApi,
    '/api/devices/:id': devicesIdApi,
    '/api/sightings': sightingsApi,
  },
  async fetch(req) {
    const pathname = new URL(req.url).pathname;
    const filename = pathname.split('/').filter(Boolean).pop() ?? '';
    if (
      filename.startsWith('index-') &&
      (filename.endsWith('.js') || filename.endsWith('.css')) &&
      !filename.includes('..')
    ) {
      const file = Bun.file(join(import.meta.dir, filename));
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            'Content-Type': filename.endsWith('.js')
              ? 'application/javascript'
              : 'text/css',
          },
        });
      }
    }
    if (pathname === '/favicon.ico') return new Response(null, { status: 204 });
    return new Response('Not Found', { status: 404 });
  },
});

await loadConfig();
await initDeviceDb();

const protocol = useTls ? 'https' : 'http';
console.log(`
  --------------------------------
          📡 btprox 
  --------------------------------
  server: ${protocol}://localhost:${server.port}
  environment: ${process.env.NODE_ENV ?? 'development'}
  --------------------------------
`);
