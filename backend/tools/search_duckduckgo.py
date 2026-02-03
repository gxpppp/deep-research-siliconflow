"""DuckDuckGo search tool using ddgs library.

This module provides search functionality using DuckDuckGo's search engine
via the ddgs (DuckDuckGo Search) Python library.
"""

import asyncio
from typing import List, Dict, Any, Optional
from ddgs import DDGS


async def search_duckduckgo(
    query: str,
    max_results: int = 10,
    days: Optional[int] = None,
    region: str = "cn-zh"
) -> Dict[str, Any]:
    """
    Search using DuckDuckGo.
    
    Args:
        query: Search query string
        max_results: Maximum number of results to return (default: 10)
        days: Time filter in days (optional). Maps to DDGS timelimit:
              - <= 1 day: "d" (day)
              - <= 7 days: "w" (week)
              - <= 30 days: "m" (month)
              - > 30 days: "y" (year)
        region: Region code for search results (default: "cn-zh" for Chinese)
    
    Returns:
        Dict with structure:
        {
            "success": bool,
            "results": List[{
                "title": str,
                "link": str,
                "snippet": str,
                "source": str
            }],
            "total": int,
            "error": str (optional)
        }
    """
    try:
        # Map days to DDGS timelimit format
        timelimit = None
        if days is not None:
            if days <= 1:
                timelimit = "d"  # day
            elif days <= 7:
                timelimit = "w"  # week
            elif days <= 30:
                timelimit = "m"  # month
            else:
                timelimit = "y"  # year
        
        # Run DDGS search in thread pool since it's synchronous
        def _search():
            results = []
            
            with DDGS() as ddgs:
                # Get text search results
                search_results = ddgs.text(
                    query,
                    max_results=max_results,
                    timelimit=timelimit,
                    region=region
                )
                
                for r in search_results:
                    results.append({
                        "title": r.get("title", ""),
                        "link": r.get("href", ""),
                        "snippet": r.get("body", ""),
                        "source": "DuckDuckGo"
                    })
            
            return results
        
        # Run synchronous DDGS in thread pool
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, _search)
        
        return {
            "success": True,
            "results": results,
            "total": len(results)
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "results": [],
            "total": 0
        }


async def search_duckduckgo_news(
    query: str,
    max_results: int = 10,
    days: Optional[int] = None,
    region: str = "cn-zh"
) -> Dict[str, Any]:
    """
    Search news using DuckDuckGo.
    
    Args:
        query: Search query string
        max_results: Maximum number of results to return (default: 10)
        days: Time filter in days (optional)
        region: Region code for search results (default: "cn-zh" for Chinese)
    
    Returns:
        Dict with same structure as search_duckduckgo
    """
    try:
        # Map days to DDGS timelimit format
        timelimit = None
        if days is not None:
            if days <= 1:
                timelimit = "d"
            elif days <= 7:
                timelimit = "w"
            elif days <= 30:
                timelimit = "m"
            else:
                timelimit = "y"
        
        def _search_news():
            results = []
            
            with DDGS() as ddgs:
                # Get news search results
                news_results = ddgs.news(
                    query,
                    max_results=max_results,
                    timelimit=timelimit,
                    region=region
                )
                
                for r in news_results:
                    results.append({
                        "title": r.get("title", ""),
                        "link": r.get("url", ""),
                        "snippet": r.get("body", ""),
                        "source": f"DuckDuckGo News - {r.get('source', 'Unknown')}",
                        "date": r.get("date", "")
                    })
            
            return results
        
        # Run synchronous DDGS in thread pool
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, _search_news)
        
        return {
            "success": True,
            "results": results,
            "total": len(results)
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "results": [],
            "total": 0
        }


# Alias for compatibility with existing code
search_web = search_duckduckgo
