"""Custom tool definitions for TechPulse Social agent.

Tools are defined with the @tool decorator from agent_framework.
The LLM decides when and how to call these tools based on context.
"""

import json
import logging
from typing import Annotated

from agent_framework import tool
from azure.identity import DefaultAzureCredential
from openai import AzureOpenAI

from src.config import IMAGE_DEPLOYMENT_NAME, PROJECT_ENDPOINT

logger = logging.getLogger(__name__)

# Azure token scope (must match client.py)
_AZURE_AI_SCOPE = "https://ai.azure.com/.default"

# Platform character limits and formatting rules
PLATFORM_RULES: dict[str, dict] = {
    "linkedin": {
        "max_chars": 3000,
        "tone": "Professional, data-driven, thought leadership",
        "format": "Use paragraphs, bullet points, and a strong opening hook. Include a CTA.",
        "hashtag_count": "3-5 relevant industry hashtags",
        "image_size": "1200x627",
    },
    "x": {
        "max_chars": 280,
        "tone": "Casual, witty, developer-community voice",
        "format": "Hook in first line. Concise. Use emoji sparingly. Thread format for longer content.",
        "hashtag_count": "1-2 highly relevant hashtags",
        "image_size": "1200x675",
    },
    "instagram": {
        "max_chars": 2200,
        "tone": "Visual-first, approachable, storytelling",
        "format": "Start with a hook. Use emoji. Line breaks for readability. Strong CTA at end.",
        "hashtag_count": "5-10 hashtags (mix of popular and niche)",
        "image_size": "1080x1080",
    },
}


@tool(approval_mode="never_require")
async def generate_content(
    topic: Annotated[str, "The content topic or theme"],
    platform: Annotated[str, "Target platform: linkedin, x, or instagram"],
    strategy: Annotated[str, "Content strategy and key points from analysis"] = "",
    language: Annotated[str, "Output language: en or ja"] = "en",
) -> str:
    """Generate platform-optimized social media content.

    Applies platform-specific character limits, tone, and formatting rules.
    Returns structured content with body text, hashtags, and posting suggestions.
    """
    platform_key = platform.lower().strip()
    rules = PLATFORM_RULES.get(platform_key, PLATFORM_RULES["linkedin"])

    lang_instruction = (
        "Write in natural Japanese appropriate for this platform."
        if language == "ja"
        else "Write in English."
    )

    result = {
        "platform": platform_key,
        "rules_applied": {
            "max_characters": rules["max_chars"],
            "tone": rules["tone"],
            "format": rules["format"],
        },
        "instructions": (
            f"Generate a {platform_key} post about: {topic}. "
            f"Strategy: {strategy}. "
            f"Tone: {rules['tone']}. "
            f"Format: {rules['format']}. "
            f"Max characters: {rules['max_chars']}. "
            f"Include {rules['hashtag_count']}. "
            f"{lang_instruction}"
        ),
        "status": "ready_for_generation",
    }

    logger.info(
        f"generate_content called: platform={platform_key}, topic={topic[:50]}..."
    )
    return json.dumps(result, ensure_ascii=False)


@tool(approval_mode="never_require")
async def review_content(
    content: Annotated[str, "The content text to review"],
    platform: Annotated[str, "Target platform: linkedin, x, or instagram"],
    brand_guidelines: Annotated[str, "Brand guidelines summary for evaluation"] = "",
) -> str:
    """Review and score social media content on 5 quality axes.

    Evaluates: brand_alignment, audience_relevance, engagement_potential,
    clarity, and platform_optimization. Each scored 1-10.
    Returns structured feedback with scores and improvement suggestions.
    """
    platform_key = platform.lower().strip()
    rules = PLATFORM_RULES.get(platform_key, PLATFORM_RULES["linkedin"])
    char_count = len(content)
    max_chars = rules["max_chars"]

    # Basic automated checks
    checks = []
    if char_count > max_chars:
        checks.append(
            f"⚠️ Content exceeds {platform_key} limit: {char_count}/{max_chars} characters"
        )
    if char_count == 0:
        checks.append("⚠️ Content is empty")
    if platform_key == "x" and char_count > 280:
        checks.append("⚠️ X/Twitter post exceeds 280 character limit")
    if "#" not in content:
        checks.append("💡 Consider adding hashtags for discoverability")

    result = {
        "platform": platform_key,
        "character_count": char_count,
        "max_characters": max_chars,
        "automated_checks": checks,
        "review_criteria": {
            "brand_alignment": "Does it match TechPulse's brand voice and messaging pillars?",
            "audience_relevance": "Is it relevant to the target audience for this platform?",
            "engagement_potential": "Will it drive likes, shares, comments?",
            "clarity": "Is the message clear and concise?",
            "platform_optimization": f"Is it optimized for {platform_key}'s format and best practices?",
        },
        "brand_guidelines_provided": bool(brand_guidelines),
        "instructions": (
            "Score each criterion 1-10 and provide specific improvement suggestions. "
            "If any score is below 7, suggest concrete revisions."
        ),
    }

    logger.info(
        f"review_content called: platform={platform_key}, "
        f"chars={char_count}/{max_chars}, checks={len(checks)}"
    )
    return json.dumps(result, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Image generation tool (gpt-image-1.5)
# ---------------------------------------------------------------------------

# Reusable image client (lazy init)
_image_client: AzureOpenAI | None = None


def _get_image_client() -> AzureOpenAI:
    """Get or create a singleton AzureOpenAI client for image generation."""
    global _image_client
    if _image_client is None:
        credential = DefaultAzureCredential()
        token = credential.get_token(_AZURE_AI_SCOPE)
        _image_client = AzureOpenAI(
            azure_endpoint=PROJECT_ENDPOINT,
            api_key=token.token,
            api_version="2025-04-01-preview",
        )
    return _image_client


# Platform-specific image sizes
IMAGE_SIZES: dict[str, str] = {
    "linkedin": "1024x1024",
    "x": "1024x1024",
    "instagram": "1024x1024",
}


@tool(approval_mode="never_require")
async def generate_image(
    prompt: Annotated[str, "Detailed image generation prompt in English"],
    platform: Annotated[str, "Target platform: linkedin, x, or instagram"],
    style: Annotated[
        str, "Visual style: photo, illustration, minimal, abstract"
    ] = "photo",
) -> str:
    """Generate a social media visual using GPT Image (gpt-image-1.5).

    Creates a platform-optimized image from a text prompt.
    Returns a JSON object with base64 image data and metadata.
    """
    platform_key = platform.lower().strip()
    size = IMAGE_SIZES.get(platform_key, "1024x1024")

    # Enhance prompt with style and platform context
    enhanced_prompt = (
        f"{prompt}. "
        f"Style: {style}. "
        f"Optimized for {platform_key} social media. "
        f"Professional, modern, high quality. "
        f"TechPulse Inc. brand colors: Electric Blue (#0066FF), Deep Navy (#0A1628)."
    )

    logger.info(
        f"generate_image called: platform={platform_key}, style={style}, "
        f"prompt={prompt[:60]}..."
    )

    try:
        client = _get_image_client()
        response = client.images.generate(
            model=IMAGE_DEPLOYMENT_NAME,
            prompt=enhanced_prompt,
            size=size,
            n=1,
            response_format="b64_json",
        )

        image_b64 = response.data[0].b64_json
        revised_prompt = getattr(response.data[0], "revised_prompt", prompt)

        result = {
            "platform": platform_key,
            "image_base64": image_b64,
            "size": size,
            "style": style,
            "revised_prompt": revised_prompt,
            "status": "generated",
        }

        logger.info(
            f"Image generated: platform={platform_key}, size={size}, "
            f"b64_length={len(image_b64) if image_b64 else 0}"
        )
        return json.dumps(result, ensure_ascii=False)

    except Exception as e:
        logger.error(f"Image generation failed: {e}", exc_info=True)
        error_result = {
            "platform": platform_key,
            "error": str(e),
            "status": "failed",
        }
        return json.dumps(error_result, ensure_ascii=False)
