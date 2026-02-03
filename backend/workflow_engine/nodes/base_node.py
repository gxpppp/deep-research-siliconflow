"""
Base node implementations.
"""

from typing import Dict, Any
from ..node import WorkflowNode, NodeConfig, NodeExecutionResult, NodeStatus


class GenericNode(WorkflowNode):
    """Generic node that can be used for any purpose."""
    
    async def execute(self, context: Dict[str, Any]) -> NodeExecutionResult:
        """Execute generic logic."""
        self.status = NodeStatus.RUNNING
        self.log(f"Executing generic node: {self.config.name}")
        
        # Pass through inputs as outputs
        self.outputs = self.inputs.copy()
        
        self.status = NodeStatus.COMPLETED
        return NodeExecutionResult(
            success=True,
            output=self.outputs,
            logs=self.execution_logs
        )
