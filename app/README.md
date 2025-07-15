# Gorlami Tauri App

This is the desktop application for Gorlami, built with Tauri v2, React, and TypeScript.

## Prerequisites

- Node.js 18+ and pnpm
- Rust 1.75+
- Xcode (for macOS development)

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

Run the app in development mode with hot-reload:

```bash
pnpm tauri dev
```

This will:
1. Start the Vite dev server on http://localhost:1420
2. Build and run the Tauri app
3. Watch for changes in both frontend and Rust code

### Building

Build the app for production:

```bash
pnpm tauri build
```

## Project Structure

```
app/
├── src/                    # React frontend
│   ├── components/        # React components
│   │   └── ProcessingOverlay.tsx  # Recording status overlay
│   ├── App.tsx           # Main app component
│   ├── App.css          # Global styles
│   └── main.tsx         # React entry point
├── src-tauri/           # Rust backend
│   ├── src/
│   │   ├── audio.rs     # Audio recording (full implementation)
│   │   ├── simple_audio.rs  # Simplified audio (currently used)
│   │   ├── shortcuts.rs # Global shortcuts manager
│   │   ├── tray.rs      # System tray/menu bar
│   │   ├── lib.rs       # Main app logic
│   │   └── main.rs      # Entry point
│   ├── Cargo.toml       # Rust dependencies
│   └── tauri.conf.json  # Tauri configuration
├── public/              # Static assets
├── index.html           # HTML template
├── package.json         # Node dependencies
├── tsconfig.json        # TypeScript config
└── vite.config.ts       # Vite bundler config
```

## Available Scripts

```bash
# Development
pnpm dev              # Start Vite dev server only
pnpm tauri dev        # Run full Tauri app in development

# Building
pnpm build            # Build frontend assets
pnpm tauri build      # Build production app
```

## Key Features

### System Tray
- Located in `src-tauri/src/tray.rs`
- Creates menu bar icon with dropdown menu
- Shows connection status and user info
- Handles quit, settings, and shortcuts actions

### Global Shortcuts
- Located in `src-tauri/src/shortcuts.rs`
- Default shortcuts:
  - `⌘+Ctrl+Space`: Start/stop recording
  - `⌘+Ctrl+E`: Edit mode (planned)
- Configurable via settings (coming soon)

### Audio Recording
- Located in `src-tauri/src/simple_audio.rs`
- Manages recording state
- Emits events for UI updates
- Ready for WebSocket streaming integration

### Processing Overlay
- Located in `src/components/ProcessingOverlay.tsx`
- Shows transparent overlay when recording
- Positioned in top-right corner
- Smooth fade animations

## Configuration

### Tauri Config (`src-tauri/tauri.conf.json`)
- App metadata (name, version, identifier)
- Window settings (transparent, always on top)
- Bundle configuration
- macOS-specific settings

### Permissions (`src-tauri/capabilities/default.json`)
- Core permissions
- Global shortcut permissions
- Required for system-wide hotkeys

## Development Tips

### Hot Reload
- Frontend changes reload instantly
- Rust changes trigger rebuild (slower)
- Use `cargo watch` for faster Rust development

### Debugging
- Open DevTools: Right-click in app window
- Rust logs: Check terminal output
- Use `println!` for Rust debugging
- Use `console.log` for JavaScript debugging

### macOS Specific
- App runs as menu bar only (no dock icon)
- Requires accessibility permissions for global shortcuts
- Transparent window support enabled

## Troubleshooting

### Build Issues
```bash
# Clean build artifacts
cargo clean
rm -rf node_modules
pnpm install
```

### Permission Issues
- Grant accessibility permissions for shortcuts
- Grant microphone permissions for recording
- Check System Preferences → Security & Privacy

### Development Issues
- Port 1420 in use: Kill process or change port in vite.config.ts
- Rust compile errors: Update Rust with `rustup update`
- Module not found: Clear cache with `pnpm store prune`