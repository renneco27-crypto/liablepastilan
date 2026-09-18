@"
# Jarvis

Voice-controlled AI assistant for Windows. Uses Chrome Web Speech API for STT, NVIDIA NIM for the LLM brain, and Piper for TTS. Supports running Piper locally or offloading to Google Colab via ngrok.

## Setup

1. Run ``setup.bat`` as Administrator (installs Git, Node, Python, npm deps)
2. Copy ``.env.example`` to ``.env`` and fill in:
   - ``NVIDIA_API_KEY`` from https://build.nvidia.com
   - ``JARVIS_SECRET`` - any long random string
   - ``PIPER_MODE`` - ``local`` or ``colab``
   - ``COLAB_URL`` - your ngrok URL if using Colab
3. Start: ``node jarvis-server.js``
4. Open http://localhost:3000 in Chrome

## Files

- ``jarvis-frontend.html`` - UI + voice loop
- ``jarvis-server.js`` - HTTP server, NVIDIA proxy, PowerShell executor
- ``piper-server.js`` - local Piper TTS wrapper
- ``setup.bat`` - one-time installer
- ``start-jarvis.bat`` - launcher

## Safety

The ``/run`` endpoint uses a whitelist. Commands like ``Remove-Item``, ``format``, and ``Invoke-Expression`` are blocked.
"@ | Set-Content README.md