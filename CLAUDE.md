# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About
Gorlami is a voice-driven AI assistant for macOS that captures voice input, provides live transcription, and uses AI to structure and enhance content in real-time. The vision is to become the #1 Mac AI assistant, replacing slower chat interfaces like Claude and OpenAI desktop apps.

## Architecture
The system consists of two main components:

1. **Python FastAPI backend** (`/backend`) - Handles WebSocket connections, speech-to-text via Deepgram, and AI processing via Azure OpenAI
2. **Tauri macOS app** (`/app`) - Native desktop application with React frontend and Rust backend. We are only developing for MacOS!

### Tech Stack
- **Frontend**: Tauri + React 18.3.1 + TypeScript + Vite
- **Backend**: Python 3.13 + FastAPI + Poetry
- **AI Services**: Deepgram (STT), Azure OpenAI (LLM)
- **Communication**: WebSockets for real-time streaming, and REST for others

### Project structure
```
gorlami/
├── app/                    # Tauri desktop app
│   ├── src/               # React frontend
│   ├── src-tauri/         # Rust backend
│   │   ├── src/          # Rust source code
│   │   └── Cargo.toml    # Rust dependencies
│   └── package.json      # Node dependencies
└── backend/               # Python FastAPI server
    ├── main.py           # WebSocket server
    └── pyproject.toml    # Python dependencies
```

## Commands

### Frontend Development
```bash
cd app
pnpm install          # Install dependencies
pnpm dev             # Start Vite dev server (http://localhost:1420)
pnpm tauri dev       # Run full Tauri app in development
pnpm build           # Build TypeScript and Vite
pnpm tauri build     # Build production app
```

### Backend Development
```bash
cd backend
poetry install                           # Install dependencies
poetry run start
```

## Key Implementation Areas

### WebSocket Communication
- Backend WebSocket endpoint: `/ws/transcribe` in `backend/main.py`
- Handles real-time audio streaming for transcription
- Frontend needs to implement WebSocket client in Tauri app

### Voice Recording Flow
1. User triggers recording via menu bar icon or hotkey (⌘+Ctrl)
2. Tauri captures audio and streams to backend via WebSocket
3. Backend processes audio through Deepgram for transcription
4. Transcribed text is sent to Azure OpenAI for enhancement
5. Results are pasted at cursor

## General Principles
- Plan changes carefully and consider side effects
- Test thoroughly before reporting task completion
- Focus on areas specifically mentioned by the user
- Maintain separation between Tauri frontend and FastAPI backend
- Use WebSockets for all real-time communication
- Use normal REST api for rest