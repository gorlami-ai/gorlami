# Backend CLAUDE.md

This file provides guidance to Claude Code when working with the Express TypeScript backend.

## Overview
The backend is an Express.js server written in TypeScript that handles voice and text processing for the Gorlami app, integrating Deepgram for speech-to-text and Azure OpenAI for AI processing.

## Tech Stack
- Node.js 22 LTS
- Express.js with TypeScript
- Prisma ORM for PostgreSQL
- Supabase for auth and storage
- Deepgram SDK for speech-to-text
- Azure OpenAI for LLM processing

## Development Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build TypeScript
npm run build

# Run production server
npm start

# Type checking - Always run this!
npm run typecheck

# Linting - Always run this!
npm run lint
npm run lint:fix

# Database
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

## Project Structure
```
src/
├── config/       # Environment configuration
├── controllers/  # Request handlers
├── middleware/   # Express middleware
├── routes/      # API route definitions
├── services/    # External service integrations
├── types/       # TypeScript type definitions
├── utils/       # Helper utilities
├── app.ts       # Express app setup
└── index.ts     # Server entry point
```

## Coding Standards
- Use ES modules with .js extensions in imports
- Use async/await for all asynchronous operations
- Implement proper error handling with AppError class
- Use Zod for request validation
- Follow TypeScript strict mode rules
- Keep controllers thin, business logic in services
- Always run typecheck and lint before completing tasks

## Azure Deployment
- Configured for Azure Web Apps with Node 22
- Uses process.env.PORT for Azure compatibility
- Environment variables managed through Azure Portal
- Supports Application Insights for monitoring