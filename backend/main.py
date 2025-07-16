import logging
import os
from typing import Optional

from deepgram import DeepgramClient, LiveOptions, LiveTranscriptionEvents
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from openai import AzureOpenAI
from pydantic import BaseModel

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get Keys
DEEP_GRAM_KEY = os.getenv("DEEPGRAM_API_KEY")
AZURE_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT_URL")
AZURE_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-mini")


# Initialize clients only if credentials are available
openai_client = AzureOpenAI(
    azure_endpoint=AZURE_ENDPOINT,
    api_key=AZURE_API_KEY,
    api_version="2025-01-01-preview",
)
deepgram_client = DeepgramClient(DEEP_GRAM_KEY)
logger.info("Initialized OpenAI and Deepgram clients")


# Pydantic Models
class TranscriptionResult(BaseModel):
    text: str
    is_final: bool = False
    timestamp: Optional[float] = None


class ProcessRequest(BaseModel):
    text: str
    instruction: str = "Improve clarity and formatting"


class ProcessResponse(BaseModel):
    original_text: str
    processed_text: str


# Create FastAPI app
app = FastAPI(title="Gorlami Backend", version="0.1.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "tauri://localhost"],  # Tauri app origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/")
async def root():
    return {"status": "healthy", "service": "gorlami-backend"}


# REST endpoint for text processing
@app.post("/api/process", response_model=ProcessResponse)
async def process_text(request: ProcessRequest):
    if not openai_client:
        raise HTTPException(
            status_code=503,
            detail="AI processing service is not available. Please configure Azure OpenAI credentials.",
        )

    try:
        # Call Azure OpenAI to process the text
        response = openai_client.chat.completions.create(
            model=AZURE_DEPLOYMENT,
            messages=[
                {
                    "role": "system",
                    "content": f"You are a helpful assistant. {request.instruction}",
                },
                {"role": "user", "content": request.text},
            ],
            temperature=0.7,
            max_tokens=2000,
        )

        processed_text = response.choices[0].message.content

        return ProcessResponse(
            original_text=request.text, processed_text=processed_text
        )
    except Exception as e:
        logger.error(f"Error processing text: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing text")


# WebSocket endpoint for transcription
@app.websocket("/ws/transcribe")
async def transcribe_audio(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection established")

    if not deepgram_client:
        await websocket.send_json(
            {
                "type": "error",
                "message": "Transcription service is not available. Please configure Deepgram API key.",
            }
        )
        await websocket.close()
        return

    try:
        # Configure Deepgram live transcription
        dg_connection = deepgram_client.listen.websocket.v("1")

        # Event handlers
        async def on_message(self, result, **kwargs):
            transcript = result.channel.alternatives[0].transcript
            if transcript:
                # Send transcription to client
                await websocket.send_json(
                    {
                        "type": "transcription",
                        "text": transcript,
                        "is_final": result.is_final,
                    }
                )

                # If final transcription, optionally process with AI
                if result.is_final and transcript.strip() and openai_client:
                    try:
                        # Process with OpenAI for enhancement
                        response = openai_client.chat.completions.create(
                            model=AZURE_DEPLOYMENT,
                            messages=[
                                {
                                    "role": "system",
                                    "content": "Improve the following transcribed text for clarity and fix any grammar issues. Keep the meaning intact.",
                                },
                                {"role": "user", "content": transcript},
                            ],
                            temperature=0.3,
                            max_tokens=500,
                        )

                        enhanced_text = response.choices[0].message.content

                        # Send enhanced version
                        await websocket.send_json(
                            {
                                "type": "enhanced",
                                "text": enhanced_text,
                                "is_final": True,
                            }
                        )
                    except Exception as e:
                        logger.error(f"Error enhancing text: {str(e)}")

        async def on_error(self, error, **kwargs):
            logger.error(f"Deepgram error: {error}")
            await websocket.send_json(
                {"type": "error", "message": "Transcription error occurred"}
            )

        # Register event handlers
        dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
        dg_connection.on(LiveTranscriptionEvents.Error, on_error)

        # Configure transcription options
        options = LiveOptions(
            model="nova-2",
            language="en-US",
            smart_format=True,
            punctuate=True,
            interim_results=True,
            utterance_end_ms=1000,
            vad_events=True,
        )

        # Start the connection
        await dg_connection.start(options)
        logger.info("Deepgram connection started")

        # Handle incoming audio chunks
        while True:
            try:
                # Receive audio data from client
                data = await websocket.receive_bytes()

                # Send to Deepgram
                await dg_connection.send(data)

            except WebSocketDisconnect:
                logger.info("WebSocket disconnected")
                break
            except Exception as e:
                logger.error(f"WebSocket error: {str(e)}")
                await websocket.send_json({"type": "error", "message": str(e)})
                break

        # Clean up
        await dg_connection.finish()

    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await websocket.close()


def start_server():
    """Entry point for poetry run start command."""
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    start_server()
