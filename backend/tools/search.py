"""
Web search tool with multi-engine support.
Supports Bing, Baidu, DuckDuckGo, and SerpAPI search engines.
Provides unified interface with automatic fallback.
"""

import os
import time
import asyncio
from enum import Enum
from typing import List, Dict, Any, Optional
import httpx
from datetime import datetime, timedelta

from utils.cache import get_cache, generate_cache_key


class SearchEngine(str, Enum):
    """Supported search engines."""
    UAPI = "uapi"
    BING = "bing"
    BAIDU = "baidu"
    DUCKDUCKGO = "duckduckgo"
    SERPAPI = "serpapi"


# Tool configuration
DEFAULT_TIMEOUT = 15  # seconds
MAX_RETRIES = 3
RETRY_DELAY = 1  # seconds
DEFAULT_ENGINE = SearchEngine.UAPI  # UAPI is free and requires no API key

# SerpAPI configuration (fallback)
SERPAPI_BASE_URL = "https://serpapi.com/search"


def get_available_engines() -> List[Dict[str, Any]]:
    """
    Get list of available search engines with their configuration status.
    
    Returns:
        List of engine info dicts with name, display_name, configured status
    """
    engines = []
    
    # Check UAPI (free, no API key needed)
    engines.append({
        "id": SearchEngine.UAPI,
        "name": "UAPI Pro Search",
        "description": "UAPI 智能搜索 - 限时免费，推荐",
        "configured": True,  # No API key needed, always available
        "requires_api_key": False,
        "api_key_env": None
    })
    
    # Check Bing
    from .search_bing import check_bing_api_configured
    engines.append({
        "id": SearchEngine.BING,
        "name": "Bing",
        "description": "微软必应搜索",
        "configured": check_bing_api_configured(),
        "requires_api_key": True,
        "api_key_env": "BING_SEARCH_API_KEY"
    })
    
    # Check Baidu
    from .search_baidu import check_baidu_configured
    engines.append({
        "id": SearchEngine.BAIDU,
        "name": "百度",
        "description": "百度搜索 - 适合中文内容",
        "configured": check_baidu_configured(),
        "requires_api_key": False,
        "api_key_env": None
    })
    
    # Check DuckDuckGo
    engines.append({
        "id": SearchEngine.DUCKDUCKGO,
        "name": "DuckDuckGo",
        "description": "DuckDuckGo - 隐私保护搜索",
        "configured": True,  # No API key needed
        "requires_api_key": False,
        "api_key_env": None
    })
    
    # Check SerpAPI
    engines.append({
        "id": SearchEngine.SERPAPI,
        "name": "SerpAPI (Google)",
        "description": "Google 搜索 via SerpAPI",
        "configured": bool(os.getenv("SERPAPI_KEY")),
        "requires_api_key": True,
        "api_key_env": "SERPAPI_KEY"
    })
    
    return engines


def get_default_engine() -> SearchEngine:
    """Get default search engine based on configuration."""
    env_default = os.getenv("DEFAULT_SEARCH_ENGINE", "bing")
    try:
        return SearchEngine(env_default.lower())
    except ValueError:
        return SearchEngine.BING


async def search_web(
    query: str,
    days: int = 30,
    max_results: int = 10,
    engine: Optional[SearchEngine] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Search the web using specified search engine.
    
    Args:
        query: Search query string
        days: Time range in days (filters results by date)
        max_results: Maximum number of results to return
        engine: Search engine to use (default: from env or Bing)
        **kwargs: Additional search parameters
        
    Returns:
        Dictionary containing:
        - success: bool
        - results: List of search results
        - total_results: int
        - search_time: float
        - engine: str (engine used)
        - error: str (if failed)
    """
    start_time = time.time()
    
    # Use specified engine or default
    if engine is None:
        engine = get_default_engine()
    
    # Check cache first
    cache = get_cache()
    cache_key = generate_cache_key("search", query, days, max_results, engine.value)
    cached_result = cache.get(cache_key)
    
    if cached_result:
        return {
            "success": True,
            "results": cached_result["results"],
            "total_results": cached_result["total_results"],
            "search_time": 0,
            "cached": True,
            "engine": cached_result.get("engine", engine.value),
            "error": None
        }
    
    # Try specified engine first
    result = await _search_with_engine(query, days, max_results, engine, **kwargs)
    
    if result["success"] and result["results"]:
        # Cache successful results
        cache_data = {
            "results": result["results"],
            "total_results": len(result["results"]),
            "engine": engine.value
        }
        cache.set(cache_key, cache_data)
        
        search_time = time.time() - start_time
        result["search_time"] = round(search_time, 2)
        result["cached"] = False
        return result
    
    # If primary engine failed, try fallback engines
    print(f"{engine.value} search failed: {result.get('error')}, trying fallback...")
    
    # Define fallback order
    fallback_order = [SearchEngine.BING, SearchEngine.BAIDU, SearchEngine.SERPAPI]
    fallback_order = [e for e in fallback_order if e != engine]
    
    for fallback_engine in fallback_order:
        print(f"Trying fallback engine: {fallback_engine.value}")
        fallback_result = await _search_with_engine(
            query, days, max_results, fallback_engine, **kwargs
        )
        
        if fallback_result["success"] and fallback_result["results"]:
            # Cache successful fallback results
            cache_data = {
                "results": fallback_result["results"],
                "total_results": len(fallback_result["results"]),
                "engine": fallback_engine.value
            }
            cache.set(cache_key, cache_data)
            
            search_time = time.time() - start_time
            fallback_result["search_time"] = round(search_time, 2)
            fallback_result["cached"] = False
            fallback_result["fallback_from"] = engine.value
            return fallback_result
        
        print(f"Fallback {fallback_engine.value} also failed: {fallback_result.get('error')}")
    
    # All engines failed
    search_time = time.time() - start_time
    return {
        "success": False,
        "results": [],
        "total_results": 0,
        "search_time": round(search_time, 2),
        "engine": engine.value,
        "error": f"All search engines failed. Last error: {result.get('error')}",
        "cached": False
    }


async def _search_with_engine(
    query: str,
    days: int,
    max_results: int,
    engine: SearchEngine,
    **kwargs
) -> Dict[str, Any]:
    """
    Search using specific engine.
    
    Args:
        query: Search query
        days: Time range
        max_results: Max results
        engine: Search engine enum
        **kwargs: Additional params
        
    Returns:
        Search result dict
    """
    try:
        if engine == SearchEngine.UAPI:
            from .search_uapi import search_uapi
            result = await search_uapi(
                query=query,
                max_results=max_results,
                days=days
            )
            return _normalize_result(result, "uapi")
            
        elif engine == SearchEngine.BING:
            from .search_bing import search_bing
            result = await search_bing(
                query=query,
                max_results=max_results,
                days=days,
                market=kwargs.get("market", "zh-CN")
            )
            return _normalize_result(result, "bing")
            
        elif engine == SearchEngine.BAIDU:
            from .search_baidu import search_baidu
            result = await search_baidu(
                query=query,
                max_results=max_results,
                days=days
            )
            return _normalize_result(result, "baidu")
            
        elif engine == SearchEngine.DUCKDUCKGO:
            from .search_duckduckgo import search_duckduckgo
            result = await search_duckduckgo(
                query=query,
                max_results=max_results,
                days=days,
                region=kwargs.get("region", "wt-wt")
            )
            return _normalize_result(result, "duckduckgo")
            
        elif engine == SearchEngine.SERPAPI:
            return await _search_serpapi(query, days, max_results, time.time(), None, "", **kwargs)
            
        else:
            return {
                "success": False,
                "results": [],
                "total_results": 0,
                "engine": engine.value,
                "error": f"Unknown search engine: {engine.value}"
            }
            
    except Exception as e:
        return {
            "success": False,
            "results": [],
            "total_results": 0,
            "engine": engine.value,
            "error": f"{engine.value} search error: {str(e)}"
        }


def _normalize_result(result: Dict[str, Any], engine_name: str) -> Dict[str, Any]:
    """Normalize search result format."""
    if not result.get("success"):
        return {
            "success": False,
            "results": [],
            "total_results": 0,
            "engine": engine_name,
            "error": result.get("error", "Unknown error")
        }
    
    # Format results to standard structure
    formatted_results = []
    for idx, r in enumerate(result.get("results", []), 1):
        formatted_results.append({
            "rank": idx,
            "title": r.get("title", ""),
            "link": r.get("link", ""),
            "snippet": r.get("snippet", ""),
            "source": r.get("source", engine_name),
            "date": r.get("date", ""),
            "displayed_link": r.get("link", ""),
        })
    
    return {
        "success": True,
        "results": formatted_results,
        "total_results": result.get("total", len(formatted_results)),
        "engine": engine_name,
        "error": None
    }


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
    Search using SerpAPI (Google Search).
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
            "engine": "serpapi",
            "error": "SERPAPI_KEY not configured"
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
                
                return {
                    "success": True,
                    "results": formatted_results,
                    "total_results": data.get("search_information", {}).get("total_results", 0),
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
    engine: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Synchronous wrapper for search_web."""
    engine_enum = SearchEngine(engine) if engine else None
    return asyncio.run(search_web(query, days, max_results, engine_enum, **kwargs))
