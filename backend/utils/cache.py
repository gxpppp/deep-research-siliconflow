# utils/cache.py
"""Caching utilities with Redis and in-memory implementations."""

import time
import hashlib
import json
import logging
from typing import Any, Optional
from abc import ABC, abstractmethod
import os

# Configure logging
logger = logging.getLogger(__name__)


class CacheInterface(ABC):
    """Abstract cache interface."""
    
    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        pass
    
    @abstractmethod
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache with optional TTL."""
        pass
    
    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete key from cache."""
        pass
    
    @abstractmethod
    async def clear(self) -> None:
        """Clear all cache."""
        pass
    
    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        pass


class InMemoryCache(CacheInterface):
    """
    In-memory cache with TTL support.
    Thread-safe for single-process usage.
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
    
    async def get(self, key: str) -> Optional[Any]:
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
            await self.delete(key)
        return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
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
    
    async def delete(self, key: str) -> None:
        """Delete key from cache."""
        self._cache.pop(key, None)
        self._timestamps.pop(key, None)
        self._ttl.pop(key, None)
    
    async def clear(self) -> None:
        """Clear all cached data."""
        self._cache.clear()
        self._timestamps.clear()
        self._ttl.clear()
    
    async def exists(self, key: str) -> bool:
        """Check if key exists and is not expired."""
        return key in self._cache and not self._is_expired(key)
    
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
    Redis cache implementation with async support.
    """
    
    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None,
        default_ttl: int = 3600
    ):
        """
        Initialize Redis cache.
        
        Args:
            host: Redis host
            port: Redis port
            db: Redis database number
            password: Redis password (optional)
            default_ttl: Default TTL in seconds
        """
        try:
            import redis.asyncio as redis
            self._client = redis.Redis(
                host=host,
                port=port,
                db=db,
                password=password,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                health_check_interval=30
            )
            self.default_ttl = default_ttl
            self._connected = False
            logger.info(f"Redis cache initialized: {host}:{port}/{db}")
        except ImportError:
            logger.error("redis package not installed. Run: pip install redis")
            raise
    
    async def _ensure_connection(self):
        """Ensure Redis connection is established."""
        if not self._connected:
            try:
                await self._client.ping()
                self._connected = True
                logger.info("Redis connection established")
            except Exception as e:
                logger.error(f"Redis connection failed: {e}")
                raise
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from Redis.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        await self._ensure_connection()
        try:
            data = await self._client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Redis get error for key {key}: {e}")
            return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> None:
        """
        Set value in Redis.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Optional custom TTL in seconds
        """
        await self._ensure_connection()
        try:
            serialized = json.dumps(value, default=str)
            await self._client.setex(
                key,
                ttl or self.default_ttl,
                serialized
            )
        except Exception as e:
            logger.error(f"Redis set error for key {key}: {e}")
            raise
    
    async def delete(self, key: str) -> None:
        """Delete key from Redis."""
        await self._ensure_connection()
        try:
            await self._client.delete(key)
        except Exception as e:
            logger.error(f"Redis delete error for key {key}: {e}")
            raise
    
    async def clear(self) -> None:
        """Clear all cache in current Redis database."""
        await self._ensure_connection()
        try:
            await self._client.flushdb()
            logger.info("Redis cache cleared")
        except Exception as e:
            logger.error(f"Redis clear error: {e}")
            raise
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in Redis."""
        await self._ensure_connection()
        try:
            return await self._client.exists(key) > 0
        except Exception as e:
            logger.error(f"Redis exists error for key {key}: {e}")
            return False
    
    async def health_check(self) -> bool:
        """Check Redis connection health."""
        try:
            await self._client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False


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
            try:
                _cache_instance = RedisCache(
                    host=os.getenv("REDIS_HOST", "localhost"),
                    port=int(os.getenv("REDIS_PORT", "6379")),
                    db=int(os.getenv("REDIS_DB", "0")),
                    password=os.getenv("REDIS_PASSWORD"),
                    default_ttl=int(os.getenv("CACHE_TTL", "3600"))
                )
                logger.info("Using Redis cache")
            except Exception as e:
                logger.warning(f"Failed to initialize Redis cache: {e}. Falling back to in-memory cache.")
                _cache_instance = InMemoryCache(
                    default_ttl=int(os.getenv("CACHE_TTL", "3600"))
                )
        else:
            _cache_instance = InMemoryCache(
                default_ttl=int(os.getenv("CACHE_TTL", "3600"))
            )
            logger.info("Using in-memory cache")
    
    return _cache_instance


def reset_cache() -> None:
    """Reset global cache instance (useful for testing)."""
    global _cache_instance
    _cache_instance = None
    logger.info("Cache instance reset")


def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    """
    Generate a cache key from arguments.
    
    Args:
        prefix: Key prefix for namespacing
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
    hash_value = hashlib.md5(key_string.encode()).hexdigest()
    return f"{prefix}:{hash_value}"


# Decorator for caching function results
def cached(prefix: str, ttl: Optional[int] = None):
    """
    Decorator to cache function results.
    
    Args:
        prefix: Cache key prefix
        ttl: Optional custom TTL in seconds
        
    Usage:
        @cached("search_results", ttl=300)
        async def search(query: str):
            # Expensive operation
            return results
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            cache = get_cache()
            
            # Generate cache key
            cache_key = generate_cache_key(prefix, *args, **kwargs)
            
            # Try to get from cache
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_value
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            await cache.set(cache_key, result, ttl)
            logger.debug(f"Cache set for {cache_key}")
            
            return result
        
        return wrapper
    return decorator
