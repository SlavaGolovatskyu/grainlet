/**
 * Publish Grainlet packages whose local version is not yet on npm.
 * Order: grainlet-vite → create-grainlet → grainlet → grainlet-adapters
 *
 *   npm run publish:libs
 *   npm run publish:libs -- --otp=123456
 *   npm run publish:libs -- --dry-run
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const PACKAGES = [
  { workspace: 'grainlet-vite', dir: 'packages/vite' },
  { workspace: 'create-grainlet', dir: 'packages/create-grainlet' },
  { workspace: 'grainlet', dir: 'packages/grain' },
  { workspace: 'grainlet-adapters', dir: 'packages/adapters' },
];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const otpArg = args.find((a) => a.startsWith('--otp='));
const otp = otpArg ? otpArg.slice('--otp='.length) : process.env.NPM_OTP;

function readLocalVersion(dir) {
  const pkg = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'));
  return { name: pkg.name, version: pkg.version };
}

function registryHasVersion(name, version) {
  const result = spawnSync(
    'npm',
    ['view', `${name}@${version}`, 'version', '--json'],
    { encoding: 'utf8', shell: true }
  );
  if (result.status !== 0) {
    const err = `${result.stderr || ''}${result.stdout || ''}`;
    if (/E404|404|Not found/i.test(err)) return false;
    // Network / auth errors — fail loud
    console.error(err.trim() || `npm view failed for ${name}@${version}`);
    process.exit(1);
  }
  const out = (result.stdout || '').trim();
  if (!out || out === 'null') return false;
  try {
    const parsed = JSON.parse(out);
    return parsed === version || parsed === `"${version}"`;
  } catch {
    return out.replace(/^"|"$/g, '') === version;
  }
}

function publish(workspace) {
  const cmdArgs = ['publish', '-w', workspace, '--access', 'public'];
  if (dryRun) cmdArgs.push('--dry-run');
  if (otp) cmdArgs.push(`--otp=${otp}`);

  console.log(`\n→ npm ${cmdArgs.join(' ')}`);
  const result = spawnSync('npm', cmdArgs, {
    cwd: root,
    encoding: 'utf8',
    shell: true,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

let published = 0;
let skipped = 0;

for (const { workspace, dir } of PACKAGES) {
  const { name, version } = readLocalVersion(dir);
  const exists = registryHasVersion(name, version);

  if (exists) {
    console.log(`skip  ${name}@${version} (already on npm)`);
    skipped += 1;
    continue;
  }

  console.log(`publish ${name}@${version}`);
  publish(workspace);
  published += 1;
}

console.log(`\nDone. published=${published} skipped=${skipped}${dryRun ? ' (dry-run)' : ''}`);
