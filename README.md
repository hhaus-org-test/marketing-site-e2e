# H/HAUS marketing-site acceptance

Independent, read-only acceptance tests for the public Astro site in
[`hhaus-org/hhaus-org.github.io`](https://github.com/hhaus-org/hhaus-org.github.io).
The suite checks out one immutable 40-character source revision into a temporary
directory, installs that revision with `npm ci`, builds it, and certifies the
result without reading or changing a production working tree.

## Pinned candidate

- Source repository: `hhaus-org/hhaus-org.github.io`
- Source revision: `daee1537313aed1951c0c8df7281a154c0b79f3a`
- Source pull request: [hhaus-org/hhaus-org.github.io#1](https://github.com/hhaus-org/hhaus-org.github.io/pull/1)
- Test organization Linear project: [github.com/hhaus-org-test](https://linear.app/denman/project/githubcomhhaus-org-test-cb9b5d737f9f)
- Test organization GitHub Project: [hhaus-org-test project 1](https://github.com/orgs/hhaus-org-test/projects/1)

The fail-closed source and city contracts live under `contracts/`. Updating the
source revision or any city route requires a reviewed change in this repository;
the test runner never falls back to a branch name.

## Run the independent source acceptance suite

Node.js 22.12 or newer, Git, and network access to GitHub and npm are required.

```bash
npm ci --ignore-scripts
npm test
npm run test:live:pinned
```

`npm test` validates the JSON contracts, checks out the exact source revision in
an operating-system temporary directory, runs `npm ci --ignore-scripts` and
`npm run build` there, and verifies every expected static route and metadata
contract. The temporary checkout is removed after the run.

`npm run test:live:pinned` serves that independently built artifact on an
ephemeral loopback port and runs the same HTTP suite used for public origins.
`npm run verify` runs both source and HTTP acceptance.

## Run read-only live HTTP acceptance

The live suite performs GET requests only. It does not configure GitHub Pages,
Cloudflare, DNS, redirects, Workers, or any application endpoint.

```bash
BASE_URL=https://hhaus-org.github.io npm run test:live
# After the custom domain is deployed:
BASE_URL=https://hhaus.org npm run test:live
```

The live suite requires the deployed `hhaus-source-sha` metadata marker to equal
the immutable source revision in `contracts/source.json`. A reachable but stale
deployment fails acceptance.

## What is certified

- Astro is the framework; Jekyll, Hugo, React, and JSX/TSX source are rejected.
- The repository identity and exact source revision match the closed contract.
- Berlin, Medellín, Tokyo, London, São Paulo, CDMX, and Montréal have exact,
  non-overlapping host and route mappings.
- Root, locations, about, apply, 404, and all seven city pages are emitted.
- Every page has the shared header/footer, canonical and social metadata, and
  the exact source-SHA marker.
- Root and location pages contain the expected city names, domains, and links.
- Internal built links resolve, discovery files ship, and the `hhaus-orgso`
  typo cannot enter tracked source or built HTML.

Passing this repository proves the pinned source artifact. A live run against
the intended public origin is a separate deployment gate.
