# utils/cache.py
"""Caching utilities - MVP uses in-memory cache, upgradable to Redis."""

import time
import hashlib
import json
from typing import Any, Optional
from abc import ABC, abstractmethod
import os


class CacheInterface(ABC):
    """Abstract cache interface."""
    
    @abstractmethod
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        pass
    
    @abstractmethod
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache with optional TTL."""
        pass
    
    @abstractmethod
    def delete(self, key: str) -> None:
        """Delete key from cache."""
        pass
    
    @abstractmethod
    def clear(self) -> None:
        """Clear all cache."""
        pass


class InMemoryCache(CacheInterface):
    """
    In-memory cache with TTL support.
    MVP implementation - thread-safe for single-process usage.
    TODO: Replace with Redis for production multi-instance deployment.
    """
    
    def __init__(self, default_ttl: int = 3600):
        """
        Initialize in-memory cache.
        
        Args:
            default_ttl: Default time-to-live in seconds (default: 1 hour)
        """
        self._cache: dict = {}
        self._timestamps: dict = {}
        self._ttl: dict = {}
        self.default_ttl = default_ttl
    
    def _is_expired(self, key: str) -> bool:
        """Check if a key has expired."""
        if key not in self._timestamps:
            return True
        ttl = self._ttl.get(key, self.default_ttl)
        return (time.time() - self._timestamps[key]) > ttl
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found/expired
        """
        if key in self._cache and not self._is_expired(key):
            return self._cache[key]
        # Clean up expired entry
        if key in self._cache:
            self.delete(key)
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Optional custom TTL in seconds
        """
        self._cache[key] = value
        self._timestamps[key] = time.time()
        self._ttl[key] = ttl or self.default_ttl
    
    def delete(self, key: str) -> None:
        """Delete key from cache."""
        self._cache.pop(key, None)
        self._timestamps.pop(key, None)
        self._ttl.pop(key, None)
    
    def clear(self) -> None:
        """Clear all cached data."""
        self._cache.clear()
        self._timestamps.clear()
        self._ttl.clear()
    
    def cleanup_expired(self) -> int:
        """
        Remove all expired entries.
        
        Returns:
            Number of entries removed
        """
        expired_keys = [
            key for key in list(self._cache.keys())
            if self._is_expired(key)
        ]
        for key in expired_keys:
            self.delete(key)
        return len(expired_keys)


class RedisCache(CacheInterface):
    """
    Redis cache implementation.
    TODO: Implement when CACHE_TYPE=redis is set in environment.
    """
    
    def __init__(self, host: str = "localhost", port: int = 6379, db: int = 0):
        """
        Initialize Redis cache.
        
        Args:
            host: Redis host
            port: Redis port
            db: Redis database number
        """
        # TODO: Implement Redis connection
        # import redis
        # self._client = redis.Redis(host=host, port=port, db=db, decode_responses=True)
        raise NotImplementedError("Redis cache not yet implemented")
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from Redis."""
        # TODO: Implement
        pass
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in Redis."""
        # TODO: Implement
        pass
    
    def delete(self, key: str) -> None:
        """Delete key from Redis."""
        # TODO: Implement
        pass
    
    def clear(self) -> None:
        """Clear Redis cache."""
        # TODO: Implement
        pass


# Global cache instance
_cache_instance: Optional[CacheInterface] = None


def get_cache() -> CacheInterface:
    """
    Get or create global cache instance.
    
    Returns:
        CacheInterface implementation based on environment config
    """
    global _cache_instance
    
    if _cache_instance is None:
        cache_type = os.getenv("CACHE_TYPE", "memory").lower()
        
        if cache_type == "redis":
            # TODO: Initialize Redis cache
            # _cache_instance = RedisCache(
            #     host=os.getenv("REDIS_HOST", "localhost"),
            #     port=int(os.getenv("REDIS_PORT", "6379")),
            #     db=int(os.getenv("REDIS_DB", "0"))
            # )
            # Fallback to memory cache for MVP
            _cache_instance = InMemoryCache(
                default_ttl=int(os.getenv("CACHE_TTL", "3600"))
            )
        else:
            _cache_instance = InMemoryCache(
                default_ttl=int(os.getenv("CACHE_TTL", "3600"))
            )
    
    return _cache_instance


def generate_cache_key(*args, **kwargs) -> str:
    """
    Generate a cache key from arguments.
    
    Args:
        *args: Positional arguments
        **kwargs: Keyword arguments
        
    Returns:
        MD5 hash string to use as cache key
    """
    key_data = {
        "args": args,
        "kwargs": kwargs
    }
    key_string = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.md5(key_string.encode()).hexdigest()
