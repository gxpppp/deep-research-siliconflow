"""
Tests for cache module
"""

import pytest
import asyncio
from utils.cache import InMemoryCache, generate_cache_key, reset_cache


class TestInMemoryCache:
    """Test cases for InMemoryCache"""
    
    @pytest.fixture
    def cache(self):
        """Create a fresh cache instance for each test"""
        return InMemoryCache()
    
    @pytest.mark.asyncio
    async def test_set_and_get(self, cache):
        """Test setting and getting values"""
        await cache.set("key1", "value1")
        result = await cache.get("key1")
        assert result == "value1"
    
    @pytest.mark.asyncio
    async def test_get_nonexistent_key(self, cache):
        """Test getting a key that doesn't exist"""
        result = await cache.get("nonexistent")
        assert result is None
    
    @pytest.mark.asyncio
    async def test_delete(self, cache):
        """Test deleting a key"""
        await cache.set("key1", "value1")
        await cache.delete("key1")
        result = await cache.get("key1")
        assert result is None
    
    @pytest.mark.asyncio
    async def test_clear(self, cache):
        """Test clearing all cache"""
        await cache.set("key1", "value1")
        await cache.set("key2", "value2")
        await cache.clear()
        assert await cache.get("key1") is None
        assert await cache.get("key2") is None
    
    @pytest.mark.asyncio
    async def test_exists(self, cache):
        """Test checking if key exists"""
        await cache.set("key1", "value1")
        assert await cache.exists("key1") is True
        assert await cache.exists("nonexistent") is False
    
    @pytest.mark.asyncio
    async def test_ttl_expiration(self, cache):
        """Test TTL expiration"""
        # Set with very short TTL (0 seconds means immediate expiration)
        await cache.set("key1", "value1", ttl=0)
        # Small delay to ensure expiration
        await asyncio.sleep(0.1)
        # Should be expired
        result = await cache.get("key1")
        assert result is None
    
    @pytest.mark.asyncio
    async def test_complex_data_types(self, cache):
        """Test caching complex data types"""
        data = {
            "list": [1, 2, 3],
            "dict": {"nested": "value"},
            "number": 42,
            "boolean": True,
            "null": None
        }
        await cache.set("complex", data)
        result = await cache.get("complex")
        assert result == data


class TestGenerateCacheKey:
    """Test cases for generate_cache_key function"""
    
    def test_string_input(self):
        """Test with string input"""
        key = generate_cache_key("test_prefix", "test_data")
        assert isinstance(key, str)
        assert key.startswith("test_prefix:")
    
    def test_dict_input(self):
        """Test with dict input"""
        data = {"key": "value", "number": 123}
        key = generate_cache_key("prefix", data)
        assert isinstance(key, str)
        assert "prefix:" in key
    
    def test_consistency(self):
        """Test that same input produces same key"""
        data = {"a": 1, "b": 2}
        key1 = generate_cache_key("test", data)
        key2 = generate_cache_key("test", data)
        assert key1 == key2
    
    def test_different_inputs_different_keys(self):
        """Test that different inputs produce different keys"""
        key1 = generate_cache_key("test", "data1")
        key2 = generate_cache_key("test", "data2")
        assert key1 != key2
    
    def test_multiple_args(self):
        """Test with multiple positional arguments"""
        key = generate_cache_key("test", "arg1", "arg2", 123)
        assert isinstance(key, str)
        assert key.startswith("test:")
    
    def test_kwargs(self):
        """Test with keyword arguments"""
        key = generate_cache_key("test", foo="bar", num=42)
        assert isinstance(key, str)
        assert key.startswith("test:")


class TestResetCache:
    """Test cases for reset_cache function"""
    
    def test_reset_clears_instance(self):
        """Test that reset_cache clears the global instance"""
        # First get creates instance
        from utils.cache import get_cache, _cache_instance
        get_cache()
        assert _cache_instance is not None
        
        # Reset clears it
        reset_cache()
        assert _cache_instance is None


# Integration tests (optional, skipped if Redis not available)
@pytest.mark.skip(reason="Redis not available in test environment")
class TestRedisCache:
    """Test cases for RedisCache - requires running Redis server"""
    
    @pytest.fixture
    async def redis_cache(self):
        """Create a Redis cache instance"""
        from utils.cache import RedisCache
        cache = RedisCache(
            host="localhost",
            port=6379,
            db=15  # Use separate DB for testing
        )
        yield cache
        # Cleanup
        await cache.clear()
    
    @pytest.mark.asyncio
    async def test_redis_set_and_get(self, redis_cache):
        """Test Redis set and get"""
        await redis_cache.set("test_key", "test_value")
        result = await redis_cache.get("test_key")
        assert result == "test_value"
    
    @pytest.mark.asyncio
    async def test_redis_health_check(self, redis_cache):
        """Test Redis health check"""
        is_healthy = await redis_cache.health_check()
        assert is_healthy is True
