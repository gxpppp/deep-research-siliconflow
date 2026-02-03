## 问题
研究过程中出现错误: `Object of type datetime is not JSON serializable`

## 原因
`ToolCall` 和 `ToolResult` 模型包含 `datetime` 类型的 `timestamp` 字段，Python 的 `json.dumps` 默认无法序列化 datetime 对象。

## 修复方案
修改 `backend/agent/workflow.py` 中的 `_sse_event` 方法，添加自定义 JSON 编码器：

1. 创建自定义 `JSONEncoder` 类来处理 datetime 对象
2. 修改 `_sse_event` 方法使用自定义编码器

## 代码修改
```python
# 在文件顶部添加
from datetime import datetime

class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle datetime objects."""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# 修改 _sse_event 方法
def _sse_event(self, event_type: str, data: Dict[str, Any]) -> str:
    """Format data as SSE event."""
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False, cls=DateTimeEncoder)}\n\n"
```

请确认后我将执行修复。