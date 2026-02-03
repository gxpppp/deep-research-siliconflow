# models/schemas.py
"""Pydantic schemas for API request/response validation."""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime


class ResearchStatus(str, Enum):
    """Research workflow status enumeration."""
    PENDING = "pending"
    PLANNING = "planning"
    SEARCHING = "searching"
    ANALYZING = "analyzing"
    SYNTHESIZING = "synthesizing"
    COMPLETED = "completed"
    ERROR = "error"
    TIMEOUT = "timeout"


class SearchEngine(str, Enum):
    """Supported search engines."""
    BING = "bing"
    BAIDU = "baidu"
    DUCKDUCKGO = "duckduckgo"
    SERPAPI = "serpapi"


class Settings(BaseModel):
    """User settings for research configuration."""
    api_key: str = Field(..., description="SiliconFlow API key")
    model: str = Field(
        default="deepseek-ai/DeepSeek-V2.5",
        description="Model to use for research"
    )
    search_days: int = Field(
        default=30,
        ge=1,
        le=365,
        description="Search time range in days"
    )
    max_results: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Maximum search results"
    )
    enable_pdf: bool = Field(
        default=True,
        description="Enable PDF analysis"
    )
    language: str = Field(
        default="zh",
        description="Output language (zh/en)"
    )

    @validator('api_key')
    def validate_api_key(cls, v):
        if not v or len(v) < 10:
            raise ValueError('API key must be at least 10 characters')
        return v


class ResearchRequest(BaseModel):
    """Request model for starting a research task."""
    query: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Research query/question"
    )
    settings: Settings = Field(..., description="Research settings")
    conversation_id: Optional[str] = Field(
        None,
        description="Optional conversation ID for multi-turn"
    )

    @validator('query')
    def validate_query(cls, v):
        # TODO: Add XSS filtering
        if not v.strip():
            raise ValueError('Query cannot be empty')
        return v.strip()


class ToolCall(BaseModel):
    """Model for tool call information."""
    tool_name: str = Field(..., description="Name of the tool")
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Tool parameters"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the tool was called"
    )


class ToolResult(BaseModel):
    """Model for tool execution result."""
    tool_name: str = Field(..., description="Name of the tool")
    success: bool = Field(..., description="Whether the call succeeded")
    data: Optional[Any] = Field(None, description="Result data")
    error: Optional[str] = Field(None, description="Error message if failed")
    duration_ms: int = Field(..., description="Execution time in milliseconds")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the result was received"
    )


class SSEEvent(BaseModel):
    """Server-Sent Event model for streaming responses."""
    event_type: str = Field(
        ...,
        description="Event type: status, tool_call, tool_result, content, error, complete"
    )
    data: Dict[str, Any] = Field(..., description="Event payload")
    id: Optional[str] = Field(None, description="Event ID")


class Citation(BaseModel):
    """Citation model for sources."""
    index: int = Field(..., description="Citation number")
    title: str = Field(..., description="Source title")
    source: str = Field(..., description="Source name/publication")
    date: Optional[str] = Field(None, description="Publication date")
    url: str = Field(..., description="Source URL")


class ResearchResponse(BaseModel):
    """Response model for research results."""
    research_id: str = Field(..., description="Unique research ID")
    status: ResearchStatus = Field(..., description="Current status")
    query: str = Field(..., description="Original query")
    
    # Progress tracking
    current_stage: Optional[str] = Field(None, description="Current workflow stage")
    progress_percent: int = Field(0, ge=0, le=100, description="Progress percentage")
    
    # Content
    summary: Optional[str] = Field(None, description="Core summary")
    research_path: Optional[List[str]] = Field(None, description="Research steps taken")
    key_findings: Optional[List[Dict[str, Any]]] = Field(None, description="Key findings")
    multi_dimensional_analysis: Optional[Dict[str, Any]] = Field(None, description="Multi-perspective analysis")
    open_questions: Optional[List[str]] = Field(None, description="Unanswered questions")
    citations: Optional[List[Citation]] = Field(None, description="Reference list")
    full_report: Optional[str] = Field(None, description="Complete markdown report")
    
    # Tool execution log
    tool_calls: List[ToolCall] = Field(default_factory=list)
    tool_results: List[ToolResult] = Field(default_factory=list)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(None)
    total_duration_ms: Optional[int] = Field(None)
    token_usage: Optional[Dict[str, int]] = Field(None)
    
    # Error handling
    error_message: Optional[str] = Field(None)


class HealthCheck(BaseModel):
    """Health check response model."""
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    services: Dict[str, bool] = Field(default_factory=dict)
