/**
 * Real-time headless-browser test for tools/audio_test.html.
 *
 * Starts a tiny HTTP server, launches headless Chrome with CDP, opens
 * audio_test.html?selftest=1 (which taps the master limiter with an
 * AnalyserNode), waits for the in-page self test, and prints its report.
 * Unlike --virtual-time-budget this uses the real audio clock, so the
 * measured levels are actual synthesized signal.
 *
 *   node tools/audio_browser_test.mjs
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8791;
const CDP_PORT = 9333;
const CHROME =
  process.env.CHROME_BIN ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* --------------------------- tiny static server --------------------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
};

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT)) throw new Error('outside root');
    const data = fs.readFileSync(file);
    res.writeHead(200, {
      'content-type': MIME[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
});

async function waitFor(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      /* not up yet */
    }
    await sleep(120);
  }
  throw new Error(`timed out waiting for ${url}`);
}

function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const events = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    } else if (msg.method) {
      events.push(msg);
    }
  });
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  return {
    ready,
    events,
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    },
  };
}

async function main() {
  await new Promise((resolve, reject) => {
    server.listen(PORT, '127.0.0.1', resolve);
    server.on('error', reject);
  });

  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--mute-audio',
      '--autoplay-policy=no-user-gesture-required',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=/tmp/bbd-cdp-${process.pid}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  let cdp = null;
  const consoleErrors = [];
  try {
    const version = await waitFor(`http://127.0.0.1:${CDP_PORT}/json/version`);
    const target = await (
      await fetch(
        `http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(
          `http://127.0.0.1:${PORT}/tools/audio_test.html?selftest=1`,
        )}`,
        { method: 'PUT' },
      )
    ).json();

    cdp = connectCdp(target.webSocketDebuggerUrl);
    await cdp.ready;
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');

    const deadline = Date.now() + 60000;
    let state = '';
    while (Date.now() < deadline) {
      const res = await cdp.send('Runtime.evaluate', {
        expression: "(document.body && document.body.dataset.selftest) || ''",
        returnByValue: true,
      });
      state = res.result?.value || '';
      if (state === 'pass' || state === 'fail') break;
      await sleep(400);
    }

    for (const ev of cdp.events) {
      if (ev.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(
          ev.params?.exceptionDetails?.exception?.description ||
            ev.params?.exceptionDetails?.text ||
            'exception',
        );
      }
      if (
        ev.method === 'Runtime.consoleAPICalled' &&
        ev.params?.type === 'error'
      ) {
        consoleErrors.push(
          (ev.params.args || [])
            .map((a) => a.value ?? a.description ?? '')
            .join(' '),
        );
      }
    }

    const report = await cdp.send('Runtime.evaluate', {
      expression:
        "(document.getElementById('selftest')?.textContent || '') + '\\n---TITLE---\\n' + document.title",
      returnByValue: true,
    });
    const text = report.result?.value || '';
    console.log(text);
    if (consoleErrors.length) {
      console.log('--- browser console errors ---');
      console.log(consoleErrors.join('\n'));
    }

    const failed =
      state !== 'pass' ||
      !text.includes('AUDIO_SELFTEST_PASS') ||
      !text.includes('signal tap: ready') ||
      consoleErrors.length > 0;
    console.log(`audio_browser_test: ${failed ? 'FAIL' : 'PASS'}`);
    console.log(`  chrome: ${version.Browser}`);
    if (failed) process.exitCode = 1;
  } finally {
    if (cdp) cdp.close();
    chrome.kill('SIGTERM');
    server.close();
    await sleep(250);
  }
}

main().catch((err) => {
  console.error('audio_browser_test: ERROR');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
