import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { expectedPublicRoutes } from '../scripts/lib/contracts.mjs';
import {
  assertCityDocument,
  assertInternalLinksResolve,
  assertRootCities,
  assertSharedDocument,
  builtHtmlFiles,
  readBuiltRoute,
  routeArtifactPath,
} from '../scripts/lib/site-assertions.mjs';
import { preparePinnedSource, runInPinnedSource } from '../scripts/lib/source.mjs';

let candidate;

before(async () => {
  candidate = await preparePinnedSource();
}, { timeout: 240_000 });

after(async () => {
  await candidate?.cleanup();
});

test('checked-out source has the exact remote identity, SHA, and Astro-only dependency boundary', async () => {
  const { stdout: head } = await runInPinnedSource(candidate.sourceRoot, 'git', ['rev-parse', 'HEAD']);
  const { stdout: remote } = await runInPinnedSource(candidate.sourceRoot, 'git', ['remote', 'get-url', 'origin']);
  const packageJson = JSON.parse(await readFile(join(candidate.sourceRoot, 'package.json'), 'utf8'));
  const lockfile = JSON.parse(await readFile(join(candidate.sourceRoot, 'package-lock.json'), 'utf8'));
  const packageNames = Object.keys(lockfile.packages ?? {});

  assert.equal(head.trim(), candidate.contracts.source.source_revision);
  assert.equal(remote.trim(), 'https://github.com/hhaus-org/hhaus-org.github.io.git');
  assert.equal(packageJson.dependencies.astro, '7.2.9');
  assert.equal(packageJson.private, true);
  assert.equal(Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies }).some((name) => /react/i.test(name)), false);
  assert.equal(Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies }).some((name) => /jekyll|hugo/i.test(name)), false);
  assert.equal(packageNames.some((name) => /node_modules\/(?:react|react-dom|@astrojs\/react)$/.test(name)), false);
});

test('tracked source has no Jekyll, Hugo, JSX, TSX, React integration, or invalid org typo', async () => {
  const forbiddenPaths = ['_config.yml', 'Gemfile', 'hugo.toml', 'hugo.yaml'];
  for (const path of forbiddenPaths) assert.equal(existsSync(join(candidate.sourceRoot, path)), false, `${path} exists`);
  assert.ok(existsSync(join(candidate.sourceRoot, 'public/.nojekyll')));

  const { stdout } = await runInPinnedSource(candidate.sourceRoot, 'git', ['ls-files', '-z']);
  const tracked = stdout.split('\0').filter(Boolean);
  assert.equal(tracked.some((path) => /[.](?:jsx|tsx)$/i.test(path)), false);
  assert.equal(tracked.some((path) => path === 'src/integrations/react.ts'), false);

  for (const path of tracked) {
    const buffer = await readFile(join(candidate.sourceRoot, path));
    if (buffer.includes(0)) continue;
    assert.doesNotMatch(buffer.toString('utf8'), /hhaus-orgso/i, `${path} contains the invalid organization typo`);
  }
});

test('production route manifest matches the independent seven-city contract exactly', async () => {
  const sourceContract = JSON.parse(await readFile(join(candidate.sourceRoot, 'config/city-routes.json'), 'utf8'));
  const projectedCities = candidate.contracts.routes.cities.map(({ hostname, path }) => ({ hostname, path }));
  assert.deepEqual(sourceContract, {
    schema_version: candidate.contracts.routes.schema_version,
    canonical_origin: candidate.contracts.routes.canonical_origin,
    redirect_status: candidate.contracts.routes.redirect_status,
    preserve_query: candidate.contracts.routes.preserve_query,
    unknown_host_policy: candidate.contracts.routes.unknown_host_policy,
    reserved_application_hosts: candidate.contracts.routes.reserved_application_hosts,
    cities: projectedCities,
  });
});

test('Astro emits exactly the bounded HTML route set', async () => {
  const expectedFiles = expectedPublicRoutes(candidate.contracts.routes)
    .map((route) => routeArtifactPath(candidate.distRoot, route).slice(candidate.distRoot.length + 1))
    .sort();
  assert.deepEqual(await builtHtmlFiles(candidate.distRoot), expectedFiles);
});

test('every built route has exact metadata, shared shell, links, and source marker', async () => {
  for (const route of expectedPublicRoutes(candidate.contracts.routes)) {
    const html = await readBuiltRoute(candidate.distRoot, route);
    assertSharedDocument(html, {
      route,
      canonicalOrigin: candidate.contracts.routes.canonical_origin,
      sourceRevision: candidate.contracts.source.source_revision,
    });
    await assertInternalLinksResolve(candidate.distRoot, route, html);
  }
});

test('root and location directory expose all seven exact cities', async () => {
  assertRootCities(await readBuiltRoute(candidate.distRoot, '/'), candidate.contracts.routes.cities);
  const directory = await readBuiltRoute(candidate.distRoot, '/locations/');
  for (const city of candidate.contracts.routes.cities) {
    assert.match(directory, new RegExp(`href="${city.path}"`));
    assert.ok(directory.includes(city.name), `directory missing ${city.name}`);
  }
});

test('each city artifact carries its exact name, hostname, and application route', async () => {
  for (const city of candidate.contracts.routes.cities) {
    assertCityDocument(await readBuiltRoute(candidate.distRoot, city.path), city);
  }
});

test('robots, sitemap, social image, and non-Jekyll marker ship in the artifact', async () => {
  const image = await readFile(join(candidate.distRoot, 'og.png'));
  assert.equal(image.toString('ascii', 1, 4), 'PNG');
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
  assert.ok(existsSync(join(candidate.distRoot, '.nojekyll')));
  assert.match(await readFile(join(candidate.distRoot, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/hhaus[.]org\/sitemap-index[.]xml/);

  const sitemapFiles = (await readdir(candidate.distRoot)).filter((name) => name.endsWith('.xml'));
  const sitemap = (await Promise.all(sitemapFiles.map((name) => readFile(join(candidate.distRoot, name), 'utf8')))).join('\n');
  for (const route of expectedPublicRoutes(candidate.contracts.routes).filter((route) => route !== '/404/')) {
    assert.ok(sitemap.includes(new URL(route, 'https://hhaus.org').href), `sitemap missing ${route}`);
  }
});
