# agent/llm.py
"""
LLM initialization and configuration for multiple providers.
Supports OpenAI-compatible APIs including SiliconFlow, OpenAI, Azure, Anthropic, Gemini, and custom providers.
"""

import os
import httpx
from typing import Optional, List, Dict, Any
from langchain_openai import ChatOpenAI


# Cache for models list to avoid repeated API calls
_models_cache: Dict[str, List[Dict[str, Any]]] = {}

# Provider configurations
PROVIDER_CONFIGS = {
    'siliconflow': {
        'base_url': 'https://api.siliconflow.cn/v1',
        'api_key_env': 'SILICONFLOW_API_KEY',
    },
    'openai': {
        'base_url': 'https://api.openai.com/v1',
        'api_key_env': 'OPENAI_API_KEY',
    },
    'azure': {
        'base_url': '',  # Must be provided by user
        'api_key_env': 'AZURE_OPENAI_API_KEY',
    },
    'anthropic': {
        'base_url': 'https://api.anthropic.com/v1',
        'api_key_env': 'ANTHROPIC_API_KEY',
    },
    'gemini': {
        'base_url': 'https://generativelanguage.googleapis.com/v1beta',
        'api_key_env': 'GEMINI_API_KEY',
    },
    'custom': {
        'base_url': '',  # Must be provided by user
        'api_key_env': '',
    },
}


def create_llm(
    api_key: str,
    model: Optional[str] = None,
    provider: str = 'siliconflow',
    base_url: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: int = 4000,
    context_length: int = 128000,
    **kwargs
) -> ChatOpenAI:
    """
    Create a LangChain ChatOpenAI instance configured for the specified provider.
    
    Args:
        api_key: API key for the provider
        model: Model name (default from env or provider default)
        provider: Provider identifier (siliconflow, openai, azure, anthropic, gemini, custom)
        base_url: Custom base URL (optional, uses provider default if not specified)
        temperature: Sampling temperature (0-2)
        max_tokens: Maximum tokens to generate
        context_length: Maximum context length for the model
        **kwargs: Additional parameters for ChatOpenAI
        
    Returns:
        Configured ChatOpenAI instance
    """
    # Get provider config
    provider_config = PROVIDER_CONFIGS.get(provider, PROVIDER_CONFIGS['siliconflow'])
    
    # Determine base URL
    if base_url:
        final_base_url = base_url
    elif provider == 'custom':
        raise ValueError("Custom provider requires a base_url")
    else:
        final_base_url = provider_config['base_url']
    
    # Use provided model or fall back to environment/default
    model_name = model or os.getenv(
        "DEFAULT_MODEL",
        "deepseek-ai/DeepSeek-V2.5"
    )
    
    # Create LLM instance with provider-specific configurations
    llm_kwargs = {
        "model": model_name,
        "api_key": api_key,
        "base_url": final_base_url,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    
    # Add provider-specific configurations
    if provider == 'azure':
        llm_kwargs["model_kwargs"] = {
            "engine": model_name,  # Azure uses deployment name as engine
            **kwargs.get("model_kwargs", {})
        }
    elif provider == 'anthropic':
        # Anthropic uses different parameter names
        llm_kwargs["model_kwargs"] = {
            "max_tokens_to_sample": max_tokens,
            **kwargs.get("model_kwargs", {})
        }
    else:
        llm_kwargs["model_kwargs"] = kwargs.get("model_kwargs", {})
    
    # Add any additional kwargs (excluding model_kwargs which we handled above)
    for k, v in kwargs.items():
        if k != "model_kwargs":
            llm_kwargs[k] = v
    
    llm = ChatOpenAI(**llm_kwargs)
    
    return llm


def get_available_models(
    provider: str = 'siliconflow',
    api_key: Optional[str] = None,
    base_url: Optional[str] = None
) -> list:
    """
    Get list of available models for the specified provider.
    
    First tries to fetch from provider API, falls back to hardcoded list
    if API call fails or no API key is available.
    
    Args:
        provider: Provider identifier
        api_key: API key (optional)
        base_url: Custom base URL (optional)
        
    Returns:
        List of model dictionaries with value, label, and description
    """
    cache_key = f"{provider}:{base_url or 'default'}"
    
    # Return cached models if available and fresh (less than 1 hour old)
    if cache_key in _models_cache:
        return _models_cache[cache_key]
    
    # Try to fetch from provider API
    if api_key and api_key not in ['', 'sk-test-placeholder']:
        try:
            models = _fetch_models_from_api(provider, api_key, base_url)
            if models:
                _models_cache[cache_key] = models
                return models
        except Exception as e:
            print(f"⚠️  Failed to fetch models from {provider} API: {e}")
            print("   Using fallback model list")
    
    # Fallback to hardcoded models
    fallback_models = _get_fallback_models(provider)
    _models_cache[cache_key] = fallback_models
    return fallback_models


def _fetch_models_from_api(
    provider: str,
    api_key: str,
    base_url: Optional[str] = None
) -> Optional[List[Dict[str, Any]]]:
    """
    Fetch available models from provider API.
    
    Args:
        provider: Provider identifier
        api_key: API key
        base_url: Custom base URL (optional)
        
    Returns:
        List of model configurations or None if failed
    """
    provider_config = PROVIDER_CONFIGS.get(provider, PROVIDER_CONFIGS['siliconflow'])
    
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Determine base URL
        if base_url:
            url_base = base_url.rstrip('/')
        else:
            url_base = provider_config['base_url'].rstrip('/')
        
        # Different providers use different endpoints
        if provider == 'gemini':
            # Gemini doesn't have a standard /models endpoint like OpenAI
            return _get_fallback_models(provider)
        elif provider == 'anthropic':
            # Anthropic has a different API structure
            url = f"{url_base}/models"
        else:
            # OpenAI-compatible endpoint
            url = f"{url_base}/models"
        
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            # Parse model list (OpenAI-compatible format)
            models = []
            for model_data in data.get("data", []):
                model_id = model_data.get("id", "")
                
                # Skip non-chat models
                if not _is_chat_model(model_id, provider):
                    continue
                
                # Create model config
                model_config = {
                    "value": model_id,
                    "label": _format_model_label(model_id, provider),
                    "description": model_data.get("description", "") or _get_model_description(model_id, provider),
                    "provider": provider,
                }
                models.append(model_config)
            
            # Sort models by priority
            models.sort(key=lambda x: _get_model_priority(x["value"], provider))
            
            print(f"✅ Fetched {len(models)} models from {provider} API")
            return models
            
    except Exception as e:
        raise Exception(f"API request failed: {e}")


def _is_chat_model(model_id: str, provider: str = 'siliconflow') -> bool:
    """Check if model ID represents a chat model."""
    # Provider-specific exclusions
    exclusions = {
        'siliconflow': [
            "embed", "embedding", "bge-", "text-embedding",
            "image", "stable-diffusion", "flux", "sdxl",
            "tts", "whisper", "audio",
            "rerank"
        ],
        'openai': [
            "embedding", "tts", "whisper", "dall-e",
            "text-embedding", "text-moderation"
        ],
        'anthropic': [
            "claude-"  # All anthropic models are chat models, no exclusions needed
        ],
        'gemini': [
            "embedding", "vision"  # Gemini has some non-chat models
        ],
    }
    
    excluded_keywords = exclusions.get(provider, exclusions['siliconflow'])
    model_id_lower = model_id.lower()
    return not any(keyword in model_id_lower for keyword in excluded_keywords)


def _format_model_label(model_id: str, provider: str = 'siliconflow') -> str:
    """Format model ID into a human-readable label."""
    # Extract model name from path
    if "/" in model_id:
        name = model_id.split("/")[-1]
    else:
        name = model_id
    
    model_id_lower = model_id.lower()
    
    # Provider-specific formatting
    if provider == 'openai':
        tags = []
        if 'gpt-4o' in model_id_lower:
            tags.append('多模态旗舰')
        elif 'gpt-4' in model_id_lower:
            tags.append('GPT-4')
        elif 'gpt-3.5' in model_id_lower:
            tags.append('经济实惠')
        tag_str = f" ({', '.join(tags)})" if tags else ""
        return f"{name}{tag_str}"
    
    elif provider == 'anthropic':
        tags = []
        if 'claude-3-5-sonnet' in model_id_lower:
            tags.append('最新版本')
        elif 'claude-3-opus' in model_id_lower:
            tags.append('最强推理')
        elif 'claude-3-haiku' in model_id_lower:
            tags.append('快速响应')
        elif 'claude-3-sonnet' in model_id_lower:
            tags.append('平衡之选')
        tag_str = f" ({', '.join(tags)})" if tags else ""
        return f"{name}{tag_str}"
    
    elif provider == 'gemini':
        tags = []
        if 'gemini-1.5-pro' in model_id_lower:
            tags.append('多模态旗舰')
        elif 'gemini-1.5-flash' in model_id_lower:
            tags.append('轻量快速')
        tag_str = f" ({', '.join(tags)})" if tags else ""
        return f"{name}{tag_str}"
    
    # Default: SiliconFlow formatting (from original code)
    tags = []
    
    # DeepSeek series
    if "deepseek-v3.2" in model_id_lower:
        tags.append("最新版本")
    elif "deepseek-v3.1-terminus" in model_id_lower:
        tags.append("特化版")
    elif "deepseek-v3" in model_id_lower:
        tags.append("最新旗舰")
    elif "deepseek-r1-distill" in model_id_lower:
        tags.append("蒸馏版")
    elif "deepseek-r1" in model_id_lower:
        tags.append("推理专用")
    elif "deepseek-coder-v2" in model_id_lower:
        tags.append("代码专用")
    elif "deepseek-v2.5" in model_id_lower:
        tags.append("性价比")
    elif "deepseek" in model_id_lower:
        tags.append("深度研究")
    
    # Qwen3 series
    elif "qwen3-coder-480b" in model_id_lower:
        tags.append("Qwen3代码旗舰")
    elif "qwen3-vl" in model_id_lower:
        tags.append("Qwen3视觉")
    elif "qwen3-235b" in model_id_lower:
        tags.append("Qwen3旗舰")
    elif "qwen3-30b" in model_id_lower:
        tags.append("Qwen3轻量")
    elif "qwen3-14b" in model_id_lower:
        tags.append("Qwen3标准")
    elif "qwen3-8b" in model_id_lower:
        tags.append("Qwen3轻量")
    elif "qwen3" in model_id_lower:
        tags.append("Qwen3")
    
    # Qwen2.5 series
    elif "qwen2.5-vl-72b" in model_id_lower:
        tags.append("视觉语言旗舰")
    elif "qwen2.5-vl" in model_id_lower:
        tags.append("视觉语言")
    elif "qwen2.5-72b-128k" in model_id_lower:
        tags.append("长上下文")
    elif "qwen2.5-72b" in model_id_lower:
        tags.append("全能旗舰")
    elif "qwen2.5-32b" in model_id_lower:
        tags.append("均衡之选")
    elif "qwen2.5-coder" in model_id_lower:
        tags.append("代码专用")
    elif "qwen2.5-math" in model_id_lower:
        tags.append("数学专用")
    elif "qwen2.5-14b" in model_id_lower:
        tags.append("轻量高效")
    elif "qwen2.5-7b" in model_id_lower:
        tags.append("免费/低成本")
    elif "qwen2.5" in model_id_lower:
        tags.append("Qwen2.5")
    
    # QwQ reasoning
    elif "qwq" in model_id_lower:
        tags.append("推理模型")
    
    # Qwen general
    elif "qwen" in model_id_lower:
        tags.append("全能型")
    
    # Llama series
    elif "llama-3.1-70b" in model_id_lower:
        tags.append("英文旗舰")
    elif "llama-3.1-8b" in model_id_lower:
        tags.append("轻量英文")
    elif "llama" in model_id_lower:
        tags.append("英文优先")
    
    # GLM series
    elif "glm-z1-rumination" in model_id_lower:
        tags.append("智谱深度思考")
    elif "glm-z1" in model_id_lower:
        tags.append("智谱推理")
    elif "glm-4.7" in model_id_lower:
        tags.append("智谱旗舰")
    elif "glm-4.6" in model_id_lower:
        tags.append("智谱高性能")
    elif "glm-4.5" in model_id_lower:
        tags.append("智谱最新")
    elif "glm-4-32b" in model_id_lower:
        tags.append("智谱32B")
    elif "glm" in model_id_lower:
        tags.append("中文轻量")
    
    # Yi series
    elif "yi-1.5-34b" in model_id_lower:
        tags.append("零一万物")
    elif "yi-1.5-9b" in model_id_lower:
        tags.append("零一万物轻量")
    elif "yi-1.5-6b" in model_id_lower:
        tags.append("零一万物超轻量")
    elif "yi" in model_id_lower:
        tags.append("零一万物")
    
    # Other models
    elif "gemma-2" in model_id_lower:
        tags.append("Google")
    elif "gemma" in model_id_lower:
        tags.append("Google")
    elif "kimi-k2.5" in model_id_lower:
        tags.append("月之暗面旗舰")
    elif "kimi-dev" in model_id_lower:
        tags.append("月之暗面开发版")
    elif "kimi" in model_id_lower:
        tags.append("月之暗面")
    elif "minimax-m2.1" in model_id_lower:
        tags.append("MiniMax新版")
    elif "minimax-m1" in model_id_lower:
        tags.append("MiniMax")
    elif "minimax-m2" in model_id_lower:
        tags.append("MiniMax轻量")
    elif "minimax" in model_id_lower:
        tags.append("MiniMax")
    elif "seed" in model_id_lower:
        tags.append("字节跳动")
    elif "ling-flash" in model_id_lower:
        tags.append("阿里灵积极速")
    elif "ling" in model_id_lower:
        tags.append("阿里灵积")
    elif "ring" in model_id_lower:
        tags.append("阿里灵积Ring")
    elif "telemm" in model_id_lower:
        tags.append("电信AI多模态")
    elif "telechat" in model_id_lower:
        tags.append("电信AI")
    elif "kat" in model_id_lower:
        tags.append("快手")
    elif "ernie" in model_id_lower:
        tags.append("百度")
    elif "hunyuan" in model_id_lower:
        tags.append("腾讯混元")
    elif "step" in model_id_lower:
        tags.append("阶跃星辰")
    elif "internlm" in model_id_lower:
        tags.append("书生·浦语")
    
    tag_str = f" ({', '.join(tags)})" if tags else ""
    return f"{name}{tag_str}"


def _get_model_description(model_id: str, provider: str = 'siliconflow') -> str:
    """Get description for a model based on its ID and provider."""
    
    # Provider-specific descriptions
    if provider == 'openai':
        descriptions = {
            "gpt-4o": "OpenAI 最新多模态旗舰模型",
            "gpt-4o-mini": "轻量级多模态模型，快速且经济",
            "gpt-4-turbo": "高性能 GPT-4 模型",
            "gpt-3.5-turbo": "经济实惠，适合日常任务",
        }
    elif provider == 'anthropic':
        descriptions = {
            "claude-3-5-sonnet": "Claude 3.5 Sonnet，智能与速度的最佳平衡",
            "claude-3-opus": "Claude 3 Opus，最强推理能力",
            "claude-3-haiku": "Claude 3 Haiku，快速响应",
        }
    elif provider == 'gemini':
        descriptions = {
            "gemini-1.5-pro": "Google 多模态旗舰模型",
            "gemini-1.5-flash": "轻量快速，适合实时应用",
            "gemini-1.0-pro": "稳定可靠的通用模型",
        }
    else:
        # SiliconFlow descriptions (from original code)
        descriptions = {
            # DeepSeek系列
            "deepseek-v3.2": "DeepSeek V3.2，最新版本，性能进一步提升",
            "deepseek-v3.1-terminus": "DeepSeek V3.1 Terminus版本，针对特定场景优化",
            "deepseek-v3": "DeepSeek最新旗舰模型，671B参数，推理能力卓越",
            "deepseek-r1-distill": "DeepSeek R1蒸馏版，推理能力强且更高效",
            "deepseek-r1": "专为推理优化，数学/代码/逻辑推理能力突出",
            "deepseek-coder-v2": "DeepSeek代码专用模型，编程能力出色",
            "deepseek": "强推理能力，适合复杂分析",
            # Qwen3系列
            "qwen3-235b": "阿里最新Qwen3系列，235B总参数，22B激活参数，MoE架构",
            "qwen3-30b": "阿里Qwen3系列，30B总参数，3B激活参数，MoE架构",
            "qwen3-14b": "阿里Qwen3系列，14B参数，标准Dense模型",
            "qwen3-8b": "阿里Qwen3系列，8B参数，轻量Dense模型",
            "qwen3-vl": "Qwen3视觉语言模型，支持图像理解",
            "qwen3-coder": "Qwen3代码专用模型，编程能力出色",
            "qwen3": "阿里Qwen3系列，最新版本，多尺寸可选",
            # Qwen2.5系列
            "qwen2.5-vl-72b": "Qwen2.5视觉语言模型，72B参数，强大的图像理解能力",
            "qwen2.5-vl-32b": "Qwen2.5视觉语言模型，32B参数，支持图像理解",
            "qwen2.5-vl": "Qwen2.5视觉语言模型，支持图像理解",
            "qwen2.5-72b-128k": "Qwen2.5系列，72B参数，128K长上下文支持",
            "qwen2.5-72b": "阿里Qwen2.5系列，72B参数，中英双语均衡",
            "qwen2.5-32b": "Qwen2.5系列，32B参数，性能与成本平衡",
            "qwen2.5-14b": "Qwen2.5系列，14B参数，轻量高效",
            "qwen2.5-7b": "Qwen2.5系列，7B参数，SiliconFlow免费模型",
            "qwen2.5-coder": "Qwen2.5代码专用模型，编程能力出色",
            "qwen2.5-math": "Qwen2.5数学专用模型，数学推理能力强",
            "qwen2.5": "阿里Qwen2.5系列，多尺寸可选",
            # Qwen2系列
            "qwen2-vl": "Qwen2视觉语言模型，支持图像理解",
            # QwQ推理模型
            "qwq-32b": "Qwen推理模型QwQ，32B参数，思维链推理",
            "qwq": "Qwen推理模型，思维链推理",
            # Qwen通用
            "qwen": "阿里Qwen系列，中英双语均衡",
            # Llama系列
            "llama-3.1-70b": "Meta Llama 3.1，70B参数，英文内容生成质量极高",
            "llama-3.1-8b": "Meta Llama 3.1，8B参数，轻量级英文模型",
            "llama": "Meta开源模型，英文内容生成质量高",
            # GLM系列
            "glm-z1-rumination": "智谱AI GLM-Z1深度思考模型，支持深度推理",
            "glm-z1-32b": "智谱AI GLM-Z1推理模型，32B参数，中文推理能力强",
            "glm-4.7": "智谱AI GLM-4.7，最新旗舰模型，性能卓越",
            "glm-4.6": "智谱AI GLM-4.6，高性能版本",
            "glm-4.5": "智谱AI GLM-4.5，最新版本，多模态能力",
            "glm-4-32b": "智谱AI GLM-4，32B参数版本",
            "glm-4": "智谱AI GLM-4，中文理解能力强",
            "glm": "智谱AI模型，中文理解能力强",
            # Yi系列
            "yi-1.5-34b": "零一万物Yi系列，34B参数，中文对话表现优秀",
            "yi-1.5-9b": "零一万物Yi系列，9B参数，轻量高效",
            "yi-1.5-6b": "零一万物Yi系列，6B参数，超轻量模型",
            "yi": "零一万物模型，中文对话表现优秀",
            # 其他
            "gemma-2": "Google Gemma 2，轻量高效",
            "gemma": "Google开源模型，轻量高效",
            "kimi-k2.5": "月之暗面Kimi K2.5，最新旗舰模型，MoE架构",
            "kimi-k2": "月之暗面Kimi K2，长上下文支持",
            "kimi-dev": "月之暗面Kimi开发版",
            "kimi": "月之暗面Kimi模型",
            "minimax-m2.1": "MiniMax M2.1，更新版本，性能提升",
            "minimax-m1": "MiniMax M1模型，80K上下文，中文对话优秀",
            "minimax-m2": "MiniMax M2轻量模型，响应速度快",
            "minimax": "MiniMax模型，中文对话优秀",
            "seed-oss": "字节跳动Seed开源模型",
            "ling-flash": "阿里灵积极速版，响应速度极快",
            "ling": "阿里灵积系列，适合多种任务",
            "ring": "阿里灵积Ring系列，大规模参数",
            "telemm": "中国电信TeleAI多模态模型",
            "telechat": "中国电信TeleAI模型，中文对话能力强",
            "kat": "快手AI模型，Kwaipilot系列",
            "ernie": "百度文心大模型",
            "hunyuan": "腾讯混元大模型",
            "step": "阶跃星辰Step大模型",
            "internlm": "上海AI Lab书生·浦语模型",
            "mistral": "欧洲开源模型，代码能力出色",
        }
    
    model_id_lower = model_id.lower()
    
    # 优先匹配更具体的描述（按长度降序）
    for key in sorted(descriptions.keys(), key=len, reverse=True):
        if key in model_id_lower:
            return descriptions[key]
    
    return "通用大语言模型"


def _get_model_priority(model_id: str, provider: str = 'siliconflow') -> int:
    """Get priority for sorting models (lower = higher priority)."""
    
    # Provider-specific priorities
    if provider == 'openai':
        exact_priorities = {
            "gpt-4o": 1,
            "gpt-4o-mini": 2,
            "gpt-4-turbo": 3,
            "gpt-4": 4,
            "gpt-3.5-turbo": 5,
        }
    elif provider == 'anthropic':
        exact_priorities = {
            "claude-3-5-sonnet-20241022": 1,
            "claude-3-opus-20240229": 2,
            "claude-3-sonnet-20240229": 3,
            "claude-3-haiku-20240307": 4,
        }
    elif provider == 'gemini':
        exact_priorities = {
            "gemini-1.5-pro": 1,
            "gemini-1.5-flash": 2,
            "gemini-1.0-pro": 3,
        }
    else:
        # SiliconFlow priorities (from original code)
        exact_priorities = {
            # DeepSeek系列
            "deepseek-ai/deepseek-v3": 1,
            "deepseek-ai/deepseek-r1": 2,
            "deepseek-ai/deepseek-r1-distill-qwen-32b": 3,
            "deepseek-ai/deepseek-v2.5": 4,
            # Qwen3系列
            "qwen/qwen3-235b-a22b": 5,
            "qwen/qwen3-30b-a3b": 6,
            "qwen/qwen3-14b": 7,
            "qwen/qwen3-8b": 9,
            # Qwen2.5系列
            "qwen/qwen2.5-72b-instruct-128k": 7,
            "qwen/qwen2.5-72b-instruct": 8,
            "qwen/qwen2.5-32b-instruct": 9,
            "qwen/qwen2.5-14b-instruct": 11,
            "qwen/qwen2.5-7b-instruct": 12,
            "qwen/qwen2.5-coder-32b-instruct": 13,
            "qwen/qwen2.5-math-72b-instruct": 13,
            # QwQ推理模型
            "qwen/qwq-32b": 11,
            # Llama系列
            "meta-llama/meta-llama-3.1-70b-instruct": 10,
            "meta-llama/meta-llama-3.1-8b-instruct": 14,
            # GLM系列
            "thudm/glm-z1-32b-0414": 15,
            "zai-org/glm-4.5": 15,
            "thudm/glm-4-9b-chat": 16,
            # Yi系列
            "01-ai/yi-1.5-34b-chat-16k": 17,
            "01-ai/yi-1.5-9b-chat-16k": 18,
            "01-ai/yi-1.5-6b-chat": 19,
            # 其他
            "google/gemma-2-27b-it": 17,
            "moonshotai/kimi-k2-thinking": 20,
            "minimaxai/minimax-m1-80k": 21,
            "minimaxai/minimax-m2": 22,
            "bytedance-seed/seed-oss-36b-instruct": 23,
            "inclusionai/ling-1t": 24,
            "inclusionai/ling-mini-2.0": 25,
            "teleai/telechat2": 26,
            "kwaipilot/kat-dev": 27,
        }
    
    model_id_lower = model_id.lower()
    
    # 检查精确匹配
    if model_id_lower in exact_priorities:
        return exact_priorities[model_id_lower]
    
    # 模糊匹配（按优先级排序）
    if provider == 'openai':
        priorities = {
            "gpt-4o": 1,
            "gpt-4": 2,
            "gpt-3.5": 3,
        }
    elif provider == 'anthropic':
        priorities = {
            "claude-3-5": 1,
            "claude-3-opus": 2,
            "claude-3-sonnet": 3,
            "claude-3-haiku": 4,
        }
    elif provider == 'gemini':
        priorities = {
            "gemini-1.5-pro": 1,
            "gemini-1.5-flash": 2,
            "gemini-1.0-pro": 3,
        }
    else:
        # SiliconFlow priorities (from original code)
        priorities = {
            # DeepSeek系列
            "deepseek-v3": 1,
            "deepseek-r1-distill": 3,
            "deepseek-r1": 2,
            "deepseek-v2.5": 4,
            "deepseek": 10,
            # Qwen3系列
            "qwen3-235b": 5,
            "qwen3-30b": 6,
            "qwen3-14b": 7,
            "qwen3-8b": 9,
            "qwen3": 8,
            # Qwen2.5系列
            "qwen2.5-72b-128k": 7,
            "qwen2.5-72b": 8,
            "qwen2.5-32b": 9,
            "qwen2.5-coder": 13,
            "qwen2.5-math": 13,
            "qwen2.5-14b": 11,
            "qwen2.5-7b": 12,
            "qwen2.5": 14,
            # QwQ推理
            "qwq-32b": 11,
            "qwq": 15,
            # Qwen通用
            "qwen": 20,
            # Llama系列
            "llama-3.1-70b": 10,
            "llama-3.1-8b": 14,
            "llama": 30,
            # GLM系列
            "glm-z1-32b": 15,
            "glm-4.5": 15,
            "glm-4": 16,
            "glm": 40,
            # Yi系列
            "yi-1.5-34b": 17,
            "yi-1.5-9b": 18,
            "yi-1.5-6b": 19,
            "yi": 41,
            # 其他
            "gemma-2": 17,
            "gemma": 42,
            "kimi-k2": 20,
            "minimax-m1": 21,
            "minimax-m2": 22,
            "minimax": 23,
            "seed-oss": 24,
            "ling": 25,
            "telechat": 26,
            "kat": 27,
            "mistral": 50,
        }
    
    # 优先匹配更具体的key（按长度降序）
    for key in sorted(priorities.keys(), key=len, reverse=True):
        if key in model_id_lower:
            return priorities[key]
    
    return 99


def _get_fallback_models(provider: str = 'siliconflow') -> List[Dict[str, Any]]:
    """Get fallback hardcoded models when API is unavailable."""
    
    if provider == 'openai':
        return [
            {"value": "gpt-4o", "label": "GPT-4o", "description": "最新多模态旗舰"},
            {"value": "gpt-4o-mini", "label": "GPT-4o Mini", "description": "轻量快速"},
            {"value": "gpt-4-turbo", "label": "GPT-4 Turbo", "description": "高性能"},
            {"value": "gpt-3.5-turbo", "label": "GPT-3.5 Turbo", "description": "经济实惠"},
        ]
    elif provider == 'anthropic':
        return [
            {"value": "claude-3-5-sonnet-20241022", "label": "Claude 3.5 Sonnet", "description": "智能与速度平衡"},
            {"value": "claude-3-opus-20240229", "label": "Claude 3 Opus", "description": "最强推理"},
            {"value": "claude-3-haiku-20240307", "label": "Claude 3 Haiku", "description": "快速响应"},
        ]
    elif provider == 'gemini':
        return [
            {"value": "gemini-1.5-pro", "label": "Gemini 1.5 Pro", "description": "多模态旗舰"},
            {"value": "gemini-1.5-flash", "label": "Gemini 1.5 Flash", "description": "轻量快速"},
            {"value": "gemini-1.0-pro", "label": "Gemini 1.0 Pro", "description": "稳定可靠"},
        ]
    elif provider == 'azure':
        return [
            {"value": "gpt-4", "label": "GPT-4", "description": "Azure GPT-4"},
            {"value": "gpt-4o", "label": "GPT-4o", "description": "Azure GPT-4o"},
            {"value": "gpt-35-turbo", "label": "GPT-3.5 Turbo", "description": "Azure GPT-3.5"},
        ]
    else:
        # SiliconFlow fallback (original code)
        return [
            {"value": "deepseek-ai/DeepSeek-V3", "label": "DeepSeek-V3", "description": "最新旗舰，671B参数"},
            {"value": "deepseek-ai/DeepSeek-R1", "label": "DeepSeek-R1", "description": "推理专用"},
            {"value": "deepseek-ai/DeepSeek-V2.5", "label": "DeepSeek-V2.5", "description": "性价比之选"},
            {"value": "Qwen/Qwen3-235B-A22B", "label": "Qwen3-235B", "description": "Qwen3旗舰"},
            {"value": "Qwen/Qwen2.5-72B-Instruct", "label": "Qwen2.5-72B", "description": "全能旗舰"},
            {"value": "meta-llama/Meta-Llama-3.1-70B-Instruct", "label": "Llama-3.1-70B", "description": "英文旗舰"},
        ]


def clear_models_cache():
    """Clear the models cache to force a fresh fetch."""
    global _models_cache
    _models_cache = {}


def estimate_tokens(text: str) -> int:
    """
    Roughly estimate token count for text.
    This is a simple approximation (1 token ≈ 4 characters for CJK).
    
    Args:
        text: Input text
        
    Returns:
        Estimated token count
    """
    if not text:
        return 0
    
    # Simple estimation: ~4 characters per token for CJK, ~4 for English
    # This is a rough approximation
    return len(text) // 4 + 1
