// Starts and stops a fixture-backed dev server on a private port, for the browser-driven
// scripts. Shared because getting the SHUTDOWN right is the whole difficulty, and two copies
// of it would drift.
//
// The first version leaked. `child.kill('SIGTERM')` was called correctly, but nothing waited
// for the child to die: the script exited immediately afterwards, vite was reparented to init,
// and it kept the port. That is self-blocking rather than merely untidy — the next run hits the
// port guard and reports "port in use", which looks like someone else's server rather than the
// previous run's own corpse.
//
// Two properties fix it. `detached: true` makes the child a process-group leader so the whole
// group can be signalled, catching anything vite spawns. And stop() AWAITS the exit, escalating
// to SIGKILL, so the port is provably released before the script returns.
import net from 'net';
import { spawn } from 'child_process';

const SIGKILL_AFTER_MS = 5000;

const isHostPortFree = (port, host) =>
  new Promise((resolve) => {
    const socket = net
      .connect({ port, host })
      .on('connect', () => {
        socket.destroy();
        resolve(false);
      })
      .on('error', () => resolve(true));
  });

// BOTH stacks, and the reason is a defect this actually caused rather than a precaution.
//
// This probed `127.0.0.1` while every consumer browses to `http://localhost:<port>`. On macOS
// `localhost` resolves to `::1` first, so a server listening on IPv6 ONLY — which is what Vite
// does in some projects — was invisible here: the probe connected to nothing on IPv4, reported
// the port free, and the guard below let the run proceed. Vite then failed to take the port, and
// the checks browsed to `localhost`, reached `::1`, and ran every assertion against A DIFFERENT
// APPLICATION that happened to be listening there.
//
// The failure that produced was inscrutable — an unsettled-top-level-await warning and exit 13,
// with the clear "port in use" message never printed, because the guard had already decided the
// port was free. Two separate investigations lost time to it before the cause was found.
//
// So: a port is free only when it is free on BOTH loopback addresses. Probing one stack while
// addressing the other is this project's recurring defect in miniature — a true answer about the
// wrong substrate.
export const isPortFree = async (port) =>
  (await isHostPortFree(port, '127.0.0.1')) && (await isHostPortFree(port, '::1'));

const waitForReady = async (url, timeoutMs = 40_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`fixture server did not come up at ${url}`);
};

export const startFixtureServer = async ({ port, readyPath = '/libraries' }) => {
  if (!(await isPortFree(port))) {
    throw new Error(
      `port ${port} is already in use. Either a previous run leaked it, or something else is ` +
        `there. This script will not touch a server it did not start — set the port env var to ` +
        `a free port, or clear the old process.`,
    );
  }

  const child = spawn(
    'node',
    ['node_modules/vite/bin/vite.js', '--port', String(port), '--strictPort'],
    { env: { ...process.env, VITE_MOCK: '1' }, stdio: 'ignore', detached: true },
  );

  // Last-resort net: if this script dies unexpectedly, take the group with it.
  const onExit = () => {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  };
  process.on('exit', onExit);

  try {
    await waitForReady(`http://localhost:${port}${readyPath}`);
  } catch (err) {
    await stopFixtureServer({ child, port, onExit });
    throw err;
  }

  return { child, port, onExit };
};

export const stopFixtureServer = async ({ child, port, onExit }) => {
  process.off('exit', onExit);
  const exited = new Promise((resolve) => child.once('exit', resolve));

  const signalGroup = (signal) => {
    try {
      // Negative pid: the whole process group, so anything vite spawned goes too.
      process.kill(-child.pid, signal);
    } catch {
      /* already gone */
    }
  };

  signalGroup('SIGTERM');
  const timer = setTimeout(() => signalGroup('SIGKILL'), SIGKILL_AFTER_MS);
  await exited;
  clearTimeout(timer);

  // Verify rather than assume: the port, not the process, is what the next run needs. A
  // process can be reaped while the socket lingers in TIME_WAIT on the listening address.
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (await isPortFree(port)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`port ${port} is still held after stopping the fixture server`);
};
