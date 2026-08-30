# Security policy

This repository contains a read-only public-site acceptance suite. Report a
security concern privately through GitHub's security-advisory interface for
`hhaus-org-test/marketing-site-e2e`.

Do not include credentials, cookies, private endpoint responses, customer or
resident information, decrypted environment files, or Cloudflare/GitHub tokens
in an issue, pull request, test fixture, trace, or log. If secret material is
found, do not reuse or copy it; notify an owner so it can be rotated.

The suite is intentionally incapable of deployment. Source acceptance clones a
public repository at an exact SHA into an OS temporary directory. Live
acceptance performs bounded HTTP GET requests to the explicit `BASE_URL` only.
DNS, Pages, Cloudflare, redirects, and application state are outside its write
boundary.
