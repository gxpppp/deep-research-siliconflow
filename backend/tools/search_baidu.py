"""Baidu Search API integration.

This module provides search functionality using Baidu's search services.
Supports both Baidu Web Search API and web scraping fallback.

Note: Baidu Web Search API requires business partnership.
For development/testing, web scraping fallback is provided.
"""

import os
import asyncio
import urllib.parse
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup


# API Configuration
BAIDU_API_ENDPOINT = "https://www.baidu.com/s"
DEFAULT_TIMEOUT = 15.0
MAX_RETRIES = 2
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


async def search_baidu(
    query: str,
    max_results: int = 10,
    days: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Search using Baidu (web scraping method).
    
    Note: Baidu official API requires business partnership.
    This implementation uses web scraping with proper headers and rate limiting.
    
    Args:
        query: Search query string
        max_results: Maximum number of results to return
        days: Time filter in days (not supported in scraping mode)
        **kwargs: Additional parameters
    
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
    # Try web scraping
    for attempt in range(MAX_RETRIES):
        try:
            result = await asyncio.wait_for(
                _search_with_scraping(query, max_results),
                timeout=DEFAULT_TIMEOUT
            )
            if result["success"] and result["total"] > 0:
                return result
            elif attempt < MAX_RETRIES - 1:
                await asyncio.sleep(1)
        except asyncio.TimeoutError:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(1)
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(1)
    
    return {
        "success": False,
        "error": "Baidu search failed after all retries",
        "results": [],
        "total": 0
    }


async def _search_with_scraping(query: str, max_results: int = 10) -> Dict[str, Any]:
    """
    Search Baidu using web scraping.
    
    Args:
        query: Search query
        max_results: Maximum results to return
    
    Returns:
        Search results dict
    """
    encoded_query = urllib.parse.quote(query)
    url = f"https://www.baidu.com/s?wd={encoded_query}&rn={min(max_results, 50)}"
    
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Cache-Control": "max-age=0"
    }
    
    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "results": [],
                    "total": 0
                }
            
            html = response.text
            results = _parse_baidu_html(html, max_results)
            
            return {
                "success": True,
                "results": results,
                "total": len(results)
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": f"Baidu scraping failed: {str(e)}",
            "results": [],
            "total": 0
        }


def _parse_baidu_html(html: str, max_results: int) -> List[Dict[str, str]]:
    """
    Parse Baidu search results HTML.
    
    Args:
        html: HTML content
        max_results: Maximum results to extract
    
    Returns:
        List of result dictionaries
    """
    results = []
    soup = BeautifulSoup(html, 'html.parser')
    
    # Find result containers - Baidu uses various class names
    # Try multiple selectors for robustness
    selectors = [
        '.result',  # Classic result
        '.c-container',  # New container style
        '[tpl]',  # Template attribute
    ]
    
    result_elements = []
    for selector in selectors:
        result_elements = soup.select(selector)
        if result_elements:
            break
    
    for element in result_elements[:max_results]:
        try:
            # Extract title
            title_elem = element.select_one('h3 a, .t a, a[data-click]')
            if not title_elem:
                continue
            
            title = title_elem.get_text(strip=True)
            
            # Extract URL - Baidu uses redirects
            href = title_elem.get('href', '')
            link = _resolve_baidu_redirect(href) if href else ''
            
            # Extract snippet
            snippet_elem = element.select_one('.content-right_8Zs40, .c-abstract, .content-right, span[class*="abstract"]')
            if not snippet_elem:
                # Try alternative selectors
                snippet_elem = element.find('span', class_=lambda x: x and 'abstract' in x.lower())
            
            snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""
            
            # Extract source
            source_elem = element.select_one('.g, .cite, [class*="source"]')
            source = source_elem.get_text(strip=True) if source_elem else "Baidu"
            
            if title and link:
                results.append({
                    "title": title,
                    "link": link,
                    "snippet": snippet,
                    "source": source,
                    "date": ""
                })
        except Exception:
            continue
    
    return results


def _resolve_baidu_redirect(redirect_url: str) -> str:
    """
    Resolve Baidu redirect URL to actual URL.
    
    Baidu uses redirect URLs like:
    https://www.baidu.com/link?url=...
    
    Args:
        redirect_url: Baidu redirect URL
    
    Returns:
        Actual URL or original if not a redirect
    """
    # For now, return the redirect URL
    # In production, you might want to follow the redirect
    # but that requires additional HTTP requests
    if redirect_url.startswith('/link?'):
        return f"https://www.baidu.com{redirect_url}"
    return redirect_url


async def search_baidu_api(
    query: str,
    max_results: int = 10,
    **kwargs
) -> Dict[str, Any]:
    """
    Search using official Baidu Web Search API (if available).
    
    Note: This requires Baidu Open Platform API key and business partnership.
    
    Args:
        query: Search query string
        max_results: Maximum number of results
        **kwargs: Additional parameters
    
    Returns:
        Search results dict
    """
    api_key = os.getenv("BAIDU_API_KEY")
    secret_key = os.getenv("BAIDU_SECRET_KEY")
    
    if not api_key or not secret_key:
        return {
            "success": False,
            "error": "Baidu API credentials not configured",
            "results": [],
            "total": 0
        }
    
    # Baidu API implementation would go here
    # This is a placeholder for future official API integration
    return {
        "success": False,
        "error": "Baidu API not yet implemented - use scraping mode",
        "results": [],
        "total": 0
    }


def check_baidu_configured() -> bool:
    """
    Check if Baidu search is available.
    
    Returns:
        True if Baidu can be used (always True for scraping mode)
    """
    # Baidu scraping doesn't require API keys
    return True


# Backward compatibility alias
search_baidu_web = search_baidu
