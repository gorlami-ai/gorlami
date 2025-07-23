# Backend CLAUDE.md

This file provides guidance to Claude Code when working with the Express TypeScript backend.

## Overview
The backend is an Express.js server written in TypeScript that handles voice and text processing for the Gorlami app, integrating Deepgram for speech-to-text and Azure OpenAI for AI processing.

## Tech Stack
- **Runtime**: Node.js 22 LTS
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: Supabase Auth (JWT validation)
- **File Storage**: Supabase Storage
- **AI Services**: 
  - Deepgram SDK for speech-to-text
  - Azure OpenAI for text processing

## Development Commands
```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run development server
npm run dev

# Build for production
npm run build

# Type checking - ALWAYS run before committing
npm run typecheck

# Linting - ALWAYS run before committing
npm run lint
npm run lint:fix

# Database commands
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
```

## Project Structure
```
src/
├── controllers/     # Request handlers
├── middleware/      # Express middleware (auth, error, rate-limit)
├── routes/         # API route definitions
├── services/       # External service integrations
├── types/          # TypeScript type definitions
├── utils/          # Helper utilities
├── app.ts          # Express app configuration
└── index.ts        # Server entry point
```

## API Features
- **JWT authentication** via Supabase
- **Request logging** with Morgan
- **CORS configuration** for Tauri app
- **File uploads** with 10MB limit

## Coding Standards
- Use ES modules with `.js` extensions in imports
- Use async/await for all asynchronous operations
- Implement proper error handling with AppError class
- Use Zod for request validation
- Follow TypeScript strict mode rules
- Keep controllers thin, business logic in services
- Always run typecheck and lint before completing tasks
