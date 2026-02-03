# main.py
"""
DeepResearch Platform - FastAPI Backend
Main application entry point with SSE streaming support.
"""

import os
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import local modules
from models.schemas import (
    ResearchRequest,
    ResearchResponse,
    HealthCheck,
    ResearchStatus
)
from agent.workflow import ResearchWorkflow
from agent.llm import get_available_models
from utils.security import sanitize_input, mask_api_key
from utils.cache import get_cache


# ==========================================
# Application Lifecycle
# ==========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    print("🚀 Starting DeepResearch Platform backend...")
    
    # Verify required environment variables
    required_vars = ["SERPAPI_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"⚠️  Warning: Missing environment variables: {', '.join(missing_vars)}")
    
    # Initialize cache
    cache = get_cache()
    print(f"✅ Cache initialized (type: {type(cache).__name__})")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down DeepResearch Platform backend...")


# ==========================================
# FastAPI App Initialization
# ==========================================

app = FastAPI(
    title="DeepResearch Platform API",
    description="AI-powered deep research with multi-source verification",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# Health Check Endpoint
# ==========================================

@app.get("/health", response_model=HealthCheck)
async def health_check():
    """
    Health check endpoint for monitoring.
    
    Returns:
        HealthCheck: Service status and version info
    """
    services = {
        "api": True,
        "cache": get_cache() is not None,
    }
    
    return HealthCheck(
        status="healthy" if all(services.values()) else "degraded",
        version="1.0.0",
        services=services
    )


# ==========================================
# Models Endpoint
# ==========================================

@app.get("/api/models")
async def get_models():
    """
    Get list of available LLM models.
    
    Returns:
        List of model configurations
    """
    return {
        "models": get_available_models(),
        "default": os.getenv("DEFAULT_MODEL", "deepseek-ai/DeepSeek-V2.5")
    }


# ==========================================
# Main Research Endpoint (SSE Streaming)
# ==========================================

@app.post("/api/research")
async def start_research(request: ResearchRequest):
    """
    Start a research task with Server-Sent Events streaming.
    
    This endpoint initiates the deep research workflow and streams
    progress updates, tool calls, and the final report via SSE.
    
    Args:
        request: ResearchRequest containing query and settings
        
    Returns:
        StreamingResponse with SSE events
        
    Event Types:
        - status: Workflow status updates (planning, searching, etc.)
        - tool_call: Tool execution started
        - tool_result: Tool execution completed
        - complete: Research completed with full report
        - error: Error occurred during research
    """
    # Sanitize input
    query = sanitize_input(request.query)
    
    # Validate API key
    if not request.settings.api_key:
        raise HTTPException(status_code=400, detail="API key is required")
    
    # Log request (mask API key)
    print(f"🔍 Research request: '{query[:50]}...' using model: {request.settings.model}")
    print(f"   API Key: {mask_api_key(request.settings.api_key)}")
    
    # Create workflow instance
    workflow = ResearchWorkflow(
        api_key=request.settings.api_key,
        model=request.settings.model
    )
    
    # Prepare settings
    settings = {
        "search_days": request.settings.search_days,
        "max_results": request.settings.max_results,
        "enable_pdf": request.settings.enable_pdf,
        "language": request.settings.language
    }
    
    async def event_generator() -> AsyncGenerator[str, None]:
        """Generate SSE events from workflow execution."""
        try:
            async for event in workflow.execute(
                query=query,
                settings=settings,
                conversation_id=request.conversation_id
            ):
                yield event
        except Exception as e:
            # Handle unexpected errors
            import json
            error_event = f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
            yield error_event
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


# ==========================================
# Cache Management Endpoints (Admin)
# ==========================================

@app.delete("/api/cache")
async def clear_cache():
    """Clear all cached data."""
    cache = get_cache()
    cache.clear()
    return {"message": "Cache cleared successfully"}


@app.get("/api/cache/stats")
async def get_cache_stats():
    """Get cache statistics."""
    cache = get_cache()
    
    # TODO: Implement proper stats tracking
    return {
        "type": type(cache).__name__,
        "status": "active"
    }


# ==========================================
# Error Handlers
# ==========================================

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    import traceback
    print(f"❌ Unhandled exception: {exc}")
    traceback.print_exc()
    
    raise HTTPException(
        status_code=500,
        detail=f"Internal server error: {str(exc)}"
    )


# ==========================================
# Main Entry Point
# ==========================================

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    
    print(f"""
    ╔══════════════════════════════════════════════════════════╗
    ║           DeepResearch Platform Backend                  ║
    ╠══════════════════════════════════════════════════════════╣
    ║  API Documentation: http://{host}:{port}/docs            ║
    ║  Health Check:      http://{host}:{port}/health          ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
