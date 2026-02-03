"""
UAPI Pro Search integration for DeepResearch Platform.
UAPI Pro Search is an intelligent search engine with machine learning-based ranking.
Currently in limited-time free tier (86,252 calls).
"""

import os
import asyncio
import logging
from typing import List, Dict, Any, Optional
import httpx

logger = logging.getLogger(__name__)

# API Configuration
UAPI_BASE_URL = "https://uapis.cn/api/v1"
DEFAULT_TIMEOUT = 10.0
MAX_RETRIES = 2


async def search_uapi(
    query: str,
    max_results: int = 10,
    days: Optional[int] = None,
    site: Optional[str] = None,
    filetype: Optional[str] = None,
    fetch_full: bool = False,
) -> Dict[str, Any]:
    """
    Search using UAPI Pro Search API.
    
    Args:
        query: Search query string
        max_results: Maximum number of results to return
        days: Time range in days (will be converted to d/w/m/y)
        site: Limit search to specific site (e.g., "example.com")
        filetype: Filter by file type (e.g., "pdf", "doc", "docx")
        fetch_full: Whether to fetch full page content (slower)
        
    Returns:
        Dictionary with success status and results or error message
    """
    # Convert days to time_range format
    time_range = None
    if days:
        if days <= 1:
            time_range = "d"  # Day
        elif days <= 7:
            time_range = "w"  # Week
        elif days <= 30:
            time_range = "m"  # Month
        else:
            time_range = "y"  # Year
    
    # Build request payload
    payload = {
        "query": query,
        "fetch_full": fetch_full,
        "timeout_ms": int(DEFAULT_TIMEOUT * 1000),
    }
    
    # Add optional parameters
    if time_range:
        payload["time_range"] = time_range
    if site:
        payload["site"] = site
    if filetype:
        payload["filetype"] = filetype
    
    # Try request with retries
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
                response = await client.post(
                    f"{UAPI_BASE_URL}/search/aggregate",
                    json=payload,
                    headers={
                        "Content-Type": "application/json",
                        "User-Agent": "DeepResearch Platform/1.0"
                    }
                )
                
                response.raise_for_status()
                data = response.json()
                
                # Parse and format results
                results = _parse_results(data, max_results)
                
                return {
                    "success": True,
                    "results": results,
                    "total_results": data.get("total_results", len(results)),
                    "process_time_ms": data.get("process_time_ms", 0),
                    "cached": data.get("cached", False),
                    "sources": data.get("sources", []),
                }
                
        except httpx.TimeoutException:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(1 * (attempt + 1))  # Exponential backoff
                continue
            return {
                "success": False,
                "error": "Request timeout after retries",
                "results": [],
            }
            
        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP error {e.response.status_code}"
            try:
                error_data = e.response.json()
                if "message" in error_data:
                    error_msg += f": {error_data['message']}"
            except:
                error_msg += f": {e.response.text}"
                
            return {
                "success": False,
                "error": error_msg,
                "results": [],
            }
            
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(1 * (attempt + 1))
                continue
            return {
                "success": False,
                "error": f"UAPI search error: {str(e)}",
                "results": [],
            }
    
    return {
        "success": False,
        "error": "Max retries exceeded",
        "results": [],
    }


def _parse_results(data: Dict[str, Any], max_results: int) -> List[Dict[str, Any]]:
    """
    Parse UAPI response into standardized format.
    
    Args:
        data: UAPI API response data
        max_results: Maximum number of results to return
        
    Returns:
        List of standardized search results
    """
    results = []
    
    for idx, item in enumerate(data.get("results", [])[:max_results], start=1):
        result = {
            "rank": idx,
            "title": item.get("title", ""),
            "link": item.get("url", ""),
            "snippet": item.get("snippet", ""),
            "source": item.get("domain", item.get("source", "UAPI")),
            "date": item.get("publish_time", ""),
            "displayed_link": item.get("url", ""),
            # Additional metadata
            "score": item.get("score"),
            "position": item.get("position"),
            "author": item.get("author"),
        }
        results.append(result)
    
    return results


async def test_uapi_search():
    """Test function for UAPI search."""
    result = await search_uapi(
        query="Python programming",
        max_results=5,
        days=7,
    )
    
    if result["success"]:
        logger.info(f"✅ UAPI search successful!")
        logger.info(f"   Found {result['total_results']} results")
        logger.info(f"   Process time: {result['process_time_ms']}ms")
        logger.info(f"   Cached: {result['cached']}")
        logger.info("Top results:")
        for r in result["results"][:3]:
            logger.info(f"   {r['rank']}. {r['title'][:50]}...")
    else:
        logger.error(f"❌ UAPI search failed: {result['error']}")
    
    return result


if __name__ == "__main__":
    # Run test
    asyncio.run(test_uapi_search())
