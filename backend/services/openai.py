import logging
from typing import Optional

from config import get_settings
from openai import AzureOpenAI

logger = logging.getLogger(__name__)

settings = get_settings()

openai_client = AzureOpenAI(
    azure_endpoint=settings.azure_openai_endpoint_url,
    api_key=settings.azure_openai_api_key,
    api_version=settings.openai_api_version,
)


def process_text(
    client: AzureOpenAI,
    deployment: str,
    text: str,
    instruction: str = "Improve clarity and formatting",
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> tuple[str, Optional[dict]]:
    """
    Process text with OpenAI.

    Args:
        client: Azure OpenAI client instance
        deployment: Model deployment name
        text: Text to process
        instruction: Processing instruction
        temperature: Model temperature
        max_tokens: Maximum tokens for response

    Returns:
        Tuple of (processed_text, usage_info)
    """
    try:
        response = client.chat.completions.create(
            model=deployment,
            messages=[
                {
                    "role": "system",
                    "content": f"You are a helpful assistant. {instruction}",
                },
                {"role": "user", "content": text},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )

        processed_text = response.choices[0].message.content
        usage_info = {
            "total_tokens": response.usage.total_tokens if response.usage else None,
            "response": response.model_dump(),
        }

        return processed_text, usage_info

    except Exception as e:
        logger.error(f"Error processing text with OpenAI: {str(e)}")
        raise


def enhance_transcription(
    client: AzureOpenAI,
    deployment: str,
    transcript: str,
    temperature: float = 0.3,
    max_tokens: int = 4096,
) -> tuple[str, Optional[dict]]:
    """
    Enhance transcribed text for clarity and grammar.

    Args:
        client: Azure OpenAI client instance
        deployment: Model deployment name
        transcript: Transcript to enhance
        temperature: Model temperature
        max_tokens: Maximum tokens for response

    Returns:
        Tuple of (enhanced_text, usage_info)
    """
    try:
        response = client.chat.completions.create(
            model=deployment,
            messages=[
                {
                    "role": "system",
                    "content": "Improve the following transcribed text for clarity and fix any grammar issues. Keep the meaning intact.",
                },
                {"role": "user", "content": transcript},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )

        enhanced_text = response.choices[0].message.content
        usage_info = {
            "total_tokens": response.usage.total_tokens if response.usage else None,
            "response": response.model_dump(),
        }

        return enhanced_text, usage_info

    except Exception as e:
        logger.error(f"Error enhancing transcription: {str(e)}")
        raise
