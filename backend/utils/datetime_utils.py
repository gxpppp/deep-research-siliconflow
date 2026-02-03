"""
DateTime utility functions for providing real-time context to LLM.
"""

from datetime import datetime
from typing import Optional


def get_current_datetime(format: str = "YYYY-MM-DD HH:MM:SS") -> str:
    """
    Get current system datetime in specified format.
    
    Args:
        format: Output format string
            - "YYYY-MM-DD HH:MM:SS" (default)
            - "YYYY年MM月DD日 HH:MM:SS"
            - "ISO": ISO 8601 format
            - Custom format string
    
    Returns:
        Formatted datetime string
    """
    now = datetime.now()
    
    if format == "YYYY-MM-DD HH:MM:SS":
        return now.strftime("%Y-%m-%d %H:%M:%S")
    elif format == "YYYY年MM月DD日 HH:MM:SS":
        return now.strftime("%Y年%m月%d日 %H:%M:%S")
    elif format == "ISO":
        return now.isoformat()
    else:
        return now.strftime(format)


def get_datetime_with_timezone() -> str:
    """Get current datetime with timezone info."""
    now = datetime.now()
    tz_name = now.astimezone().tzname()
    return f"{now.strftime('%Y-%m-%d %H:%M:%S')} {tz_name}"


def get_contextual_datetime() -> str:
    """
    Get datetime in a contextual format suitable for LLM prompts.
    Includes date, time, weekday, and timezone.
    """
    now = datetime.now()
    weekdays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
    weekday = weekdays[now.weekday()]
    
    return f"{now.strftime('%Y年%m月%d日')} {weekday} {now.strftime('%H:%M:%S')}"


def generate_time_context() -> str:
    """
    Generate a comprehensive time context string for LLM system prompts.
    This helps the model understand the current temporal context.
    """
    now = datetime.now()
    
    # Basic datetime
    standard_format = now.strftime("%Y-%m-%d %H:%M:%S")
    chinese_format = now.strftime("%Y年%m月%d日 %H:%M:%S")
    
    # Weekday
    weekdays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
    weekday = weekdays[now.weekday()]
    
    # Timezone
    tz_name = now.astimezone().tzname() or "本地时间"
    
    # Time of day description
    hour = now.hour
    if 5 <= hour < 12:
        time_of_day = "上午"
    elif 12 <= hour < 14:
        time_of_day = "中午"
    elif 14 <= hour < 18:
        time_of_day = "下午"
    elif 18 <= hour < 22:
        time_of_day = "晚上"
    else:
        time_of_day = "深夜"
    
    context = f"""【当前时间信息】
- 标准格式：{standard_format}
- 中文格式：{chinese_format} {weekday}
- 时段：{time_of_day}
- 时区：{tz_name}

注意：今天是 {chinese_format} {weekday}。当你回答涉及时间、日期、时效性信息的问题时，请以当前时间为参考基准。"""
    
    return context


def inject_time_to_system_prompt(system_prompt: str) -> str:
    """
    Inject current time context into a system prompt.
    
    Args:
        system_prompt: Original system prompt
        
    Returns:
        System prompt with time context prepended
    """
    time_context = generate_time_context()
    
    # Check if prompt already has time context
    if "【当前时间信息】" in system_prompt:
        # Replace existing time context
        lines = system_prompt.split('\n')
        filtered_lines = []
        skip_until_empty = False
        
        for line in lines:
            if "【当前时间信息】" in line:
                skip_until_empty = True
                continue
            if skip_until_empty:
                if line.strip() == "" or line.startswith("注意："):
                    continue
                skip_until_empty = False
            filtered_lines.append(line)
        
        system_prompt = '\n'.join(filtered_lines)
    
    # Prepend time context
    return f"{time_context}\n\n{system_prompt}"


def format_time_for_search_query() -> str:
    """
    Format current time for search queries to get latest information.
    """
    now = datetime.now()
    year = now.year
    month = now.month
    
    return f"{year}年{month}月"


def get_current_time_context() -> str:
    """
    Get current time context as a simple string for planning prompts.
    
    Returns:
        Simple time context string
    """
    now = datetime.now()
    weekdays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
    weekday = weekdays[now.weekday()]
    
    return f"{now.strftime('%Y年%m月%d日')} {weekday}"
