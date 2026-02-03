# tools/scrape.py
"""
Web scraping tool using Jina AI Reader.
Extracts clean article content from URLs.
"""

import os
import time
import asyncio
from typing import Dict, Any, Optional
import httpx

from utils.cache import get_cache, generate_cache_key
from utils.security import validate_url


# Tool configuration
JINA_API_BASE = "https://r.jina.ai/http"
JINA_API_KEY_HEADER = "Authorization"
DEFAULT_TIMEOUT = 15  # seconds
MAX_RETRIES = 3
RETRY_DELAY = 1  # seconds
MAX_CONTENT_LENGTH = 50000  # characters


async def scrape_url(url: str, **kwargs) -> Dict[str, Any]:
    """
    Scrape and extract clean content from a URL using Jina AI Reader.
    
    Args:
        url: URL to scrape
        **kwargs: Additional options
            - extract_images: bool = False (include image URLs)
            - extract_links: bool = False (include link references)
            
    Returns:
        Dictionary containing:
        - success: bool
        - title: str
        - content: str (clean extracted text)
        - url: str (original URL)
        - metadata: dict (author, date, etc.)
        - error: str (if failed)
        
    TODO: Add content quality scoring and duplicate detection
    """
    start_time = time.time()
    
    # Validate URL first
    if not validate_url(url):
        return {
            "success": False,
            "title": "",
            "content": "",
            "url": url,
            "metadata": {},
            "error": "Invalid or unsafe URL"
        }
    
    # Check cache
    cache = get_cache()
    cache_key = generate_cache_key("scrape", url)
    cached_result = cache.get(cache_key)
    
    if cached_result:
        return {
            "success": True,
            "title": cached_result["title"],
            "content": cached_result["content"],
            "url": url,
            "metadata": cached_result.get("metadata", {}),
            "cached": True,
            "error": None
        }
    
    # Get API key (optional for Jina AI)
    api_key = os.getenv("JINA_API_KEY", "")
    
    # Build request
    headers = {}
    if api_key:
        headers[JINA_API_KEY_HEADER] = f"Bearer {api_key}"
    
    # Jina AI Reader endpoint format: https://r.jina.ai/http://example.com
    target_url = url
    if not url.startswith(('http://', 'https://')):
        target_url = f"https://{url}"
    
    jina_url = f"{JINA_API_BASE}://{target_url.replace('https://', '').replace('http://', '')}"
    
    # Execute request with retry logic
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, follow_redirects=True) as client:
                response = await client.get(jina_url, headers=headers)
                response.raise_for_status()
                
                content = response.text
                
                # Parse Jina AI response format
                # Format: Title\n\n[Image descriptions]\n\nContent
                lines = content.split('\n')
                
                title = ""
                body_content = []
                metadata = {}
                
                in_metadata = False
                for i, line in enumerate(lines):
                    if i == 0 and line.strip():
                        # First line is usually the title
                        title = line.strip()
                    elif line.startswith('URL Source: '):
                        metadata['source_url'] = line.replace('URL Source: ', '').strip()
                    elif line.startswith('Published: '):
                        metadata['published_date'] = line.replace('Published: ', '').strip()
                    elif line.startswith('Author: '):
                        metadata['author'] = line.replace('Author: ', '').strip()
                    elif line.strip() == '':
                        continue
                    else:
                        body_content.append(line)
                
                # Join body content
                clean_content = '\n'.join(body_content).strip()
                
                # Limit content length
                if len(clean_content) > MAX_CONTENT_LENGTH:
                    clean_content = clean_content[:MAX_CONTENT_LENGTH] + "\n\n[Content truncated...]"
                
                # Cache successful result
                cache_data = {
                    "title": title,
                    "content": clean_content,
                    "metadata": metadata
                }
                cache.set(cache_key, cache_data)
                
                return {
                    "success": True,
                    "title": title,
                    "content": clean_content,
                    "url": url,
                    "metadata": metadata,
                    "cached": False,
                    "error": None
                }
                
        except httpx.TimeoutException:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                continue
            return {
                "success": False,
                "title": "",
                "content": "",
                "url": url,
                "metadata": {},
                "error": f"Scrape timeout after {MAX_RETRIES} attempts"
            }
            
        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP error {e.response.status_code}"
            if e.response.status_code == 404:
                error_msg = "Page not found (404)"
            elif e.response.status_code == 403:
                error_msg = "Access forbidden (403) - site may block scrapers"
            elif e.response.status_code == 429:
                error_msg = "Rate limited (429) - too many requests"
            
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                continue
                
            return {
                "success": False,
                "title": "",
                "content": "",
                "url": url,
                "metadata": {},
                "error": error_msg
            }
            
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                continue
            return {
                "success": False,
                "title": "",
                "content": "",
                "url": url,
                "metadata": {},
                "error": f"Scrape failed: {str(e)}"
            }
    
    return {
        "success": False,
        "title": "",
        "content": "",
        "url": url,
        "metadata": {},
        "error": "Unknown error occurred"
    }


def format_scraped_content_for_llm(scrape_result: Dict[str, Any]) -> str:
    """
    Format scraped content for LLM consumption.
    
    Args:
        scrape_result: Result from scrape_url function
        
    Returns:
        Formatted string for LLM context
    """
    if not scrape_result.get("success"):
        return f"Failed to scrape content: {scrape_result.get('error', 'Unknown error')}"
    
    title = scrape_result.get("title", "Untitled")
    content = scrape_result.get("content", "")
    url = scrape_result.get("url", "")
    metadata = scrape_result.get("metadata", {})
    
    formatted = f"""Title: {title}
Source: {url}
Author: {metadata.get('author', 'Unknown')}
Published: {metadata.get('published_date', 'Unknown')}

Content:
{content}
"""
    return formatted


# Synchronous wrapper for LangChain compatibility
def scrape_url_sync(url: str, **kwargs) -> Dict[str, Any]:
    """Synchronous wrapper for scrape_url."""
    return asyncio.run(scrape_url(url, **kwargs))
