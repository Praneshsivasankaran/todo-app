import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'docs', 'screenshots');
const PORT = 4173;
const DEBUG_PORT = 9333;
const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function serveDist() {
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
    const filePath = join(DIST, url.pathname === '/' ? 'index.html' : url.pathname);
    try {
      const data = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      const data = readFileSync(join(DIST, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    }
  });
  return new Promise((resolveServer) => server.listen(PORT, '127.0.0.1', () => resolveServer(server)));
}

function requestJson(url, options = {}) {
  return fetch(url, options).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  });
}

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

function dateKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function isoAt(offset, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 30, 0, 0);
  return d.toISOString();
}

function seedTasks() {
  const tasks = [
    ['Review app icon on phone', 0, true],
    ['Draft GitHub README', 0, true],
    ['Capture Play Store screenshots', 0, false],
    ['Write privacy policy notes', 1, false],
    ['Create beta GitHub release', 2, false],
    ['Clean release checklist', -1, true],
  ];

  for (let i = 2; i <= 13; i += 1) {
    tasks.push([`Completed beta prep ${i - 1}`, -i, true]);
  }

  return tasks.map(([text, offset, completed], index) => ({
    id: `demo-${index}`,
    text,
    date: dateKey(offset),
    completed,
    completedAt: completed ? isoAt(offset, 11 + (index % 5)) : null,
    createdAt: isoAt(offset, 8),
  }));
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.pending = new Map();
    this.events = new Map();
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)(msg);
        this.pending.delete(msg.id);
      } else if (msg.method && this.events.has(msg.method)) {
        this.events.get(msg.method)(msg.params);
      }
    });
  }

  async open() {
    await new Promise((resolveOpen) => this.ws.addEventListener('open', resolveOpen, { once: true }));
  }

  send(method, params = {}) {
    const id = this.id++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolveSend, reject) => {
      this.pending.set(id, (msg) => {
        if (msg.error) reject(new Error(msg.error.message));
        else resolveSend(msg.result);
      });
    });
  }

  once(method) {
    return new Promise((resolveEvent) => this.events.set(method, resolveEvent));
  }
}

async function main() {
  if (!existsSync(DIST)) throw new Error('dist/ is missing. Run npm run build first.');
  mkdirSync(OUT, { recursive: true });

  const server = await serveDist();
  const chromePath = CHROME_CANDIDATES.find(existsSync);
  if (!chromePath) throw new Error('Could not find Chrome or Edge.');

  const userDataDir = join(ROOT, '.tmp-chrome-screenshots');
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=430,932',
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    let version;
    for (let i = 0; i < 40; i += 1) {
      try {
        version = await requestJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        break;
      } catch {
        await wait(250);
      }
    }
    if (!version) throw new Error('Chrome DevTools endpoint did not start.');

    const target = await requestJson(`http://127.0.0.1:${DEBUG_PORT}/json/new?http://127.0.0.1:${PORT}`, { method: 'PUT' });
    const cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await wait(700);

    await cdp.send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('todo-user-v3', ${JSON.stringify(JSON.stringify({ name: 'Pranesh', memberSince: isoAt(-20) }))});
        localStorage.setItem('todo-theme-v3', 'light');
        localStorage.setItem('todo-tasks-v3', ${JSON.stringify(JSON.stringify(seedTasks()))});
      `,
    });

    const reloaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.reload');
    await reloaded;
    await wait(900);

    async function screenshot(name) {
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      writeFileSync(join(OUT, `${name}.png`), Buffer.from(shot.data, 'base64'));
      console.log(`wrote docs/screenshots/${name}.png`);
    }

    async function clickTab(label) {
      await cdp.send('Runtime.evaluate', {
        expression: `
          [...document.querySelectorAll('button')]
            .find((button) => button.textContent.trim().includes(${JSON.stringify(label)}))
            ?.click();
        `,
      });
      await wait(450);
    }

    await screenshot('today');
    await clickTab('Calendar');
    await screenshot('calendar');
    await clickTab('Streak');
    await screenshot('streak');
    await clickTab('Profile');
    await screenshot('profile');
  } finally {
    chrome.kill();
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
