# tools/search.py
"""
Web search tool using DuckDuckGo (via duckduckgo-search library).
Provides search results with filtering and ranking.

Note: SerpAPI is kept as a fallback option but requires API key.
"""

import os
import time
import asyncio
from typing import List, Dict, Any, Optional
import httpx
from datetime import datetime, timedelta

from utils.cache import get_cache, generate_cache_key


# Tool configuration
DEFAULT_TIMEOUT = 15  # seconds
MAX_RETRIES = 3
RETRY_DELAY = 1  # seconds

# SerpAPI configuration (fallback)
SERPAPI_BASE_URL = "https://serpapi.com/search"


async def search_web(
    query: str,
    days: int = 30,
    max_results: int = 10,
    **kwargs
) -> Dict[str, Any]:
    """
    Search the web using DuckDuckGo (primary) or SerpAPI (fallback).
    
    Args:
        query: Search query string
        days: Time range in days (filters results by date)
        max_results: Maximum number of results to return
        **kwargs: Additional search parameters
        
    Returns:
        Dictionary containing:
        - success: bool
        - results: List of search results
        - total_results: int
        - search_time: float
        - error: str (if failed)
    """
    start_time = time.time()
    
    # Check cache first
    cache = get_cache()
    cache_key = generate_cache_key("search", query, days, max_results)
    cached_result = cache.get(cache_key)
    
    if cached_result:
        return {
            "success": True,
            "results": cached_result["results"],
            "total_results": cached_result["total_results"],
            "search_time": 0,
            "cached": True,
            "engine": cached_result.get("engine", "unknown"),
            "error": None
        }
    
    # Try DuckDuckGo first (no API key needed)
    try:
        from .search_duckduckgo import search_duckduckgo
        
        result = await search_duckduckgo(
            query=query,
            max_results=max_results,
            days=days,
            region=kwargs.get("region", "cn-zh")
        )
        
        if result["success"] and result["results"] and len(result["results"]) > 0:
            # Format results to match expected structure
            formatted_results = []
            for idx, r in enumerate(result["results"][:max_results], 1):
                formatted_results.append({
                    "rank": idx,
                    "title": r.get("title", ""),
                    "link": r.get("link", ""),
                    "snippet": r.get("snippet", ""),
                    "source": r.get("source", "DuckDuckGo"),
                    "date": r.get("date", ""),
                    "displayed_link": r.get("link", ""),
                })
            
            # Cache successful results
            cache_data = {
                "results": formatted_results,
                "total_results": len(formatted_results),
                "engine": "duckduckgo"
            }
            cache.set(cache_key, cache_data)
            
            search_time = time.time() - start_time
            
            return {
                "success": True,
                "results": formatted_results,
                "total_results": len(formatted_results),
                "search_time": round(search_time, 2),
                "cached": False,
                "engine": "duckduckgo",
                "error": None
            }
        
        # If DuckDuckGo returns no results or failed, try fallback
        if not result["success"]:
            print(f"DuckDuckGo search failed: {result.get('error')}, trying fallback...")
        elif not result["results"] or len(result["results"]) == 0:
            print(f"DuckDuckGo returned no results, trying fallback...")
    
    except Exception as e:
        print(f"DuckDuckGo search error: {e}, trying fallback...")
    
    # Fallback to SerpAPI if DuckDuckGo fails
    return await _search_serpapi(query, days, max_results, start_time, cache, cache_key, **kwargs)


async def _search_serpapi(
    query: str,
    days: int,
    max_results: int,
    start_time: float,
    cache: Any,
    cache_key: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Fallback search using SerpAPI (Google Search).
    Requires SERPAPI_KEY environment variable.
    """
    # Get API key
    api_key = os.getenv("SERPAPI_KEY")
    if not api_key:
        return {
            "success": False,
            "results": [],
            "total_results": 0,
            "search_time": time.time() - start_time,
            "engine": "none",
            "error": "DuckDuckGo search failed and SERPAPI_KEY not configured for fallback"
        }
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Build search parameters
    params = {
        "q": query,
        "engine": "google",
        "api_key": api_key,
        "num": min(max_results, 20),
        "tbs": f"cdr:1,cd_min:{start_date.strftime('%m/%d/%Y')},cd_max:{end_date.strftime('%m/%d/%Y')}",
        "hl": kwargs.get("language", "zh-CN"),
        "gl": kwargs.get("country", "cn"),
    }
    
    # Execute search with retry logic
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
                response = await client.get(SERPAPI_BASE_URL, params=params)
                response.raise_for_status()
                data = response.json()
                
                # Parse results
                organic_results = data.get("organic_results", [])
                formatted_results = []
                
                for idx, result in enumerate(organic_results[:max_results], 1):
                    formatted_results.append({
                        "rank": idx,
                        "title": result.get("title", ""),
                        "link": result.get("link", ""),
                        "snippet": result.get("snippet", ""),
                        "source": result.get("source", ""),
                        "date": result.get("date", ""),
                        "displayed_link": result.get("displayed_link", ""),
                    })
                
                # Cache successful results
                cache_data = {
                    "results": formatted_results,
                    "total_results": data.get("search_information", {}).get("total_results", 0),
                    "engine": "serpapi"
                }
                cache.set(cache_key, cache_data)
                
                search_time = time.time() - start_time
                
                return {
                    "success": True,
                    "results": formatted_results,
                    "total_results": data.get("search_information", {}).get("total_results", 0),
                    "search_time": round(search_time, 2),
                    "cached": False,
                    "engine": "serpapi",
                    "error": None
                }
                
        except httpx.TimeoutException:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                continue
            return {
                "success": False,
                "results": [],
                "total_results": 0,
                "search_time": time.time() - start_time,
                "engine": "serpapi",
                "error": f"Search timeout after {MAX_RETRIES} attempts"
            }
            
        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP error {e.response.status_code}: {e.response.text[:200]}"
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                continue
            return {
                "success": False,
                "results": [],
                "total_results": 0,
                "search_time": time.time() - start_time,
                "engine": "serpapi",
                "error": error_msg
            }
            
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                continue
            return {
                "success": False,
                "results": [],
                "total_results": 0,
                "search_time": time.time() - start_time,
                "engine": "serpapi",
                "error": f"Search failed: {str(e)}"
            }
    
    # Should not reach here, but just in case
    return {
        "success": False,
        "results": [],
        "total_results": 0,
        "search_time": time.time() - start_time,
        "engine": "serpapi",
        "error": "Unknown error occurred"
    }


def format_search_results_for_llm(results: List[Dict[str, Any]]) -> str:
    """
    Format search results for LLM consumption.
    
    Args:
        results: List of search result dictionaries
        
    Returns:
        Formatted string for LLM context
    """
    if not results:
        return "No search results found."
    
    formatted = []
    for result in results:
        formatted.append(
            f"[{result['rank']}] {result['title']}\n"
            f"URL: {result['link']}\n"
            f"Source: {result['source']}\n"
            f"Date: {result['date'] or 'Unknown'}\n"
            f"Summary: {result['snippet']}\n"
        )
    
    return "\n---\n".join(formatted)


# Synchronous wrapper for LangChain compatibility
def search_web_sync(
    query: str,
    days: int = 30,
    max_results: int = 10,
    **kwargs
) -> Dict[str, Any]:
    """Synchronous wrapper for search_web."""
    return asyncio.run(search_web(query, days, max_results, **kwargs))
