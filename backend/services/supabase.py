import logging

from config import get_settings
from supabase import AsyncClient, Client, create_client

logger = logging.getLogger(__name__)

# Get settings
settings = get_settings()

# Initialize sync client
client: Client = create_client(settings.supabase_url, settings.supabase_key)

# Initialize async client (will be created on first use)
async_client: AsyncClient = AsyncClient(settings.supabase_url, settings.supabase_key)
