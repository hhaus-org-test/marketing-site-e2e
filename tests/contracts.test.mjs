import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXPECTED_CITIES,
  assertExactContractIdentity,
  expectedPublicRoutes,
  loadContracts,
} from '../scripts/lib/contracts.mjs';

const contracts = await loadContracts();

test('source contract is closed around one immutable production revision', () => {
  assert.doesNotThrow(() => assertExactContractIdentity(contracts));
  assert.equal(contracts.source.source_revision, 'daee1537313aed1951c0c8df7281a154c0b79f3a');
  assert.equal(contracts.source.framework, 'astro');
  assert.equal(contracts.source.package_manager, 'npm');
  assert.equal(contracts.source.production_mutation_allowed, false);
});

test('route contract contains the seven exact requested cities in stable order', () => {
  assert.deepEqual(contracts.routes.cities, EXPECTED_CITIES);
  assert.equal(new Set(contracts.routes.cities.map(({ slug }) => slug)).size, 7);
  assert.equal(new Set(contracts.routes.cities.map(({ hostname }) => hostname)).size, 7);
  assert.equal(new Set(contracts.routes.cities.map(({ path }) => path)).size, 7);
});

test('city hosts are disjoint from fail-closed reserved application hosts', () => {
  const cityHosts = new Set(contracts.routes.cities.map(({ hostname }) => hostname));
  for (const hostname of contracts.routes.reserved_application_hosts) {
    assert.equal(cityHosts.has(hostname), false, `${hostname} overlaps a city host`);
  }
  assert.equal(contracts.routes.unknown_host_policy, 'fail_closed');
  assert.equal(contracts.routes.redirect_status, 308);
  assert.equal(contracts.routes.preserve_query, true);
});

test('public artifact route set is exact and bounded', () => {
  assert.deepEqual(expectedPublicRoutes(contracts.routes), [
    '/',
    '/locations/',
    '/about/',
    '/apply/',
    '/404/',
    '/locations/berlin/',
    '/locations/medellin/',
    '/locations/tokyo/',
    '/locations/london/',
    '/locations/sao-paulo/',
    '/locations/cdmx/',
    '/locations/montreal/',
  ]);
});
