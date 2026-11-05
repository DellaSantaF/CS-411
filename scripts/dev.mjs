import { spawn } from 'node:child_process';
const processes = [
  spawn(process.execPath, ['--env-file-if-exists=.env', '--watch', 'server/index.ts'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' }),
];
let stopping = false;
function close(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of processes) child.kill();
}
process.on('SIGINT', () => close());
process.on('SIGTERM', () => close());
for (const child of processes) {
  child.on('exit', code => close(code ?? 0));
  child.on('error', error => { console.error(error.message); close(1); });
}
