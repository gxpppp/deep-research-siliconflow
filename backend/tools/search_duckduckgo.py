"""DuckDuckGo search tool using ddgs library.

This module provides search functionality using DuckDuckGo's search engine
via the ddgs (DuckDuckGo Search) Python library.
"""

import asyncio
from typing import List, Dict, Any, Optional
from ddgs import DDGS
import aiohttp
import urllib.parse

# Configuration
DDGS_TIMEOUT = 30.0  # Increased timeout for DDGS
HTML_TIMEOUT = 20.0  # Increased timeout for HTML fallback
MAX_RETRIES = 2  # Number of retries for failed searches


async def search_duckduckgo(
    query: str,
    max_results: int = 10,
    days: Optional[int] = None,
    region: str = "wt-wt"  # Changed to worldwide for better connectivity
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
        region: Region code for search results (default: "wt-wt" for worldwide)
    
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
    # Try ddgs with retries
    for attempt in range(MAX_RETRIES):
        try:
            result = await asyncio.wait_for(
                _search_with_ddgs(query, max_results, days, region),
                timeout=DDGS_TIMEOUT
            )
            if result["success"] and result["total"] > 0:
                return result
            elif attempt < MAX_RETRIES - 1:
                print(f"DDGS attempt {attempt + 1} returned no results, retrying...")
                await asyncio.sleep(1)
        except asyncio.TimeoutError:
            print(f"DuckDuckGo search timeout (attempt {attempt + 1}/{MAX_RETRIES}) for query: {query}")
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(1)
        except Exception as e:
            print(f"DuckDuckGo search error (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(1)
    
    # Fallback to direct DuckDuckGo HTML scraping
    try:
        result = await asyncio.wait_for(
            _search_with_html(query, max_results),
            timeout=HTML_TIMEOUT
        )
        if result["success"] and result["total"] > 0:
            return result
    except asyncio.TimeoutError:
        print(f"HTML search timeout for query: {query}")
    except Exception as e:
        print(f"HTML search error: {e}")
    
    # Return empty result if all methods failed
    return {
        "success": False,
        "error": "All search methods failed or timed out",
        "results": [],
        "total": 0
    }


async def _search_with_ddgs(
    query: str,
    max_results: int = 10,
    days: Optional[int] = None,
    region: str = "cn-zh"
) -> Dict[str, Any]:
    """Search using ddgs library."""
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
    
    def _search():
        results = []
        with DDGS() as ddgs:
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
    
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, _search)
    
    return {
        "success": True,
        "results": results,
        "total": len(results)
    }


async def _search_with_html(query: str, max_results: int = 10) -> Dict[str, Any]:
    """Fallback search using direct HTTP request to DuckDuckGo HTML."""
    import urllib.parse
    
    encoded_query = urllib.parse.quote(query)
    url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as response:
            if response.status != 200:
                return {
                    "success": False,
                    "error": f"HTTP {response.status}",
                    "results": [],
                    "total": 0
                }
            
            html = await response.text()
            results = _parse_duckduckgo_html(html, max_results)
            
            return {
                "success": True,
                "results": results,
                "total": len(results)
            }


def _parse_duckduckgo_html(html: str, max_results: int) -> List[Dict[str, str]]:
    """Parse DuckDuckGo HTML response."""
    from bs4 import BeautifulSoup
    
    results = []
    soup = BeautifulSoup(html, 'html.parser')
    
    # Find all result elements
    result_elements = soup.find_all('div', class_='result')
    
    for element in result_elements[:max_results]:
        try:
            # Extract title and link
            title_elem = element.find('a', class_='result__a')
            if not title_elem:
                continue
            
            title = title_elem.get_text(strip=True)
            link = title_elem.get('href', '')
            
            # Extract snippet
            snippet_elem = element.find('a', class_='result__snippet')
            snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""
            
            if title and link:
                results.append({
                    "title": title,
                    "link": link,
                    "snippet": snippet,
                    "source": "DuckDuckGo"
                })
        except Exception:
            continue
    
    return results


async def search_duckduckgo_news(
    query: str,
    max_results: int = 10,
    days: Optional[int] = None
) -> Dict[str, Any]:
    """
    Search news using DuckDuckGo.
    
    Args:
        query: Search query string
        max_results: Maximum number of results to return
        days: Time filter in days (optional)
    
    Returns:
        Dict with news search results
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
        
        def _search():
            results = []
            
            with DDGS() as ddgs:
                news_results = ddgs.news(
                    query,
                    max_results=max_results,
                    timelimit=timelimit
                )
                
                for r in news_results:
                    results.append({
                        "title": r.get("title", ""),
                        "link": r.get("url", ""),
                        "snippet": r.get("body", ""),
                        "source": r.get("source", "DuckDuckGo News"),
                        "date": r.get("date", "")
                    })
            
            return results
        
        loop = asyncio.get_event_loop()
        results = await asyncio.wait_for(
            loop.run_in_executor(None, _search),
            timeout=15.0
        )
        
        return {
            "success": True,
            "results": results,
            "total": len(results)
        }
    
    except asyncio.TimeoutError:
        return {
            "success": False,
            "error": "News search timeout",
            "results": [],
            "total": 0
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "results": [],
            "total": 0
        }
