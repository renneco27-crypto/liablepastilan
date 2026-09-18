const http = require('http');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const PIPER_EXE = 'C:\\piper\\piper.exe';
const PIPER_MODEL = 'C:\\piper\\voices\\jarvis-high.onnx';
const PORT = 5001;

if (!fs.existsSync(PIPER_EXE)) { console.error('piper.exe not found'); process.exit(1); }
if (!fs.existsSync(PIPER_MODEL)) { console.error('Model not found'); process.exit(1); }

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, model: true }));
  }

  if (req.method === 'POST' && req.url === '/tts') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      let text = '';
      try { text = (JSON.parse(body).text || '').slice(0, 500); } catch (e) {}
      if (!text.trim()) { res.writeHead(400).end('empty'); return; }

      const outFile = path.join(os.tmpdir(), 'jarvis-' + Date.now() + '.wav');
      const piper = spawn(PIPER_EXE, ['--model', PIPER_MODEL, '--output_file', outFile]);

      piper.stdin.write(text);
      piper.stdin.end();

      let errBuf = '';
      piper.stderr.on('data', d => errBuf += d);

      piper.on('close', code => {
        if (code !== 0) {
          console.error('piper failed:', errBuf);
          res.writeHead(500).end('piper failed');
          return;
        }
        fs.readFile(outFile, (err, data) => {
          fs.unlink(outFile, () => {});
          if (err) { res.writeHead(500).end('read error'); return; }
          res.writeHead(200, { 'Content-Type': 'audio/wav' });
          res.end(data);
        });
      });
    });
    return;
  }

  res.writeHead(404).end('Not found');
}).listen(PORT, () => console.log('Piper TTS running on http://localhost:' + PORT));