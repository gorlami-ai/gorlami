# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Gorlami is a voice-driven AI assistant for macOS that captures voice input, provides live transcription, and uses AI to structure and enhance content in real-time. The vision is to become the #1 Mac AI assistant, replacing slower chat interfaces like Claude and OpenAI desktop apps.

### Development Stages
- **Stage 1**: Live transcription & quick rewrites (push-to-talk overlay, voice commands)
- **Stage 2**: Context-aware enhancements (background capture of active window content)
- **Stage 3**: RAG and document storage (organize all laptop data for deep understanding)

The system consists of two main components:

1. **Python FastAPI backend** (`/backend`) - Handles WebSocket connections, speech-to-text via Deepgram, and AI processing via Azure OpenAI
2. **Tauri macOS app** (`/app`) - Native desktop application with React frontend and Rust backend

### Tech Stack
- **Frontend**: Tauri + React 18.3.1 + TypeScript + Vite
- **Backend**: Python 3.13 + FastAPI + Poetry
- **AI Services**: Deepgram (STT), Azure OpenAI (LLM)
- **Communication**: WebSockets for real-time streaming

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
poetry run uvicorn main:app --reload    # Run FastAPI server (http://localhost:8000)
```

### Environment Setup
Create a `.env` file in `/backend` with:
```
DEEPGRAM_API_KEY=your_key_here
AZURE_OPENAI_ENDPOINT_URL=your_endpoint_here
AZURE_OPENAI_API_KEY=your_key_here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
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
5. Results are displayed in floating widget

### UI Components (Planned)
- **Menu Bar Icon**: Always present, shows status
- **Floating Widget**: Semi-transparent overlay that pops from menu bar for live transcript and quick actions
- **Push-to-talk Recorder**: Hold to record, hold and lock recording functionality
- **Voice Commands**: On-demand transforms (formatting, bullet lists, tone edits)

### Current State
- Basic project structure established
- Backend WebSocket infrastructure ready
- Frontend using default Tauri template (needs implementation)
- No tests, linting, or CI/CD configured yet

## General Principles
- Plan changes carefully and consider side effects
- Test thoroughly before reporting task completion
- Focus on areas specifically mentioned by the user
- Maintain separation between Tauri frontend and FastAPI backend
- Use WebSockets for all real-time communication