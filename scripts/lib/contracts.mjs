import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));

export const EXPECTED_CITIES = Object.freeze([
  Object.freeze({ slug: 'berlin', name: 'Berlin', hostname: 'berlin.hhaus.org', path: '/locations/berlin/' }),
  Object.freeze({ slug: 'medellin', name: 'Medellín', hostname: 'medellin.hhaus.org', path: '/locations/medellin/' }),
  Object.freeze({ slug: 'tokyo', name: 'Tokyo', hostname: 'tokyo.hhaus.org', path: '/locations/tokyo/' }),
  Object.freeze({ slug: 'london', name: 'London', hostname: 'london.hhaus.org', path: '/locations/london/' }),
  Object.freeze({ slug: 'sao-paulo', name: 'São Paulo', hostname: 'sao-paulo.hhaus.org', path: '/locations/sao-paulo/' }),
  Object.freeze({ slug: 'cdmx', name: 'CDMX', hostname: 'cdmx.hhaus.org', path: '/locations/cdmx/' }),
  Object.freeze({ slug: 'montreal', name: 'Montréal', hostname: 'montreal.hhaus.org', path: '/locations/montreal/' }),
]);

const readJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8'));

const validate = (schema, value, label) => {
  const ajv = new Ajv({ allErrors: true, strict: true });
  const validator = ajv.compile(schema);
  if (!validator(value)) {
    const detail = ajv.errorsText(validator.errors, { separator: '; ' });
    throw new Error(`${label} rejected: ${detail}`);
  }
  return value;
};

export const loadContracts = async () => {
  const [source, sourceSchema, routes, routesSchema] = await Promise.all([
    readJson('contracts/source.json'),
    readJson('contracts/source.schema.json'),
    readJson('contracts/city-routes.json'),
    readJson('contracts/city-routes.schema.json'),
  ]);

  return Object.freeze({
    repositoryRoot,
    source: Object.freeze(validate(sourceSchema, source, 'source contract')),
    routes: Object.freeze(validate(routesSchema, routes, 'city route contract')),
  });
};

export const assertExactContractIdentity = ({ source, routes }) => {
  if (source.consumer_repository !== 'hhaus-org-test/marketing-site-e2e') {
    throw new Error('consumer repository identity drift');
  }
  if (source.source_repository !== 'hhaus-org/hhaus-org.github.io') {
    throw new Error('source repository identity drift');
  }
  if (!/^[0-9a-f]{40}$/.test(source.source_revision)) {
    throw new Error('source revision is not an immutable 40-character SHA');
  }
  if (source.production_mutation_allowed !== false || source.source_access !== 'read_only') {
    throw new Error('production write boundary was weakened');
  }
  if (JSON.stringify(routes.cities) !== JSON.stringify(EXPECTED_CITIES)) {
    throw new Error('seven-city route contract drift');
  }
};

export const expectedPublicRoutes = (routes) => Object.freeze([
  '/',
  '/locations/',
  '/about/',
  '/apply/',
  '/404/',
  ...routes.cities.map(({ path }) => path),
]);
