import logging

from config import get_settings
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from utils.auth import get_user_id

# Configure logging
settings = get_settings()
logging.basicConfig(level=getattr(logging, settings.log_level))
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Gorlami Backend",
    version="0.1.0",
    description="Voice-driven AI assistant for macOS",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/", tags=["health"])
async def root():
    """Health check endpoint."""
    return {"status": "healthy", "service": "gorlami-backend"}


# REST endpoint for text processing
@app.post("/api/process", response_model=ProcessResponse)
async def process_text(
    request: ProcessRequest,
    user_id: str = Depends(get_user_id),
):
    """Improve text clarity and formatting using OpenAI or generally follow user instructions

    Args:
        request (ProcessRequest): _description_
        user_id (str, optional): _description_. Defaults to Depends(get_user_id).
    """
    pass


@app.post("/api/transcribe", response_model=ProcessResponse)
async def transcribe_audio(
    request: ProcessRequest,
    user_id: str = Depends(get_user_id),
):
    """Transcribe audio using Deepgram or other services and enhance with OpenAI

    Args:
        request (ProcessRequest): _description_
        user_id (str, optional): _description_. Defaults to Depends(get_user_id).
    """
    pass


def start_server():
    """Entry point for poetry run start command."""
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.server_host,
        port=settings.server_port,
        reload=settings.is_development,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    start_server()
