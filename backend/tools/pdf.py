# tools/pdf.py
"""
PDF analysis tool using PyMuPDF.
Extracts text, tables, and metadata from PDF documents.
"""

import os
import io
import time
import asyncio
from typing import Dict, Any, List, Optional
import httpx
import fitz  # PyMuPDF

from utils.cache import get_cache, generate_cache_key
from utils.security import validate_url


# Tool configuration
DEFAULT_TIMEOUT = 30  # seconds (PDFs may take longer)
MAX_RETRIES = 3
RETRY_DELAY = 1  # seconds
MAX_PAGES = 50  # Limit pages for MVP
MAX_TEXT_LENGTH = 100000  # characters


async def analyze_pdf(url: str, **kwargs) -> Dict[str, Any]:
    """
    Download and analyze a PDF document.
    
    Args:
        url: URL to PDF file
        **kwargs: Additional options
            - max_pages: int = 50 (max pages to process)
            - extract_tables: bool = False (extract table data)
            - extract_images: bool = False (extract image info)
            
    Returns:
        Dictionary containing:
        - success: bool
        - title: str
        - content: str (extracted text)
        - metadata: dict (PDF metadata)
        - page_count: int
        - toc: list (table of contents)
        - error: str (if failed)
        
    TODO: Implement OCR for scanned PDFs
    TODO: Add table extraction with structured data
    """
    start_time = time.time()
    max_pages = kwargs.get("max_pages", MAX_PAGES)
    
    # Validate URL
    if not validate_url(url, allowed_schemes=['http', 'https']):
        return {
            "success": False,
            "title": "",
            "content": "",
            "metadata": {},
            "page_count": 0,
            "toc": [],
            "error": "Invalid or unsafe URL"
        }
    
    # Check cache
    cache = get_cache()
    cache_key = generate_cache_key("pdf", url, max_pages)
    cached_result = cache.get(cache_key)
    
    if cached_result:
        return {
            "success": True,
            "title": cached_result["title"],
            "content": cached_result["content"],
            "metadata": cached_result.get("metadata", {}),
            "page_count": cached_result.get("page_count", 0),
            "toc": cached_result.get("toc", []),
            "cached": True,
            "error": None
        }
    
    # Download PDF with retry logic
    pdf_bytes = None
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, follow_redirects=True) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                # Check content type
                content_type = response.headers.get('content-type', '')
                if 'pdf' not in content_type.lower() and not url.endswith('.pdf'):
                    return {
                        "success": False,
                        "title": "",
                        "content": "",
                        "metadata": {},
                        "page_count": 0,
                        "toc": [],
                        "error": f"URL does not point to a PDF file (content-type: {content_type})"
                    }
                
                pdf_bytes = response.content
                break
                
        except httpx.TimeoutException:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                continue
            return {
                "success": False,
                "title": "",
                "content": "",
                "metadata": {},
                "page_count": 0,
                "toc": [],
                "error": f"Download timeout after {MAX_RETRIES} attempts"
            }
            
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                continue
            return {
                "success": False,
                "title": "",
                "content": "",
                "metadata": {},
                "page_count": 0,
                "toc": [],
                "error": f"Download failed: {str(e)}"
            }
    
    if pdf_bytes is None:
        return {
            "success": False,
            "title": "",
            "content": "",
            "metadata": {},
            "page_count": 0,
            "toc": [],
            "error": "Failed to download PDF"
        }
    
    # Process PDF with PyMuPDF
    try:
        # Open PDF from bytes
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        # Extract metadata
        metadata = {
            "title": pdf_document.metadata.get("title", ""),
            "author": pdf_document.metadata.get("author", ""),
            "subject": pdf_document.metadata.get("subject", ""),
            "creator": pdf_document.metadata.get("creator", ""),
            "producer": pdf_document.metadata.get("producer", ""),
            "creation_date": pdf_document.metadata.get("creationDate", ""),
            "modification_date": pdf_document.metadata.get("modDate", ""),
        }
        
        # Get table of contents
        toc = pdf_document.get_toc()
        toc_formatted = []
        for item in toc:
            if len(item) >= 3:
                toc_formatted.append({
                    "level": item[0],
                    "title": item[1],
                    "page": item[2]
                })
        
        # Extract text from pages
        total_pages = len(pdf_document)
        pages_to_process = min(total_pages, max_pages)
        
        text_content = []
        for page_num in range(pages_to_process):
            page = pdf_document[page_num]
            text = page.get_text()
            text_content.append(f"\n--- Page {page_num + 1} ---\n{text}")
        
        full_text = "\n".join(text_content)
        
        # Truncate if too long
        if len(full_text) > MAX_TEXT_LENGTH:
            full_text = full_text[:MAX_TEXT_LENGTH] + "\n\n[Content truncated due to length...]"
        
        # Use filename or metadata title as document title
        title = metadata.get("title", "")
        if not title:
            # Extract from URL
            title = url.split('/')[-1].replace('.pdf', '').replace('-', ' ').replace('_', ' ')
        
        pdf_document.close()
        
        # Cache result
        cache_data = {
            "title": title,
            "content": full_text,
            "metadata": metadata,
            "page_count": total_pages,
            "toc": toc_formatted[:20]  # Limit TOC entries
        }
        cache.set(cache_key, cache_data)
        
        return {
            "success": True,
            "title": title,
            "content": full_text,
            "metadata": metadata,
            "page_count": total_pages,
            "toc": toc_formatted[:20],
            "cached": False,
            "error": None
        }
        
    except Exception as e:
        return {
            "success": False,
            "title": "",
            "content": "",
            "metadata": {},
            "page_count": 0,
            "toc": [],
            "error": f"PDF processing failed: {str(e)}"
        }


def format_pdf_content_for_llm(pdf_result: Dict[str, Any]) -> str:
    """
    Format PDF content for LLM consumption.
    
    Args:
        pdf_result: Result from analyze_pdf function
        
    Returns:
        Formatted string for LLM context
    """
    if not pdf_result.get("success"):
        return f"Failed to analyze PDF: {pdf_result.get('error', 'Unknown error')}"
    
    title = pdf_result.get("title", "Untitled PDF")
    content = pdf_result.get("content", "")
    metadata = pdf_result.get("metadata", {})
    page_count = pdf_result.get("page_count", 0)
    toc = pdf_result.get("toc", [])
    
    # Format TOC
    toc_text = ""
    if toc:
        toc_text = "\nTable of Contents:\n"
        for item in toc:
            indent = "  " * (item.get("level", 1) - 1)
            toc_text += f"{indent}- {item.get('title', '')} (p.{item.get('page', '')})\n"
    
    formatted = f"""Document: {title}
Author: {metadata.get('author', 'Unknown')}
Pages: {page_count}
{toc_text}

Content:
{content}
"""
    return formatted


# Synchronous wrapper for LangChain compatibility
def analyze_pdf_sync(url: str, **kwargs) -> Dict[str, Any]:
    """Synchronous wrapper for analyze_pdf."""
    return asyncio.run(analyze_pdf(url, **kwargs))
