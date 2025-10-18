"""
Content transformation utilities for PMWiki.

This module provides functions for transforming content, particularly
for handling image URLs in PMBOK content.
"""
import re
from typing import Optional
from app.core.config import settings


def construct_image_urls(content: str, base_url: Optional[str] = None) -> str:
    """
    Transform relative image paths to absolute URLs.

    Converts markdown image references like:
        ![](image_hash.jpg)
    to:
        ![](https://example.com/base/path/image_hash.jpg)

    Args:
        content: The content string containing markdown with image references
        base_url: Optional base URL override. Defaults to settings.PMBOK_IMAGE_BASE_URL

    Returns:
        Content with absolute image URLs

    Examples:
        >>> content = "![](abc123.jpg)"
        >>> construct_image_urls(content)
        "![](https://example.com/storage/pmbok_images/abc123.jpg)"
    """
    if not content:
        return content

    # Use configured base URL or override
    img_base_url = base_url or settings.PMBOK_IMAGE_BASE_URL

    # Pattern to match markdown images with relative paths (just filenames)
    # Matches: ![](filename.jpg) or ![alt text](filename.jpg)
    # Does NOT match: ![](http://...) or ![](https://...)
    pattern = r'!\[(.*?)\]\((?!https?://)([a-f0-9]{64}\.jpg)\)'

    # Replace with absolute URL
    replacement = rf'![\1]({img_base_url}\2)'

    transformed_content = re.sub(pattern, replacement, content)

    return transformed_content


def strip_image_base_urls(content: str) -> str:
    """
    Strip base URLs from image references, leaving only filenames.

    Converts markdown images like:
        ![](https://pvavwzsrwwqepofkybzt.supabase.co/storage/v1/object/public/pmwiki_images/pmbok_images/abc123.jpg)
    to:
        ![](abc123.jpg)

    This is useful for database migrations to remove hardcoded URLs.

    Args:
        content: The content string containing markdown with absolute image URLs

    Returns:
        Content with only image filenames (no base URL)

    Examples:
        >>> content = "![](https://example.com/path/abc123.jpg)"
        >>> strip_image_base_urls(content)
        "![](abc123.jpg)"
    """
    if not content:
        return content

    # Pattern to match markdown images with full URLs
    # Matches: ![](https://anything.../image_hash.jpg)
    # Captures: alt text and filename only
    pattern = r'!\[(.*?)\]\(https?://[^/]+/.*?/([a-f0-9]{64}\.jpg)\)'

    # Replace with just filename
    replacement = r'![\1](\2)'

    stripped_content = re.sub(pattern, replacement, content)

    return stripped_content


def validate_image_url(url: str) -> bool:
    """
    Validate if a URL points to a valid PMBOK image.

    Args:
        url: The URL to validate

    Returns:
        True if URL is a valid PMBOK image URL, False otherwise
    """
    if not url:
        return False

    # Check if URL matches expected pattern
    pattern = r'https?://[^/]+/.*?/pmbok_images/[a-f0-9]{64}\.jpg'
    return bool(re.match(pattern, url))
