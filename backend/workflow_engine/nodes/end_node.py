"""
End node for workflow exit point.
"""

from typing import Dict, Any
from ..node import WorkflowNode, NodeConfig, NodeExecutionResult, NodeStatus


class EndNode(WorkflowNode):
    """Workflow end node - exit point for execution."""
    
    async def execute(self, context: Dict[str, Any]) -> NodeExecutionResult:
        """Finalize workflow execution."""
        self.status = NodeStatus.RUNNING
        self.log("Ending workflow execution")
        
        # Collect final results from context
        self.outputs = {
            "report": context.get("report"),
            "sources": context.get("sources", []),
            "status": "completed",
            "duration_ms": context.get("duration_ms", 0)
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
                    "default": "End",
                    "description": "Node name"
                },
                "description": {
                    "type": "string",
                    "default": "Workflow exit point",
                    "description": "Node description"
                }
            }
        }
