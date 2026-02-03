"""
Start node for workflow entry point.
"""

from typing import Dict, Any
from ..node import WorkflowNode, NodeConfig, NodeExecutionResult, NodeStatus


class StartNode(WorkflowNode):
    """Workflow start node - entry point for execution."""
    
    async def execute(self, context: Dict[str, Any]) -> NodeExecutionResult:
        """Initialize workflow execution."""
        self.status = NodeStatus.RUNNING
        self.log("Starting workflow execution")
        
        # Get initial input from context
        query = context.get("query", "")
        settings = context.get("settings", {})
        
        self.outputs = {
            "query": query,
            "settings": settings,
            "start_time": context.get("start_time")
        }
        
        self.status = NodeStatus.COMPLETED
        return NodeExecutionResult(
            success=True,
            output=self.outputs,
            logs=self.execution_logs
        )
    
    def get_config_schema(self) -> Dict[str, Any]:
        """Return configuration schema."""
        return {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "default": "Start",
                    "description": "Node name"
                },
                "description": {
                    "type": "string",
                    "default": "Workflow entry point",
                    "description": "Node description"
                }
            }
        }
