"""Bing Web Search API integration.

This module provides search functionality using Microsoft's Bing Web Search API v7.0.
Requires BING_SEARCH_API_KEY environment variable.

API Documentation: https://docs.microsoft.com/en-us/bing/search-apis/bing-web-search/overview
"""

import os
import asyncio
from typing import List, Dict, Any, Optional
import httpx
from datetime import datetime


# API Configuration
BING_API_ENDPOINT = "https://api.bing.microsoft.com/v7.0/search"
DEFAULT_TIMEOUT = 15.0
MAX_RETRIES = 2


async def search_bing(
    query: str,
    max_results: int = 10,
    days: Optional[int] = None,
    market: str = "zh-CN"
) -> Dict[str, Any]:
    """
    Search using Bing Web Search API.
    
    Args:
        query: Search query string
        max_results: Maximum number of results to return (default: 10, max: 50)
        days: Time filter in days (optional). Bing uses freshness parameter:
              - "Day" for last 24 hours
              - "Week" for last 7 days
              - "Month" for last 30 days
        market: Market code for search results (default: "zh-CN" for Chinese)
    
    Returns:
        Dict with structure:
        {
            "success": bool,
            "results": List[{
                "title": str,
                "link": str,
                "snippet": str,
                "source": str,
                "date": str
            }],
            "total": int,
            "error": str (optional)
        }
    """
    # Get API key
    api_key = os.getenv("BING_SEARCH_API_KEY")
    if not api_key:
        return {
            "success": False,
            "error": "BING_SEARCH_API_KEY not configured",
            "results": [],
            "total": 0
        }
    
    # Build freshness parameter from days
    freshness = None
    if days is not None:
        if days <= 1:
            freshness = "Day"
        elif days <= 7:
            freshness = "Week"
        elif days <= 30:
            freshness = "Month"
    
    # Build request parameters
    params = {
        "q": query,
        "count": min(max_results, 50),  # Bing max is 50
        "mkt": market,
        "responseFilter": "Webpages",
        "textDecorations": False,
        "textFormat": "Raw"
    }
    
    if freshness:
        params["freshness"] = freshness
    
    headers = {
        "Ocp-Apim-Subscription-Key": api_key,
        "User-Agent": "DeepResearch Platform/1.0"
    }
    
    # Execute search with retry logic
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
                response = await client.get(
                    BING_API_ENDPOINT,
                    params=params,
                    headers=headers
                )
                
                # Handle rate limiting
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 1))
                    if attempt < MAX_RETRIES - 1:
                        await asyncio.sleep(retry_after)
                        continue
                    return {
                        "success": False,
                        "error": "Bing API rate limit exceeded",
                        "results": [],
                        "total": 0
                    }
                
                response.raise_for_status()
                data = response.json()
                
                # Parse results
                web_pages = data.get("webPages", {})
                results = []
                
                for idx, item in enumerate(web_pages.get("value", []), 1):
                    results.append({
                        "title": item.get("name", ""),
                        "link": item.get("url", ""),
                        "snippet": item.get("snippet", ""),
                        "source": item.get("siteName", "Bing"),
                        "date": item.get("dateLastCrawled", "")[:10] if item.get("dateLastCrawled") else ""
                    })
                
                return {
                    "success": True,
                    "results": results,
                    "total": web_pages.get("totalEstimatedMatches", len(results))
                }
                
        except httpx.TimeoutException:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(1)
                continue
            return {
                "success": False,
                "error": f"Bing search timeout after {MAX_RETRIES} attempts",
                "results": [],
                "total": 0
            }
            
        except httpx.HTTPStatusError as e:
            error_msg = f"Bing API error {e.response.status_code}: {e.response.text[:200]}"
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(1)
                continue
            return {
                "success": False,
                "error": error_msg,
                "results": [],
                "total": 0
            }
            
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(1)
                continue
            return {
                "success": False,
                "error": f"Bing search failed: {str(e)}",
                "results": [],
                "total": 0
            }
    
    # Should not reach here
    return {
        "success": False,
        "error": "Unknown error occurred",
        "results": [],
        "total": 0
    }


async def search_bing_news(
    query: str,
    max_results: int = 10,
    days: Optional[int] = None,
    market: str = "zh-CN"
) -> Dict[str, Any]:
    """
    Search news using Bing News Search API.
    
    Args:
        query: Search query string
        max_results: Maximum number of results to return
        days: Time filter in days
        market: Market code for search results
    
    Returns:
        Dict with news search results
    """
    api_key = os.getenv("BING_SEARCH_API_KEY")
    if not api_key:
        return {
            "success": False,
            "error": "BING_SEARCH_API_KEY not configured",
            "results": [],
            "total": 0
        }
    
    freshness = None
    if days is not None:
        if days <= 1:
            freshness = "Day"
        elif days <= 7:
            freshness = "Week"
        elif days <= 30:
            freshness = "Month"
    
    params = {
        "q": query,
        "count": min(max_results, 50),
        "mkt": market,
        "textDecorations": False,
        "textFormat": "Raw"
    }
    
    if freshness:
        params["freshness"] = freshness
    
    headers = {
        "Ocp-Apim-Subscription-Key": api_key,
        "User-Agent": "DeepResearch Platform/1.0"
    }
    
    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            response = await client.get(
                "https://api.bing.microsoft.com/v7.0/news/search",
                params=params,
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            
            results = []
            for item in data.get("value", []):
                results.append({
                    "title": item.get("name", ""),
                    "link": item.get("url", ""),
                    "snippet": item.get("description", ""),
                    "source": item.get("provider", [{}])[0].get("name", "Bing News"),
                    "date": item.get("datePublished", "")[:10] if item.get("datePublished") else ""
                })
            
            return {
                "success": True,
                "results": results,
                "total": len(results)
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": f"Bing news search failed: {str(e)}",
            "results": [],
            "total": 0
        }


def check_bing_api_configured() -> bool:
    """Check if Bing Search API is properly configured."""
    return bool(os.getenv("BING_SEARCH_API_KEY"))
