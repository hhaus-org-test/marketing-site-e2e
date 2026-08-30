import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { preparePinnedSource } from './lib/source.mjs';

const contentTypes = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
});

const resolveRequestPath = (distRoot, pathname) => {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded === '/'
    ? 'index.html'
    : decoded.endsWith('/')
      ? `${decoded.slice(1)}index.html`
      : decoded.slice(1);
  const normalized = normalize(relative);
  if (normalized.startsWith(`..${sep}`) || normalized === '..') {
    throw new Error('path traversal rejected');
  }
  return join(distRoot, normalized);
};

const startServer = async (distRoot) => {
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== 'GET') {
        response.writeHead(405, { allow: 'GET' });
        response.end();
        return;
      }
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
      let target = resolveRequestPath(distRoot, requestUrl.pathname);
      try {
        if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
      } catch {
        target = join(distRoot, '404.html');
        response.statusCode = 404;
      }
      const body = await readFile(target);
      response.setHeader('content-type', contentTypes[extname(target)] ?? 'application/octet-stream');
      response.end(body);
    } catch (error) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(error instanceof Error ? error.message : 'internal error');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('loopback server did not expose a TCP port');
  return Object.freeze({
    baseUrl: `http://127.0.0.1:${address.port}/`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  });
};

const runLiveTests = (repositoryRoot, baseUrl) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['--test', 'tests/live-http.test.mjs'], {
    cwd: repositoryRoot,
    env: { ...process.env, BASE_URL: baseUrl },
    stdio: 'inherit',
  });
  child.once('error', reject);
  child.once('exit', (code, signal) => {
    if (code === 0) resolve();
    else reject(new Error(`live HTTP tests failed with ${signal ? `signal ${signal}` : `exit ${code}`}`));
  });
});

const candidate = await preparePinnedSource();
let server;
try {
  server = await startServer(candidate.distRoot);
  await runLiveTests(candidate.contracts.repositoryRoot, server.baseUrl);
} finally {
  await server?.close();
  await candidate.cleanup();
}
