@"
# Jarvis

Voice-controlled AI assistant for Windows. Uses Chrome Web Speech API for STT, NVIDIA NIM for the LLM brain, and Piper for TTS. Supports running Piper locally or offloading to Google Colab via ngrok.

## Setup

1. Install dependencies: ``npm install``
2. Copy ``.env.example`` to ``.env`` and fill in:
   - ``NVIDIA_API_KEY`` from https://build.nvidia.com
   - ``JARVIS_SECRET`` — any long random string
   - ``PIPER_MODE`` — ``local`` or ``colab``
   - ``COLAB_URL`` — your ngrok URL if using Colab
3. Local mode: run ``node piper-server.js`` (needs ``C:\piper\piper.exe``)
4. Run ``node jarvis-server.js`` and open http://localhost:3000

## Files

- ``jarvis-frontend.html`` — UI + voice loop
- ``jarvis-server.js`` — HTTP server, NVIDIA proxy, PowerShell executor
- ``piper-server.js`` — local Piper TTS wrapper
- ``start-jarvis.bat`` — Windows launcher

## Safety

The ``/run`` endpoint uses a whitelist. Commands like ``Remove-Item``, ``format``, and ``Invoke-Expression`` are blocked.
"@ | Set-Content README.md