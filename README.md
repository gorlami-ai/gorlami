# Gorlami

Gorlami is a voice-driven AI assistant that uses AI to understand, structure, edit, and augment content in real time. It passively gathers contextual data (apps, documents, browser pages) to provide deeper, personalized assistance.

**Vision:** Become the #1 Mac AI assistant, replacing slower chat interfaces that lose context (Claude, OpenAI desktop, etc.)


## Core Features
- **Seamless capture:** One-button or shortcut-driven voice recording with live transcription
- **Context awareness:** Automatically ingest on-screen content to enrich understanding
- **AI-powered refinement:** Convert brain dumps into structured text (emails, summaries, action lists)
- **Bi-directional editing:** Voice and text commands for updating and refining content
- **Low friction:** Minimal setup with secure local processing and optional encrypted cloud support

## Key Use Cases
1. **Brain Dump to Outline:** Press ⌘+Ctrl+Space, speak thoughts, release → structured output
2. **Quick Email Reply:** While viewing email, record voice → formatted response
3. **Tone & Style Editing:** Highlight text and use voice command to change tone/style

## Getting Started

### Prerequisites

- macOS (currently macOS-only)
- Node.js 18+ and pnpm
- Python 3.13+ and Poetry
- Rust 1.75+ (for Tauri)

### Quick Start

1. **Start the backend**
   ```bash
   cd backend
   poetry install
   # ensure envs are sent
   poetry run start
   ```

2. **Start the app**
   ```bash
   cd app
   pnpm install
   pnpm tauri dev
   ```

3. **Use the app**
   - Look for the microphone icon in your menu bar
   - Press `⌘+Ctrl+Space` to start/stop recording
   - The processing overlay will appear in the top-right corner

## Development

### Project Structure
```
gorlami/
├── app/                    # Tauri desktop app
└── backend/               # Python FastAPI server
```

### Available Commands

#### Backend
```bash
cd backend
poetry run start          # Start the server (http://localhost:8000)
poetry run uvicorn main:app --reload  # Start with auto-reload
```

#### App
```bash
cd app
pnpm dev                  # Start Vite dev server only
pnpm tauri dev           # Run full app in development
pnpm build               # Build frontend assets
pnpm tauri build         # Build production app (.dmg for macOS)
```

#### Manual Testing Checklist
- [ ] App appears in menu bar
- [ ] Menu dropdown shows correct items
- [ ] ⌘+Ctrl+Space starts/stops recording
- [ ] Processing overlay appears when recording
- [ ] Backend connection status updates
- [ ] Microphone selection works

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request