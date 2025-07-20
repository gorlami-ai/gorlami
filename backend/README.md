# Gorlami Backend

Express TypeScript API server for the Gorlami voice-driven AI assistant.

## Prerequisites

- Node.js 22+
- PostgreSQL (via Supabase)
- Azure OpenAI API access
- Deepgram API access

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your API keys:
```bash
cp .env.example .env
```

3. Generate Prisma client:
```bash
npm run prisma:generate
```

4. Run database migrations:
```bash
npm run prisma:migrate
```

## Development

Start the development server with hot reload:
```bash
npm run dev
```

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Type check without building
- `npm run prisma:studio` - Open Prisma Studio

## API Endpoints

- `GET /` - Health check
- `POST /api/process` - Process text with AI
- `POST /api/transcribe` - Transcribe audio file
- `GET /api/activities` - List user activities
- `GET /api/activities/:id` - Get specific activity
- `GET /api/files/:id` - Download file

## Azure Deployment

This backend is configured for Azure Web Apps deployment:

1. Set Node.js version to 22 LTS in Azure
2. Configure environment variables in Azure Portal
3. Deploy using GitHub Actions or Azure CLI

The app uses `process.env.PORT` for Azure compatibility.