require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const PORT = process.env.PORT || 3000;
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

if (!NVIDIA_API_KEY) {
  console.error('Missing NVIDIA_API_KEY in .env');
  process.exit(1);
}

// Model preference chain — first working one is used
const MODEL_CHAIN = [
  'z-ai/glm-5.3-flash',
  'mistralai/mistral-nemotron',
  'nvidia/mistral-nemo-minitron-8b-8k-instruct',
  'nv-mistralai/mistral-nemo-12b-instruct',
  'ibm/granite-3.0-8b-instruct'
];

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
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

  const file = req.url === '/' ? '/jarvis-frontend.html' : req.url.split('?')[0];
  fs.readFile(path.join(__dirname, file), (err, data) => {
    if (err) return res.writeHead(404).end('Not found');
    const mime = file.endsWith('.html') ? 'text/html' : 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}).listen(PORT, () => console.log('Jarvis running on http://localhost:' + PORT));