"""
Workflow executor for running workflow graphs.
"""

import asyncio
import time
from typing import Dict, Any, List, Optional, AsyncGenerator
from datetime import datetime
import logging

from .node import WorkflowNode, NodeStatus, NodeExecutionResult
from .graph import WorkflowGraph, Edge

logger = logging.getLogger(__name__)


class WorkflowExecutionContext:
    """Context for workflow execution."""
    
    def __init__(self, query: str, settings: Dict[str, Any]):
        self.query = query
        self.settings = settings
        self.start_time = datetime.now().isoformat()
        self.duration_ms = 0
        self.data: Dict[str, Any] = {}
        self.logs: List[str] = []
        
    def log(self, message: str):
        """Add execution log."""
        timestamp = datetime.now().isoformat()
        self.logs.append(f"[{timestamp}] {message}")
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "query": self.query,
            "settings": self.settings,
            "start_time": self.start_time,
            "duration_ms": self.duration_ms,
            "data": self.data,
            "logs": self.logs
        }


class WorkflowExecutor:
    """
    Executes workflow graphs.
    
    Manages the execution flow, data passing between nodes, and error handling.
    """
    
    def __init__(self, workflow: WorkflowGraph):
        self.workflow = workflow
        self.context: Optional[WorkflowExecutionContext] = None
        self.execution_order: List[str] = []
        self.current_node_index = 0
        
    async def execute(
        self,
        query: str,
        settings: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute the workflow.
        
        Args:
            query: Research query
            settings: Execution settings
            
        Yields:
            Execution events
        """
        # Initialize context
        self.context = WorkflowExecutionContext(query, settings)
        start_time = time.time()
        
        logger.info(f"Starting workflow execution: {self.workflow.metadata.name}")
        self.context.log(f"Starting workflow: {self.workflow.metadata.name}")
        
        # Validate workflow
        is_valid, errors = self.workflow.validate()
        if not is_valid:
            error_msg = f"Workflow validation failed: {', '.join(errors)}"
            logger.error(error_msg)
            yield {
                "type": "error",
                "message": error_msg
            }
            return
        
        # Get execution order (topological sort)
        self.execution_order = self._get_execution_order()
        logger.info(f"Execution order: {self.execution_order}")
        
        # Execute nodes
        for node_id in self.execution_order:
            node = self.workflow.get_node(node_id)
            if not node:
                continue
            
            # Prepare node inputs
            self._prepare_node_inputs(node)
            
            # Execute node
            yield {
                "type": "node_start",
                "node_id": node_id,
                "node_type": node.config.type.value,
                "node_name": node.config.name
            }
            
            try:
                result = await node.execute(self.context.to_dict())
                
                # Update context with outputs
                for key, value in result.output.items():
                    self.context.data[key] = value
                
                yield {
                    "type": "node_complete",
                    "node_id": node_id,
                    "success": result.success,
                    "output_keys": list(result.output.keys()),
                    "logs": result.logs
                }
                
                if not result.success:
                    logger.error(f"Node {node_id} failed: {result.error}")
                    yield {
                        "type": "error",
                        "node_id": node_id,
                        "message": result.error or "Node execution failed"
                    }
                    return
                    
            except Exception as e:
                logger.error(f"Node {node_id} execution error: {e}", exc_info=True)
                yield {
                    "type": "error",
                    "node_id": node_id,
                    "message": str(e)
                }
                return
        
        # Calculate duration
        self.context.duration_ms = int((time.time() - start_time) * 1000)
        
        logger.info(f"Workflow execution completed in {self.context.duration_ms}ms")
        self.context.log(f"Workflow completed in {self.context.duration_ms}ms")
        
        yield {
            "type": "workflow_complete",
            "duration_ms": self.context.duration_ms,
            "context": self.context.to_dict()
        }
    
    def _get_execution_order(self) -> List[str]:
        """
        Get topological execution order of nodes.
        
        Returns:
            List of node IDs in execution order
        """
        visited = set()
        order = []
        
        def visit(node_id: str):
            if node_id in visited:
                return
            visited.add(node_id)
            
            # Visit predecessors first
            node = self.workflow.get_node(node_id)
            if node:
                for pred in self.workflow.get_predecessors(node_id):
                    visit(pred.id)
            
            order.append(node_id)
        
        # Start from end nodes and work backwards
        end_nodes = self.workflow.get_end_nodes()
        for node in end_nodes:
            visit(node.id)
        
        return order
    
    def _prepare_node_inputs(self, node: WorkflowNode):
        """
        Prepare inputs for a node from predecessor outputs.
        
        Args:
            node: Node to prepare inputs for
        """
        # Get outputs from predecessors
        predecessors = self.workflow.get_predecessors(node.id)
        
        for pred in predecessors:
            # Find the edge connecting them
            for edge in self.workflow.edges.values():
                if edge.source == pred.id and edge.target == node.id:
                    # Map outputs to inputs
                    if edge.source_handle and edge.target_handle:
                        # Specific mapping
                        value = pred.get_output(edge.source_handle)
                        node.set_input(edge.target_handle, value)
                    else:
                        # Merge all outputs
                        for key, value in pred.outputs.items():
                            if key not in node.inputs:
                                node.set_input(key, value)
        
        # Add context data
        if self.context:
            node.set_input("query", self.context.query)
            node.set_input("settings", self.context.settings)
    
    def get_execution_status(self) -> Dict[str, Any]:
        """Get current execution status."""
        return {
            "workflow_id": self.workflow.id,
            "current_node": self.execution_order[self.current_node_index] if self.execution_order else None,
            "progress": self.current_node_index / len(self.execution_order) if self.execution_order else 0,
            "context": self.context.to_dict() if self.context else None
        }
