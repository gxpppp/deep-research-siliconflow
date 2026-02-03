## 方案概述

使用 `duckduckgo-search` (DDGS) Python 库替换现有的 SerpAPI 搜索引擎。这是一个免费、无需 API Key 的 DuckDuckGo 搜索库。

## 推荐方案: duckduckgo-search (DDGS)

### 库信息
- **PyPI**: `duckduckgo-search`
- **GitHub**: https://github.com/deedy5/duckduckgo_search
- **安装**: `pip install duckduckgo-search`
- **特点**:
  - ✅ 完全免费，无需 API Key
  - ✅ 支持文本、新闻、图片、视频搜索
  - ✅ 支持 AI Chat (DuckDuckGo AI)
  - ✅ 支持代理设置
  - ✅ 支持异步操作
  - ✅ 支持结果去重

### 核心功能
```python
from duckduckgo_search import DDGS

# 文本搜索
results = DDGS().text("Python programming", max_results=10)

# 新闻搜索
results = DDGS().news("AI technology", max_results=10)

# 图片搜索
results = DDGS().images("cat", max_results=10)

# 带时间过滤的搜索
results = DDGS().text("news", timelimit="d")  # d=day, w=week, m=month, y=year
```

## 实施计划

### 1. 安装依赖
```bash
cd backend
venv\Scripts\pip install duckduckgo-search
```

### 2. 创建新的搜索模块
**文件**: `backend/tools/search_duckduckgo.py`

```python
"""DuckDuckGo search tool using duckduckgo-search library."""
from typing import List, Dict, Any, Optional
from duckduckgo_search import DDGS

async def search_duckduckgo(
    query: str,
    max_results: int = 10,
    days: Optional[int] = None,
    region: str = "cn-zh"
) -> Dict[str, Any]:
    """
    Search using DuckDuckGo.
    
    Args:
        query: Search query
        max_results: Maximum number of results
        days: Time filter (optional)
        region: Region code (default: cn-zh for Chinese)
    
    Returns:
        Dict with success status and results
    """
    try:
        # Map days to DDGS timelimit
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
        
        with DDGS() as ddgs:
            results = []
            
            # Get text results
            for r in ddgs.text(
                query,
                max_results=max_results,
                timelimit=timelimit,
                region=region
            ):
                results.append({
                    "title": r.get("title", ""),
                    "link": r.get("href", ""),
                    "snippet": r.get("body", ""),
                    "source": "DuckDuckGo"
                })
            
            return {
                "success": True,
                "results": results,
                "total": len(results)
            }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "results": []
        }
```

### 3. 修改现有搜索模块
**文件**: `backend/tools/search.py`

添加 DuckDuckGo 作为备选或主要搜索引擎：

```python
# Option 1: Replace SerpAPI completely
from .search_duckduckgo import search_duckduckgo as search_web

# Option 2: Use both with fallback
async def search_web(query: str, **kwargs):
    # Try DuckDuckGo first
    result = await search_duckduckgo(query, **kwargs)
    if result["success"] and result["results"]:
        return result
    
    # Fallback to SerpAPI if DDG fails
    return await search_serpapi(query, **kwargs)
```

### 4. 更新配置
**文件**: `backend/config.py`

```python
# Search configuration
SEARCH_ENGINE = os.getenv("SEARCH_ENGINE", "duckduckgo")  # or "serpapi"
SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")  # Optional now
```

### 5. 更新前端设置面板
**文件**: `frontend/src/components/SettingsPanel.tsx`

- 移除 SerpAPI Key 的必填验证
- 添加搜索引擎选择下拉框
- 添加 DuckDuckGo 区域设置选项

## 优势对比

| 特性 | SerpAPI | DuckDuckGo (DDGS) |
|------|---------|-------------------|
| 价格 | 付费/有限免费 | 完全免费 |
| API Key | 必需 | 不需要 |
| 速率限制 | 有 | 较宽松 |
| 隐私 | 一般 | 优秀 |
| 中文支持 | 好 | 好 |
| 稳定性 | 高 | 中等 |

## 注意事项

1. **IP 限制**: DuckDuckGo 可能对频繁请求的 IP 进行限制，建议：
   - 添加请求间隔（rate limiting）
   - 使用代理池（可选）
   - 实现重试机制

2. **结果质量**: DuckDuckGo 结果可能与 Google 略有不同，需要测试验证

3. **异步支持**: DDGS 支持异步操作，可以进一步优化性能

## 文件变更清单

1. **backend/requirements.txt** - 添加 `duckduckgo-search`
2. **backend/tools/search_duckduckgo.py** - 新建 DuckDuckGo 搜索模块
3. **backend/tools/search.py** - 修改以使用新的搜索引擎
4. **backend/config.py** - 添加搜索引擎配置选项
5. **frontend/src/components/SettingsPanel.tsx** - 更新设置面板
6. **backend/agent/workflow.py** - 更新搜索调用（如需要）

请确认这个方案后，我将开始实施具体的代码修改。