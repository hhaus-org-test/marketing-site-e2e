# Repository agent instructions

Follow the organization-wide guidance in
[`ORESoftware/my-ai/AGENTS.md`](https://github.com/ORESoftware/my-ai/blob/main/AGENTS.md)
and its semantic Git procedures in `original-agents.md`.

- This repository is the canonical external acceptance harness
  `hhaus-org-test/marketing-site-e2e`.
- Treat `hhaus-org/hhaus-org.github.io` as read-only production source. Check out
  only the immutable revision in `contracts/source.json` into a temporary
  directory; never edit a production checkout from this suite.
- Keep the repository/source identity and city route contracts fail-closed.
  Contract changes require an explicit feature branch and pull request.
- Live tests are GET-only. Never mutate DNS, Cloudflare, GitHub Pages, domains,
  redirects, Workers, repositories, accounts, or application data.
- Do not add Jekyll, Hugo, React, JSX, or TSX. The source under test is Astro and
  this consumer uses small ESM modules with explicit inputs and outputs.
- Keep all npm versions exact and commit only resolver-generated
  `package-lock.json`. Install with `npm ci --ignore-scripts`.
- Keep GitHub Actions permissions at `contents: read`, pin actions by full SHA,
  disable persisted checkout credentials, and use explicit timeouts.
- Do not commit credentials, cookies, `.env` files, response bodies containing
  personal data, or production-derived fixtures.
- Use feature branches. Commit explicit paths, fetch and semantically merge
  remote changes, push, and open or update a pull request. Never rebase, stash,
  reset, clean, force-push, or discard unfamiliar work.
- Project records:
  [Linear](https://linear.app/denman/project/githubcomhhaus-org-test-cb9b5d737f9f),
  [GitHub Project](https://github.com/orgs/hhaus-org-test/projects/1).

## Repository-local Git worktrees

- Create or use a Git worktree only when the human operator explicitly authorizes it for the current task. Concurrency or a dirty checkout is not permission by itself.
- Put every authorized worktree at `<repository-root>/tmp/worktrees/<name>`; from the repository root, use `./tmp/worktrees/<name>`. Never place worktrees beside repositories or organization directories.
- Keep `tmp`, `temp`, `tmp/worktrees`, and `temp/worktrees` ignored in the repository-root `.gitignore`. Do not commit files from those directories.
- Relocate or remove a worktree only when the operator explicitly requests it. Before removal, preserve and publish intended changes, verify its commit is represented on the target branch, and confirm there are no tracked, untracked, ignored-sensitive, or in-use files that must survive. Remove it with `git worktree remove <path>` without `--force`; never delete a worktree directory with `rm`.
