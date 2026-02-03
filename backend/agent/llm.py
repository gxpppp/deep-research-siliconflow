# agent/llm.py
"""
LLM initialization and configuration for SiliconFlow API.
Uses OpenAI-compatible interface.
"""

import os
import httpx
from typing import Optional, List, Dict, Any
from langchain_openai import ChatOpenAI


# Cache for models list to avoid repeated API calls
_models_cache: Optional[List[Dict[str, Any]]] = None


def create_llm(
    api_key: str,
    model: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: int = 4000,
    **kwargs
) -> ChatOpenAI:
    """
    Create a LangChain ChatOpenAI instance configured for SiliconFlow.
    
    Args:
        api_key: SiliconFlow API key
        model: Model name (default from env or DeepSeek-V2.5)
        temperature: Sampling temperature (0-1)
        max_tokens: Maximum tokens to generate
        **kwargs: Additional parameters for ChatOpenAI
        
    Returns:
        Configured ChatOpenAI instance
        
    TODO: Add support for streaming responses
    TODO: Implement token usage tracking
    """
    # Use provided model or fall back to environment/default
    model_name = model or os.getenv(
        "DEFAULT_MODEL",
        "deepseek-ai/DeepSeek-V2.5"
    )
    
    # SiliconFlow base URL
    base_url = os.getenv(
        "SILICONFLOW_BASE_URL",
        "https://api.siliconflow.cn/v1"
    )
    
    # Create LLM instance
    llm = ChatOpenAI(
        model=model_name,
        api_key=api_key,
        base_url=base_url,
        temperature=temperature,
        max_tokens=max_tokens,
        # SiliconFlow-specific configuration
        model_kwargs={
            # Add any SiliconFlow-specific parameters here
            **kwargs.get("model_kwargs", {})
        },
        **{k: v for k, v in kwargs.items() if k != "model_kwargs"}
    )
    
    return llm


def get_available_models() -> list:
    """
    Get list of available models for SiliconFlow.
    
    First tries to fetch from SiliconFlow API, falls back to hardcoded list
    if API call fails or no API key is available.
    
    Returns:
        List of model dictionaries with value, label, and description
    """
    global _models_cache
    
    # Return cached models if available
    if _models_cache is not None:
        return _models_cache
    
    # Try to fetch from SiliconFlow API
    api_key = os.getenv("SILICONFLOW_API_KEY")
    base_url = os.getenv("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1")
    
    if api_key and api_key != "sk-test-placeholder":
        try:
            models = _fetch_models_from_api(api_key, base_url)
            if models:
                _models_cache = models
                return models
        except Exception as e:
            print(f"⚠️  Failed to fetch models from SiliconFlow API: {e}")
            print("   Using fallback model list")
    
    # Fallback to hardcoded models
    _models_cache = _get_fallback_models()
    return _models_cache


def _fetch_models_from_api(api_key: str, base_url: str) -> Optional[List[Dict[str, Any]]]:
    """
    Fetch available models from SiliconFlow API.
    
    Args:
        api_key: SiliconFlow API key
        base_url: API base URL
        
    Returns:
        List of model configurations or None if failed
    """
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # SiliconFlow uses OpenAI-compatible /models endpoint
        url = f"{base_url}/models"
        
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            # Parse SiliconFlow model list
            models = []
            for model_data in data.get("data", []):
                model_id = model_data.get("id", "")
                
                # Skip non-chat models
                if not _is_chat_model(model_id):
                    continue
                
                # Create model config
                model_config = {
                    "value": model_id,
                    "label": _format_model_label(model_id),
                    "description": model_data.get("description", "") or _get_model_description(model_id)
                }
                models.append(model_config)
            
            # Sort models by priority
            models.sort(key=lambda x: _get_model_priority(x["value"]))
            
            print(f"✅ Fetched {len(models)} models from SiliconFlow API")
            return models
            
    except Exception as e:
        raise Exception(f"API request failed: {e}")


def _is_chat_model(model_id: str) -> bool:
    """Check if model ID represents a chat model."""
    # Exclude embedding, image, and other non-chat models
    excluded_keywords = [
        "embed", "embedding", "bge-", "text-embedding",
        "image", "stable-diffusion", "flux", "sdxl",
        "tts", "whisper", "audio",
        "rerank"
    ]
    model_id_lower = model_id.lower()
    return not any(keyword in model_id_lower for keyword in excluded_keywords)


def _format_model_label(model_id: str) -> str:
    """Format model ID into a human-readable label."""
    # Extract model name from path
    if "/" in model_id:
        name = model_id.split("/")[-1]
    else:
        name = model_id
    
    model_id_lower = model_id.lower()
    
    # Add tags based on model type and capabilities
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


def _get_model_description(model_id: str) -> str:
    """Get description for a model based on its ID."""
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


def _get_model_priority(model_id: str) -> int:
    """Get priority for sorting models (lower = higher priority).
    
    Priority order (updated with SiliconFlow 2025 models):
    1. DeepSeek-V3 (最新旗舰)
    2. DeepSeek-R1 (推理专用)
    3. DeepSeek-R1-Distill (蒸馏版)
    4. DeepSeek-V2.5
    5. Qwen3-235B-A22B (Qwen3旗舰)
    6. Qwen3-30B-A3B (Qwen3轻量)
    7. Qwen3-14B / Qwen2.5-72B-128K
    8. Qwen2.5-72B
    9. Qwen2.5-32B / Qwen3-8B
    10. Llama-3.1-70B
    11. Qwen2.5-14B / QwQ-32B
    12. Qwen2.5-7B (免费)
    13. Llama-3.1-8B
    14. GLM-Z1-32B / GLM-4.5
    15. Yi-1.5-34B / Gemma-2-27B
    16. 其他模型
    """
    # 精确匹配优先
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


def _get_fallback_models() -> List[Dict[str, Any]]:
    """Get fallback hardcoded models when API is unavailable.
    
    Updated with SiliconFlow's latest available models (2025).
    Source: https://cloud.siliconflow.cn/open/models
    Extracted from official model list HTML.
    """
    return [
        # DeepSeek Series - 深度研究推荐
        {
            "value": "deepseek-ai/DeepSeek-V3",
            "label": "DeepSeek-V3 (最新旗舰)",
            "description": "DeepSeek最新旗舰模型，671B参数，128K上下文，推理能力卓越"
        },
        {
            "value": "deepseek-ai/DeepSeek-R1",
            "label": "DeepSeek-R1 (推理专用)",
            "description": "专为推理优化，数学/代码/逻辑推理能力突出，128K上下文"
        },
        {
            "value": "deepseek-ai/DeepSeek-V2.5",
            "label": "DeepSeek-V2.5 (性价比之选)",
            "description": "强推理能力，适合复杂分析，128K上下文，成本效益优秀"
        },
        {
            "value": "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
            "label": "DeepSeek-R1-Distill-Qwen-32B (蒸馏版)",
            "description": "DeepSeek R1蒸馏版，32B参数，推理能力强且更高效"
        },
        {
            "value": "deepseek-ai/DeepSeek-V3.2",
            "label": "DeepSeek-V3.2 (最新版本)",
            "description": "DeepSeek V3.2，最新版本，性能进一步提升"
        },
        {
            "value": "deepseek-ai/DeepSeek-V3.1-Terminus",
            "label": "DeepSeek-V3.1-Terminus (特化版)",
            "description": "DeepSeek V3.1 Terminus版本，针对特定场景优化"
        },
        {
            "value": "deepseek-ai/DeepSeek-Coder-V2-Instruct",
            "label": "DeepSeek-Coder-V2 (代码专用)",
            "description": "DeepSeek代码专用模型，编程能力出色"
        },
        # Qwen Series - 全能型
        {
            "value": "Qwen/Qwen3-235B-A22B",
            "label": "Qwen3-235B-A22B (Qwen3旗舰)",
            "description": "阿里最新Qwen3系列，235B总参数，22B激活参数，MoE架构"
        },
        {
            "value": "Qwen/Qwen3-30B-A3B",
            "label": "Qwen3-30B-A3B (Qwen3轻量)",
            "description": "阿里Qwen3系列，30B总参数，3B激活参数，MoE架构"
        },
        {
            "value": "Qwen/Qwen3-14B",
            "label": "Qwen3-14B (Qwen3标准)",
            "description": "阿里Qwen3系列，14B参数，标准Dense模型"
        },
        {
            "value": "Qwen/Qwen3-8B",
            "label": "Qwen3-8B (Qwen3轻量)",
            "description": "阿里Qwen3系列，8B参数，轻量Dense模型"
        },
        {
            "value": "Qwen/Qwen2.5-72B-Instruct-128K",
            "label": "Qwen2.5-72B-128K (长上下文)",
            "description": "Qwen2.5系列，72B参数，128K长上下文支持"
        },
        {
            "value": "Qwen/Qwen2.5-72B-Instruct",
            "label": "Qwen2.5-72B (全能旗舰)",
            "description": "阿里Qwen2.5系列，72B参数，中英双语均衡"
        },
        {
            "value": "Qwen/Qwen2.5-32B-Instruct",
            "label": "Qwen2.5-32B (均衡之选)",
            "description": "Qwen2.5系列，32B参数，性能与成本平衡"
        },
        {
            "value": "Qwen/Qwen2.5-14B-Instruct",
            "label": "Qwen2.5-14B (轻量高效)",
            "description": "Qwen2.5系列，14B参数，轻量高效，适合日常任务"
        },
        {
            "value": "Qwen/Qwen2.5-7B-Instruct",
            "label": "Qwen2.5-7B (免费/低成本)",
            "description": "Qwen2.5系列，7B参数，SiliconFlow免费模型"
        },
        {
            "value": "Qwen/Qwen2.5-Coder-32B-Instruct",
            "label": "Qwen2.5-Coder-32B (代码专用)",
            "description": "Qwen2.5代码专用模型，32B参数，编程能力出色"
        },
        {
            "value": "Qwen/Qwen2.5-Math-72B-Instruct",
            "label": "Qwen2.5-Math-72B (数学专用)",
            "description": "Qwen2.5数学专用模型，72B参数，数学推理能力强"
        },
        {
            "value": "Qwen/QwQ-32B",
            "label": "QwQ-32B (推理模型)",
            "description": "Qwen推理模型QwQ，32B参数，思维链推理"
        },
        {
            "value": "Qwen/Qwen2.5-VL-32B-Instruct",
            "label": "Qwen2.5-VL-32B (视觉语言)",
            "description": "Qwen2.5视觉语言模型，32B参数，支持图像理解"
        },
        {
            "value": "Qwen/Qwen2.5-VL-72B-Instruct",
            "label": "Qwen2.5-VL-72B (视觉语言旗舰)",
            "description": "Qwen2.5视觉语言模型，72B参数，强大的图像理解能力"
        },
        {
            "value": "Qwen/Qwen2-VL-72B-Instruct",
            "label": "Qwen2-VL-72B (视觉语言)",
            "description": "Qwen2视觉语言模型，72B参数"
        },
        {
            "value": "Qwen/Qwen3-VL-32B-Instruct",
            "label": "Qwen3-VL-32B (Qwen3视觉)",
            "description": "Qwen3视觉语言模型，32B参数"
        },
        {
            "value": "Qwen/Qwen3-Coder-480B-A35B-Instruct",
            "label": "Qwen3-Coder-480B (Qwen3代码旗舰)",
            "description": "Qwen3代码专用模型，480B总参数，35B激活参数"
        },
        # Llama Series - 英文优先
        {
            "value": "meta-llama/Meta-Llama-3.1-70B-Instruct",
            "label": "Llama-3.1-70B (英文旗舰)",
            "description": "Meta Llama 3.1，70B参数，英文内容生成质量极高"
        },
        {
            "value": "meta-llama/Meta-Llama-3.1-8B-Instruct",
            "label": "Llama-3.1-8B (轻量英文)",
            "description": "Meta Llama 3.1，8B参数，轻量级英文模型"
        },
        # GLM Series - 中文理解
        {
            "value": "THUDM/GLM-Z1-32B-0414",
            "label": "GLM-Z1-32B (智谱推理)",
            "description": "智谱AI GLM-Z1推理模型，32B参数，中文推理能力强"
        },
        {
            "value": "THUDM/glm-4-9b-chat",
            "label": "GLM-4-9B (中文轻量)",
            "description": "智谱AI GLM-4，9B参数，中文理解能力强"
        },
        {
            "value": "zai-org/GLM-4.5",
            "label": "GLM-4.5 (智谱最新)",
            "description": "智谱AI GLM-4.5，最新版本，多模态能力"
        },
        {
            "value": "zai-org/GLM-4.7",
            "label": "GLM-4.7 (智谱旗舰)",
            "description": "智谱AI GLM-4.7，最新旗舰模型，性能卓越"
        },
        {
            "value": "zai-org/GLM-4.6",
            "label": "GLM-4.6 (智谱高性能)",
            "description": "智谱AI GLM-4.6，高性能版本"
        },
        {
            "value": "THUDM/GLM-4-32B-0414",
            "label": "GLM-4-32B (智谱32B)",
            "description": "智谱AI GLM-4，32B参数版本"
        },
        {
            "value": "THUDM/GLM-Z1-Rumination-32B-0414",
            "label": "GLM-Z1-Rumination-32B (深度思考)",
            "description": "智谱AI GLM-Z1深度思考模型，32B参数"
        },
        # 其他热门模型
        {
            "value": "01-ai/Yi-1.5-34B-Chat-16K",
            "label": "Yi-1.5-34B (零一万物)",
            "description": "零一万物Yi系列，34B参数，16K上下文"
        },
        {
            "value": "01-ai/Yi-1.5-9B-Chat-16K",
            "label": "Yi-1.5-9B (零一万物轻量)",
            "description": "零一万物Yi系列，9B参数，轻量高效"
        },
        {
            "value": "01-ai/Yi-1.5-6B-Chat",
            "label": "Yi-1.5-6B (零一万物超轻量)",
            "description": "零一万物Yi系列，6B参数，超轻量模型"
        },
        {
            "value": "google/gemma-2-27b-it",
            "label": "Gemma-2-27B (Google)",
            "description": "Google Gemma 2，27B参数，轻量高效"
        },
        {
            "value": "moonshotai/Kimi-K2.5",
            "label": "Kimi-K2.5 (月之暗面旗舰)",
            "description": "月之暗面Kimi K2.5，最新旗舰模型，MoE架构"
        },
        {
            "value": "moonshotai/Kimi-K2-Thinking",
            "label": "Kimi-K2-Thinking (月之暗面)",
            "description": "月之暗面Kimi K2推理模型，长上下文支持"
        },
        {
            "value": "moonshotai/Kimi-K2-Instruct-0711",
            "label": "Kimi-K2-Instruct-0711 (月之暗面)",
            "description": "月之暗面Kimi K2指令模型，0711版本"
        },
        {
            "value": "moonshotai/Kimi-Dev-72B",
            "label": "Kimi-Dev-72B (月之暗面开发版)",
            "description": "月之暗面Kimi开发版，72B参数"
        },
        {
            "value": "MiniMaxAI/MiniMax-M1-80k",
            "label": "MiniMax-M1-80k (MiniMax)",
            "description": "MiniMax M1模型，80K上下文，中文对话优秀"
        },
        {
            "value": "MiniMaxAI/MiniMax-M2",
            "label": "MiniMax-M2 (MiniMax轻量)",
            "description": "MiniMax M2轻量模型，响应速度快"
        },
        {
            "value": "MiniMaxAI/MiniMax-M2.1",
            "label": "MiniMax-M2.1 (MiniMax新版)",
            "description": "MiniMax M2.1，更新版本，性能提升"
        },
        {
            "value": "ByteDance-Seed/Seed-OSS-36B-Instruct",
            "label": "Seed-OSS-36B (字节跳动)",
            "description": "字节跳动Seed开源模型，36B参数"
        },
        {
            "value": "inclusionAI/Ling-1T",
            "label": "Ling-1T (阿里灵积)",
            "description": "阿里灵积系列，适合多种任务"
        },
        {
            "value": "inclusionAI/Ling-mini-2.0",
            "label": "Ling-mini-2.0 (阿里灵积轻量)",
            "description": "阿里灵积轻量版，适合边缘部署"
        },
        {
            "value": "inclusionAI/Ling-flash-2.0",
            "label": "Ling-flash-2.0 (阿里灵积极速)",
            "description": "阿里灵积极速版，响应速度极快"
        },
        {
            "value": "inclusionAI/Ring-1T",
            "label": "Ring-1T (阿里灵积Ring)",
            "description": "阿里灵积Ring系列，1T参数规模"
        },
        {
            "value": "inclusionAI/Ring-flash-2.0",
            "label": "Ring-flash-2.0 (阿里灵积Ring极速)",
            "description": "阿里灵积Ring极速版"
        },
        {
            "value": "TeleAI/TeleChat2",
            "label": "TeleChat2 (电信AI)",
            "description": "中国电信TeleAI模型，中文对话能力强"
        },
        {
            "value": "TeleAI/TeleMM",
            "label": "TeleMM (电信AI多模态)",
            "description": "中国电信TeleAI多模态模型"
        },
        {
            "value": "Kwaipilot/KAT-Dev",
            "label": "KAT-Dev (快手)",
            "description": "快手AI模型，Kwaipilot系列"
        },
        {
            "value": "baidu/ERNIE-4.5-300B-A47B",
            "label": "ERNIE-4.5-300B (百度)",
            "description": "百度文心ERNIE 4.5，300B总参数，47B激活参数"
        },
        {
            "value": "Tencent/Hunyuan-A52B-Instruct",
            "label": "Hunyuan-A52B (腾讯混元)",
            "description": "腾讯混元大模型，52B激活参数"
        },
        {
            "value": "tencent/Hunyuan-A13B-Instruct",
            "label": "Hunyuan-A13B (腾讯混元轻量)",
            "description": "腾讯混元大模型，13B激活参数"
        },
        {
            "value": "stepfun-ai/step3",
            "label": "Step-3 (阶跃星辰)",
            "description": "阶跃星辰Step-3大模型"
        },
        {
            "value": "internlm/internlm2_5-20b-chat",
            "label": "InternLM2.5-20B (书生·浦语)",
            "description": "上海AI Lab书生·浦语2.5，20B参数"
        },
        {
            "value": "internlm/internlm2_5-7b-chat",
            "label": "InternLM2.5-7B (书生·浦语轻量)",
            "description": "上海AI Lab书生·浦语2.5，7B参数"
        }
    ]


def clear_models_cache():
    """Clear the models cache to force a fresh fetch."""
    global _models_cache
    _models_cache = None


def estimate_tokens(text: str) -> int:
    """
    Roughly estimate token count for text.
    This is a simple approximation (1 token ≈ 4 characters for CJK).
    
    Args:
        text: Input text
        
    Returns:
        Estimated token count
        
    TODO: Use proper tokenizer (tiktoken or model-specific)
    """
    if not text:
        return 0
    
    # Simple estimation: ~4 characters per token for CJK, ~4 for English
    # This is a rough approximation
    return len(text) // 4 + 1
