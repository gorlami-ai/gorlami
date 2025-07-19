import logging

from config import get_settings
from deepgram import DeepgramClient

settings = get_settings()

logger = logging.getLogger(__name__)

deepgram_client = DeepgramClient(settings.deepgram_api_key)
