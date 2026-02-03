"""
Workflow management API routes.
"""

import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from workflow_engine import WorkflowGraph, WorkflowExecutor, NodeRegistry
from models.schemas import ResearchRequest

router = APIRouter(prefix="/workflows", tags=["workflows"])

# Workflow storage directory
WORKFLOWS_DIR = Path(__file__).parent.parent / "data" / "workflows"
WORKFLOWS_DIR.mkdir(parents=True, exist_ok=True)


# Pydantic models
class WorkflowCreateRequest(BaseModel):
    name: str = Field(..., description="Workflow name")
    description: str = Field(default="", description="Workflow description")
    nodes: List[Dict[str, Any]] = Field(default_factory=list)
    edges: List[Dict[str, Any]] = Field(default_factory=list)


class WorkflowUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    nodes: Optional[List[Dict[str, Any]]] = None
    edges: Optional[List[Dict[str, Any]]] = None


class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: str
    version: str
    created_at: str
    updated_at: str
    node_count: int
    edge_count: int


class WorkflowDetailResponse(WorkflowResponse):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


class NodeTypeResponse(BaseModel):
    type: str
    name: str
    description: str
    schema: Dict[str, Any]


# Helper functions
def get_workflow_path(workflow_id: str) -> Path:
    """Get file path for a workflow."""
    return WORKFLOWS_DIR / f"{workflow_id}.json"


def list_workflows() -> List[WorkflowResponse]:
    """List all saved workflows."""
    workflows = []
    for workflow_file in WORKFLOWS_DIR.glob("*.json"):
        try:
            workflow = WorkflowGraph.load(str(workflow_file))
            workflows.append(WorkflowResponse(
                id=workflow.id,
                name=workflow.metadata.name,
                description=workflow.metadata.description,
                version=workflow.metadata.version,
                created_at=workflow.metadata.created_at,
                updated_at=workflow.metadata.updated_at,
                node_count=len(workflow.nodes),
                edge_count=len(workflow.edges)
            ))
        except Exception as e:
            continue
    return workflows


# API Routes
@router.get("", response_model=List[WorkflowResponse])
async def get_workflows():
    """Get list of all workflows."""
    return list_workflows()


@router.post("", response_model=WorkflowResponse)
async def create_workflow(request: WorkflowCreateRequest):
    """Create a new workflow."""
    workflow = WorkflowGraph()
    workflow.metadata.name = request.name
    workflow.metadata.description = request.description
    workflow.metadata.created_at = datetime.now().isoformat()
    workflow.metadata.updated_at = workflow.metadata.created_at
    
    # Add nodes
    for node_data in request.nodes:
        node = workflow.nodes.create_node(node_data)
        if node:
            workflow.add_node(node)
    
    # Add edges
    from workflow_engine.graph import Edge
    for edge_data in request.edges:
        edge = Edge.from_dict(edge_data)
        workflow.add_edge(edge)
    
    # Validate
    is_valid, errors = workflow.validate()
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid workflow: {', '.join(errors)}")
    
    # Save
    workflow.save(str(get_workflow_path(workflow.id)))
    
    return WorkflowResponse(
        id=workflow.id,
        name=workflow.metadata.name,
        description=workflow.metadata.description,
        version=workflow.metadata.version,
        created_at=workflow.metadata.created_at,
        updated_at=workflow.metadata.updated_at,
        node_count=len(workflow.nodes),
        edge_count=len(workflow.edges)
    )


@router.get("/{workflow_id}", response_model=WorkflowDetailResponse)
async def get_workflow(workflow_id: str):
    """Get workflow details."""
    workflow_path = get_workflow_path(workflow_id)
    if not workflow_path.exists():
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    try:
        workflow = WorkflowGraph.load(str(workflow_path))
        return WorkflowDetailResponse(
            id=workflow.id,
            name=workflow.metadata.name,
            description=workflow.metadata.description,
            version=workflow.metadata.version,
            created_at=workflow.metadata.created_at,
            updated_at=workflow.metadata.updated_at,
            node_count=len(workflow.nodes),
            edge_count=len(workflow.edges),
            nodes=[node.to_dict() for node in workflow.nodes.values()],
            edges=[edge.to_dict() for edge in workflow.edges.values()]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load workflow: {str(e)}")


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(workflow_id: str, request: WorkflowUpdateRequest):
    """Update a workflow."""
    workflow_path = get_workflow_path(workflow_id)
    if not workflow_path.exists():
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    try:
        workflow = WorkflowGraph.load(str(workflow_path))
        
        if request.name is not None:
            workflow.metadata.name = request.name
        if request.description is not None:
            workflow.metadata.description = request.description
        
        if request.nodes is not None:
            workflow.nodes.clear()
            for node_data in request.nodes:
                node = workflow.nodes.create_node(node_data)
                if node:
                    workflow.add_node(node)
        
        if request.edges is not None:
            workflow.edges.clear()
            from workflow_engine.graph import Edge
            for edge_data in request.edges:
                edge = Edge.from_dict(edge_data)
                workflow.add_edge(edge)
        
        workflow.metadata.updated_at = datetime.now().isoformat()
        
        # Validate
        is_valid, errors = workflow.validate()
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Invalid workflow: {', '.join(errors)}")
        
        # Save
        workflow.save(str(workflow_path))
        
        return WorkflowResponse(
            id=workflow.id,
            name=workflow.metadata.name,
            description=workflow.metadata.description,
            version=workflow.metadata.version,
            created_at=workflow.metadata.created_at,
            updated_at=workflow.metadata.updated_at,
            node_count=len(workflow.nodes),
            edge_count=len(workflow.edges)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update workflow: {str(e)}")


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete a workflow."""
    workflow_path = get_workflow_path(workflow_id)
    if not workflow_path.exists():
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    try:
        workflow_path.unlink()
        return {"message": "Workflow deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete workflow: {str(e)}")


@router.get("/node-types", response_model=List[NodeTypeResponse])
async def get_node_types():
    """Get available node types."""
    registry = NodeRegistry()
    schemas = registry.get_node_schemas()
    
    node_types = []
    type_names = {
        "start": "Start",
        "end": "End",
        "planning": "Planning",
        "search": "Search",
        "analysis": "Analysis",
        "synthesis": "Synthesis",
        "condition": "Condition",
        "loop": "Loop"
    }
    type_descriptions = {
        "start": "Workflow entry point",
        "end": "Workflow exit point",
        "planning": "Generate search queries",
        "search": "Execute web searches",
        "analysis": "Analyze search results",
        "synthesis": "Generate final report",
        "condition": "Conditional branching",
        "loop": "Iterative execution control"
    }
    
    for node_type, data in schemas.items():
        node_types.append(NodeTypeResponse(
            type=node_type,
            name=type_names.get(node_type, node_type.capitalize()),
            description=type_descriptions.get(node_type, ""),
            schema=data.get("schema", {})
        ))
    
    return node_types


@router.post("/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, request: ResearchRequest):
    """Execute a workflow with a research query."""
    workflow_path = get_workflow_path(workflow_id)
    if not workflow_path.exists():
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    try:
        workflow = WorkflowGraph.load(str(workflow_path))
        
        async def event_generator():
            executor = WorkflowExecutor(workflow)
            
            settings = {
                "model": request.settings.model,
                "api_key": request.settings.api_key,
                "base_url": request.settings.base_url,
                "max_tokens": request.settings.max_tokens,
                "temperature": request.settings.temperature,
                "enable_thinking": request.settings.enable_thinking
            }
            
            async for event in executor.execute(request.query, settings):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute workflow: {str(e)}")


@router.get("/{workflow_id}/validate")
async def validate_workflow(workflow_id: str):
    """Validate a workflow."""
    workflow_path = get_workflow_path(workflow_id)
    if not workflow_path.exists():
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    try:
        workflow = WorkflowGraph.load(str(workflow_path))
        is_valid, errors = workflow.validate()
        
        return {
            "valid": is_valid,
            "errors": errors,
            "node_count": len(workflow.nodes),
            "edge_count": len(workflow.edges)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate workflow: {str(e)}")


@router.post("/{workflow_id}/duplicate", response_model=WorkflowResponse)
async def duplicate_workflow(workflow_id: str):
    """Duplicate a workflow."""
    workflow_path = get_workflow_path(workflow_id)
    if not workflow_path.exists():
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    try:
        workflow = WorkflowGraph.load(str(workflow_path))
        
        # Create new workflow with same content
        new_workflow = WorkflowGraph()
        new_workflow.metadata.name = f"{workflow.metadata.name} (Copy)"
        new_workflow.metadata.description = workflow.metadata.description
        new_workflow.metadata.created_at = datetime.now().isoformat()
        new_workflow.metadata.updated_at = new_workflow.metadata.created_at
        
        # Copy nodes
        for node in workflow.nodes.values():
            new_workflow.add_node(node)
        
        # Copy edges
        for edge in workflow.edges.values():
            new_workflow.add_edge(edge)
        
        # Save
        new_workflow.save(str(get_workflow_path(new_workflow.id)))
        
        return WorkflowResponse(
            id=new_workflow.id,
            name=new_workflow.metadata.name,
            description=new_workflow.metadata.description,
            version=new_workflow.metadata.version,
            created_at=new_workflow.metadata.created_at,
            updated_at=new_workflow.metadata.updated_at,
            node_count=len(new_workflow.nodes),
            edge_count=len(new_workflow.edges)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to duplicate workflow: {str(e)}")
