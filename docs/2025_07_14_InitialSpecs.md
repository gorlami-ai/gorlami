---
title: "Initial specifications"
date: 2025-07-12
tags:
  - AI Voice
authors:
  - name: Gustav
---
# Contextual Voice AI Assistant

## 1. Overview & Development Stages

A voice‑driven macOS assistant that not only transcribes spoken notes, but uses AI to understand, structure, edit, and augment your content in real time—while passively gathering contextual data (apps, documents, browser pages) to provide deeper, personalized assistance. Vision is to be the #1 mac ai assistant. Take over from claude, openai desktop, etc. Chat interface is slow and loses context

It will be developed in two stages:

**Stage 1: Live Transcription & Quick Rewrites**

- Instant push-to-talk transcription overlay.
- On-demand voice commands to transform raw text (formatting, bullet lists, tone edits).

**Stage 2: Context-Aware Enhancements**

- Background capture of active window content (text snippets, URLs, clipboard).
- AI uses screen context to enrich replies, summaries, and follow-up prompts.

**Stage 3:** RAG and document storage and sharing

- Organize and dump all you info in there (rag on your whole laptop)
- Get’s deep understanding without integrations

## 2. Objectives

- **Seamless capture:** One‑button or shortcut‑driven voice recording and live transcription.
- **Context awareness:** Automatically ingest on‑screen content (app, document, URL) to enrich understanding.
- **AI‑powered refinement:** Convert brain dumps into well‑structured, formatted text (emails, summaries, next‑step lists).
- **Bi‑directional editing:** Allow voice and text commands for updating, reformatting, and refining content.
- **Low friction:** Minimal setup; securely runs locally with optional encrypted cloud processing.

## 3. Key Use Cases / User Stories

- **Brain Dump to Outline:** “⌘+ctrl", speak thoughts, release → well formulated output”
- **Quick Email Reply:** “While viewing an email, press record → get a well formatted output from the seach”
- **Tone & Style:** “Highlight some random text. Convert this paragraph to professional tone” via voice command.

## 4. Functional Requirements

**Stage 1**

1. **Voice Capture & Transcription**
    - Push-to-talk recorder.
    - Live transcript overlay with semi-transparent background.
2. **Rewrite Commands (Send it to AI)**
    - Voice-triggered macros: bullet lists, headings, summaries, tone adjustments.
    - Keyboard shortcuts mirror voice commands.

**Stage 2**

1. **Context Engine**
    - Lightweight OCR/DOM scraper of active window.
    - Context API that augments transcription with on-screen data.

## 5. Simplified System Architecture

**macOS App (Tauri):**

- Menu bar icon + floating Siri‑style widget.
- Hotkey listener for recording and commands.

**Cloud STT Service (Whisper):**

- High‑speed, low‑latency transcription

**Cloud LLM Service (gpt-4o realtime or gemini live)**

- Contextual enrichment for stage 2
- Rewrite the text etc.

## 5. UI / Interaction

**Menu Bar Icon:** Always present; shows status.

**Floating Widget:** Pops from menu bar, semi‑transparent overlay for live transcript and quick actions.

**Overlay Controls:**

- Hold to record, hold and lock recording, rewrite/AI review