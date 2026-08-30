import assert from 'node:assert/strict';
import test from 'node:test';
import { assertCityDocument, assertRootCities, assertSharedDocument } from '../scripts/lib/site-assertions.mjs';
import { assertExactContractIdentity, loadContracts } from '../scripts/lib/contracts.mjs';

const contracts = await loadContracts();
assertExactContractIdentity(contracts);

const baseUrl = (() => {
  if (!process.env.BASE_URL) throw new Error('BASE_URL is required for explicit live HTTP acceptance');
  const parsed = new URL(process.env.BASE_URL);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('BASE_URL must use HTTP or HTTPS');
  if (parsed.username || parsed.password) throw new Error('BASE_URL must not contain credentials');
  if (parsed.search || parsed.hash) throw new Error('BASE_URL must not contain a query or fragment');
  parsed.pathname = parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`;
  return parsed;
})();

const fetchHtml = async (route) => {
  const target = new URL(route.replace(/^\//, ''), baseUrl);
  const response = await fetch(target, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
    headers: { accept: 'text/html' },
  });
  assert.equal(response.status, 200, `${target} returned ${response.status}`);
  assert.match(response.headers.get('content-type') ?? '', /^text\/html\b/i);
  return response.text();
};

test('live root is the exact pinned Astro deployment and exposes all cities', async () => {
  const html = await fetchHtml('/');
  assertSharedDocument(html, {
    route: '/',
    canonicalOrigin: contracts.routes.canonical_origin,
    sourceRevision: contracts.source.source_revision,
  });
  assertRootCities(html, contracts.routes.cities);
});

for (const city of contracts.routes.cities) {
  test(`live ${city.name} route is the exact pinned Astro deployment`, async () => {
    const html = await fetchHtml(city.path);
    assertSharedDocument(html, {
      route: city.path,
      canonicalOrigin: contracts.routes.canonical_origin,
      sourceRevision: contracts.source.source_revision,
    });
    assertCityDocument(html, city);
  });
}
