import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const forbiddenName = /(?:^|\/)(?:\.env(?:\..*)?|id_rsa|id_ed25519|credentials\.json)$|\.(?:ma|mb|usd|usda|usdc|usdz|fbx|obj|blend\d*|psd|psb|spp|sbs|sbsar|ztl|zpr|exr|tx|pem|key|p12|pfx|bak|zip|7z)$/i;
const secretSignatures = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/,
];
const files = new Set();
const failures = [];
function walk(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      failures.push(`${relative(root, path)}: symbolic links are not allowed in public assets`);
    } else if (entry.isDirectory()) walk(path);
    else files.add(relative(root, path).replaceAll('\\', '/'));
  }
}
walk(join(root, 'public'));
try {
  for (const path of execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\0')) {
    if (path && existsSync(path)) files.add(path);
  }
} catch {
  // An extracted release may not include .git. Public assets are still checked.
}
for (const path of files) {
  if (forbiddenName.test(path)) failures.push(`${path}: private/source/archive filename`);
  const info = lstatSync(path);
  if (!info.isFile() || info.size > 2_000_000) continue;
  const bytes = readFileSync(path);
  if (bytes.includes(0)) continue;
  if (secretSignatures.some(pattern => pattern.test(bytes.toString('utf8')))) {
    failures.push(`${path}: possible credential or private key (value withheld)`);
  }
}
if (failures.length) {
  console.error('Publish safety check failed:\n' + failures.map(item => `- ${item}`).join('\n'));
  console.error('Remove private files from tracking/public before building. Rotate any real exposed credentials.');
  process.exitCode = 1;
} else {
  console.log(`Publish safety check passed (${files.size} tracked/public files checked).`);
}
