import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { load } from 'cheerio';

const normalizeText = (value) => value.replace(/\s+/g, ' ').trim();

export const routeArtifactPath = (distRoot, route) => {
  if (route === '/') return join(distRoot, 'index.html');
  if (route === '/404/') return join(distRoot, '404.html');
  return join(distRoot, route.slice(1), 'index.html');
};

export const readBuiltRoute = async (distRoot, route) =>
  readFile(routeArtifactPath(distRoot, route), 'utf8');

export const assertNoForbiddenIdentity = (html, label) => {
  assert.doesNotMatch(html, /hhaus-orgso/i, `${label} contains the invalid organization typo`);
  assert.doesNotMatch(html, /Jekyll|Hugo/i, `${label} contains a legacy generator`);
};

export const assertSharedDocument = (html, { route, canonicalOrigin, sourceRevision }) => {
  assertNoForbiddenIdentity(html, route);
  const $ = load(html);
  const canonical = new URL(route, `${canonicalOrigin}/`).href;
  const description = $('meta[name="description"]').attr('content')?.trim();
  const title = $('title').text().trim();

  assert.match($('meta[name="generator"]').attr('content') ?? '', /^Astro v\d+/);
  assert.equal($('meta[name="hhaus-source-sha"]').attr('content'), sourceRevision);
  assert.ok(description, `${route} has no description`);
  assert.ok(title, `${route} has no title`);
  assert.equal($('link[rel="canonical"]').attr('href'), canonical);
  assert.equal($('meta[property="og:title"]').attr('content'), title);
  assert.equal($('meta[property="og:description"]').attr('content'), description);
  assert.equal($('meta[property="og:url"]').attr('content'), canonical);
  assert.equal($('meta[property="og:image"]').attr('content'), `${canonicalOrigin}/og.png`);
  assert.equal($('meta[name="twitter:card"]').attr('content'), 'summary_large_image');
  assert.equal($('header.site-header').length, 1);
  assert.equal($('nav[aria-label="Primary navigation"]').length, 1);
  assert.equal($('main#main-content').length, 1);
  assert.equal($('footer.site-footer').length, 1);
  assert.ok($('a[href="https://github.com/hhaus-org"]').length >= 1);
  assert.ok($('a[href="https://user.hhaus.org"]').length >= 1);
  assert.ok($('a[href="https://org.hhaus.org"]').length >= 1);
};

export const assertRootCities = (html, cities) => {
  const $ = load(html);
  for (const city of cities) {
    assert.equal($(`a[href="${city.path}"]`).length, 1, `root link missing: ${city.path}`);
    assert.match(normalizeText($('body').text()), new RegExp(city.name));
  }
};

export const assertCityDocument = (html, city) => {
  const $ = load(html);
  assert.equal(normalizeText($('h1').first().text()), city.name);
  assert.equal($(`a[href="https://${city.hostname}"]`).length, 1);
  assert.equal($(`a[href="/apply/?city=${city.slug}"]`).length, 1);
};

const collectFiles = async (root, relative = '') => {
  const entries = await readdir(join(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(root, child));
    if (entry.isFile()) files.push(child);
  }
  return files;
};

export const builtHtmlFiles = async (distRoot) =>
  (await collectFiles(distRoot)).filter((path) => path.endsWith('.html')).sort();

export const assertInternalLinksResolve = async (distRoot, route, html) => {
  const $ = load(html);
  const hrefs = $('a[href^="/"]').map((_, element) => $(element).attr('href')).get();
  for (const href of hrefs) {
    const pathname = new URL(href, 'https://hhaus.org').pathname;
    const target = pathname.endsWith('/')
      ? routeArtifactPath(distRoot, pathname)
      : join(distRoot, pathname.slice(1));
    await assert.doesNotReject(access(target), `${route} links to missing ${href}`);
  }
};
