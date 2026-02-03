# utils/security.py
"""Security utilities for input validation and sanitization."""

import re
import bleach
from urllib.parse import urlparse
from typing import Optional


def sanitize_input(text: str, max_length: int = 5000) -> str:
    """
    Sanitize user input to prevent XSS attacks.
    
    Args:
        text: Raw input text
        max_length: Maximum allowed length
        
    Returns:
        Sanitized text safe for processing
        
    TODO: Consider adding HTML entity encoding for specific contexts
    """
    if not text:
        return ""
    
    # Trim to max length
    text = text[:max_length]
    
    # Remove potentially dangerous HTML tags
    # Allow only basic formatting tags
    allowed_tags = ['p', 'br', 'strong', 'em', 'code']
    allowed_attributes = {}
    
    cleaned = bleach.clean(
        text,
        tags=allowed_tags,
        attributes=allowed_attributes,
        strip=True
    )
    
    # Remove script-related patterns
    dangerous_patterns = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',
        r'data:text/html',
    ]
    
    for pattern in dangerous_patterns:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE | re.DOTALL)
    
    return cleaned.strip()


def validate_url(url: str, allowed_schemes: Optional[list] = None) -> bool:
    """
    Validate URL format and scheme.
    
    Args:
        url: URL to validate
        allowed_schemes: List of allowed schemes (default: http, https)
        
    Returns:
        True if URL is valid and safe
        
    TODO: Add domain whitelist for additional security
    """
    if not url:
        return False
    
    if allowed_schemes is None:
        allowed_schemes = ['http', 'https']
    
    try:
        parsed = urlparse(url)
        
        # Check scheme
        if parsed.scheme not in allowed_schemes:
            return False
        
        # Check for valid netloc (domain)
        if not parsed.netloc:
            return False
        
        # Block private IP ranges and localhost
        blocked_hosts = [
            'localhost',
            '127.0.0.1',
            '0.0.0.0',
            '::1',
        ]
        
        hostname = parsed.hostname
        if hostname:
            if hostname in blocked_hosts:
                return False
            
            # Block private IP ranges
            if re.match(r'^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)', hostname):
                return False
        
        return True
        
    except Exception:
        return False


def sanitize_markdown(text: str) -> str:
    """
    Sanitize markdown content while preserving structure.
    
    Args:
        text: Markdown text to sanitize
        
    Returns:
        Sanitized markdown
        
    TODO: Enhance with markdown-specific XSS prevention
    """
    if not text:
        return ""
    
    # Basic XSS prevention in markdown
    # Escape HTML tags that aren't part of markdown
    text = bleach.clean(text, tags=[], strip=False)
    
    return text


def mask_api_key(key: str, visible_chars: int = 4) -> str:
    """
    Mask API key for logging (show only last N characters).
    
    Args:
        key: API key to mask
        visible_chars: Number of characters to show at the end
        
    Returns:
        Masked key like "****...abcd"
    """
    if not key or len(key) <= visible_chars:
        return "****"
    
    return f"{'*' * (len(key) - visible_chars)}{key[-visible_chars:]}"


def check_sensitive_content(text: str) -> dict:
    """
    Check for potentially sensitive content.
    
    Args:
        text: Text to check
        
    Returns:
        Dictionary with check results
        
    TODO: Implement comprehensive sensitive content detection
    """
    # Basic patterns for common sensitive data
    patterns = {
        'api_key': r'[a-zA-Z0-9_-]{20,}',
        'email': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
        'phone': r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
    }
    
    results = {}
    for key, pattern in patterns.items():
        matches = re.findall(pattern, text)
        results[key] = len(matches) > 0
    
    return results
