require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const PORT = process.env.PORT || 3000;
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const COLAB_URL = process.env.COLAB_URL || '';
const JARVIS_SECRET = process.env.JARVIS_SECRET || '';
const PIPER_MODE = process.env.PIPER_MODE || 'local';

if (!NVIDIA_API_KEY) {
  console.error('Missing NVIDIA_API_KEY in .env');
  process.exit(1);
}

const MODEL_CHAIN = [
  'z-ai/glm-5.3-flash',
  'mistralai/mistral-nemotron',
  'nvidia/mistral-nemo-minitron-8b-8k-instruct',
  'nv-mistralai/mistral-nemo-12b-instruct',
  'ibm/granite-3.0-8b-instruct'
];

const ALLOWED_PREFIXES = [
  'start-process', 'stop-process', 'get-', 'dir', 'ls',
  'echo', 'type ', 'copy ', 'move ', 'mkdir', 'cd ',
  'where ', 'ipconfig', 'ping ', 'tasklist', 'taskkill'
];
const BLOCKED_PATTERNS = [
  /remove-item/i,
  /rm\s+-rf/i,
  /format-volume/i,
  /reg\s+delete/i,
  /invoke-webrequest/i,
  /invoke-expression/i,
  /\biex\b/i,
  /set-executionpolicy/i,
  /new-localuser/i,
  /net\s+user/i,
  /shutdown/i,
  /restart-computer/i,
  /start-process\s+(powershell|cmd|pwsh)/i,
];

function isCommandSafe(cmd) {
  if (!cmd || typeof cmd !== 'string') return false;
  const lower = cmd.toLowerCase().trim();
  for (const p of BLOCKED_PATTERNS) if (p.test(lower)) return false;
  return ALLOWED_PREFIXES.some(p => lower.startsWith(p));
}

function forwardTTS(text) {
  return new Promise((resolve, reject) => {
    const target = (PIPER_MODE === 'colab' && COLAB_URL)
      ? `${COLAB_URL}/tts`
      : 'http://localhost:5001/tts';
    const u = new URL(target);
    const body = JSON.stringify({ text });
    const lib = u.protocol === 'https:' ? https : http;

    const req = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Jarvis-Secret': JARVIS_SECRET,
        'ngrok-skip-browser-warning': 'true'
      }
    }, r => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => resolve({
        status: r.statusCode,
        contentType: r.headers['content-type'] || 'audio/wav',
        buffer: Buffer.concat(chunks)
      }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Jarvis-Secret');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'invalid json' }));
      }

      let lastErr = null, lastStatus = 502;
      for (const model of MODEL_CHAIN) {
        try {
          parsed.model = model;
          const r = await fetch(API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + NVIDIA_API_KEY,
              'Accept': 'application/json'
            },
            body: JSON.stringify(parsed)
          });
          const t = await r.text();
          if (r.status === 410 || r.status === 404) {
            console.log('[skip] ' + model + ' (' + r.status + ')');
            lastErr = t; lastStatus = r.status;
            continue;
          }
          console.log('[ok] ' + model);
          res.writeHead(r.status, { 'Content-Type': 'application/json' });
          return res.end(t);
        } catch (e) {
          lastErr = JSON.stringify({ error: e.message });
          lastStatus = 502;
        }
      }
      res.writeHead(lastStatus, { 'Content-Type': 'application/json' });
      res.end(lastErr || JSON.stringify({ error: 'all models unavailable' }));
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/tts') {
    try {
      const raw = await readBody(req);
      const { text } = JSON.parse(raw);
      const out = await forwardTTS(text);
      res.writeHead(out.status, { 'Content-Type': out.contentType });
      return res.end(out.buffer);
    } catch (e) {
      console.error('TTS error:', e.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // ═══ POST /run — proxy to Colab (which forwards to WinReach) ═══
  if (req.method === 'POST' && req.url === '/run') {
    const raw = await readBody(req);
    try {
      const r = await fetch(`${COLAB_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Jarvis-Secret': JARVIS_SECRET
        },
        body: raw
      });
      const data = await r.text();
      res.writeHead(r.status, { 'Content-Type': 'application/json' });
      return res.end(data);
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  const file = req.url === '/' ? '/jarvis-frontend.html' : req.url.split('?')[0];
  fs.readFile(path.join(__dirname, file), (err, data) => {
    if (err) return res.writeHead(404).end('Not found');
    const mime = file.endsWith('.html') ? 'text/html' : 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}).listen(PORT, () => console.log('Jarvis running on http://localhost:' + PORT));