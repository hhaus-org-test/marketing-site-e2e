import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { assertExactContractIdentity, loadContracts } from './contracts.mjs';

const execFileAsync = promisify(execFile);
const temporaryPrefix = 'hhaus-marketing-site-e2e-';

const run = async (command, args, options = {}) => {
  try {
    return await execFileAsync(command, args, {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      ...options,
    });
  } catch (error) {
    const stdout = error.stdout?.trim();
    const stderr = error.stderr?.trim();
    const detail = [stdout, stderr].filter(Boolean).join('\n');
    throw new Error(`${command} ${args.join(' ')} failed${detail ? `:\n${detail}` : ''}`, { cause: error });
  }
};

const removeTemporaryRoot = async (temporaryRoot) => {
  if (!basename(temporaryRoot).startsWith(temporaryPrefix)) {
    throw new Error(`refusing to remove unexpected path: ${temporaryRoot}`);
  }
  await rm(temporaryRoot, { recursive: true, force: true });
};

export const preparePinnedSource = async () => {
  const contracts = await loadContracts();
  assertExactContractIdentity(contracts);
  const { source } = contracts;
  const temporaryRoot = await mkdtemp(join(tmpdir(), temporaryPrefix));
  const sourceRoot = join(temporaryRoot, 'source');
  const sourceUrl = `https://github.com/${source.source_repository}.git`;

  try {
    await mkdir(sourceRoot);
    await run('git', ['init', '--quiet', sourceRoot]);
    await run('git', ['-C', sourceRoot, 'remote', 'add', 'origin', sourceUrl]);
    await run('git', ['-C', sourceRoot, 'fetch', '--quiet', '--depth=1', 'origin', source.source_revision]);
    await run('git', ['-C', sourceRoot, 'checkout', '--quiet', '--detach', 'FETCH_HEAD']);
    const { stdout } = await run('git', ['-C', sourceRoot, 'rev-parse', 'HEAD']);
    if (stdout.trim() !== source.source_revision) {
      throw new Error(`source checkout drift: expected ${source.source_revision}, got ${stdout.trim()}`);
    }

    await run('npm', ['ci', '--ignore-scripts'], { cwd: sourceRoot });
    await run('npm', ['run', 'build'], {
      cwd: sourceRoot,
      env: { ...process.env, PUBLIC_SOURCE_SHA: source.source_revision },
    });

    return Object.freeze({
      contracts,
      sourceRoot,
      distRoot: join(sourceRoot, 'dist'),
      temporaryRoot,
      cleanup: () => removeTemporaryRoot(temporaryRoot),
    });
  } catch (error) {
    await removeTemporaryRoot(temporaryRoot);
    throw error;
  }
};

export const runInPinnedSource = (sourceRoot, command, args, options = {}) =>
  run(command, args, { cwd: sourceRoot, ...options });
