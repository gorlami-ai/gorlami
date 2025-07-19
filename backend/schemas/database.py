from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ActivityType(str, Enum):
    TRANSCRIPTION = "transcription"
    AI_PROCESSING = "ai_processing"


class Activity(BaseModel):
    id: UUID
    user_id: UUID
    type: ActivityType
    file_id: Optional[UUID] = None
    input_text: str
    output_text: str
    provider_response: Optional[list[int]] = None
    created_at: datetime


class ProviderResponse(BaseModel):
    id: UUID
    user_id: UUID
    request_response: Optional[str] = None
    provider: Optional[str] = None


class File(BaseModel):
    id: UUID
    user_id: UUID
    filename: str
    storage_path: str
    activity_id: Optional[UUID] = None
    size_bytes: int
    created_at: datetime
    updated_at: Optional[datetime] = None
