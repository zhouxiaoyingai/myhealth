import { spawn } from 'node:child_process';

const baseUrl = 'http://127.0.0.1:3000';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1'], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
});

let shuttingDown = false;

async function waitForServer(timeoutMs = 120_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(baseUrl, { cache: 'no-store' });
      if (response.ok || response.status < 500) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

function runPlaywright() {
  const command = process.platform === 'win32' ? 'node_modules\\.bin\\playwright.cmd' : 'node_modules/.bin/playwright';
  return new Promise((resolve) => {
    const child = spawn(command, ['test'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: baseUrl,
      },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

function stopServer() {
  if (shuttingDown) return;
  shuttingDown = true;

  if (!server.pid) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    server.kill('SIGTERM');
  }
}

process.on('SIGINT', () => {
  stopServer();
  process.exit(130);
});

process.on('SIGTERM', () => {
  stopServer();
  process.exit(143);
});

try {
  await waitForServer();
  const code = await runPlaywright();
  stopServer();
  process.exit(code);
} catch (error) {
  console.error(error);
  stopServer();
  process.exit(1);
}
