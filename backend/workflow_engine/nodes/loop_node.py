"""
Loop node for iterative execution.
"""

from typing import Dict, Any
from ..node import WorkflowNode, NodeConfig, NodeExecutionResult, NodeStatus


class LoopNode(WorkflowNode):
    """Loop node - controls iterative execution flow."""
    
    async def execute(self, context: Dict[str, Any]) -> NodeExecutionResult:
        """Execute loop control logic."""
        self.status = NodeStatus.RUNNING
        self.log("Evaluating loop condition")
        
        # Get loop configuration
        max_iterations = self.config.parameters.get("max_iterations", 3)
        exit_condition = self.config.parameters.get("exit_condition", "quality_threshold")
        
        # Get current iteration from context
        current_iteration = context.get("current_iteration", 0)
        
        # Check if should continue
        should_continue = current_iteration < max_iterations
        
        # Check exit condition
        if exit_condition == "quality_threshold":
            quality_score = self.inputs.get("quality_score") or context.get("quality_score")
            threshold = self.config.parameters.get("quality_threshold", 80)
            if quality_score is not None and quality_score >= threshold:
                should_continue = False
                self.log(f"Quality threshold met ({quality_score} >= {threshold}), exiting loop")
        
        elif exit_condition == "no_gaps":
            gaps = self.inputs.get("information_gaps") or context.get("information_gaps", [])
            if not gaps:
                should_continue = False
                self.log("No information gaps, exiting loop")
        
        self.log(f"Loop iteration {current_iteration + 1}/{max_iterations}: continue={should_continue}")
        
        self.outputs = {
            "should_continue": should_continue,
            "current_iteration": current_iteration + 1,
            "max_iterations": max_iterations,
            "exit_reason": None if should_continue else exit_condition
        }
        
        # Update context
        context["current_iteration"] = current_iteration + 1
        
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
                    "default": "Loop",
                    "description": "Node name"
                },
                "description": {
                    "type": "string",
                    "default": "Control iterative execution",
                    "description": "Node description"
                },
                "parameters": {
                    "type": "object",
                    "properties": {
                        "max_iterations": {
                            "type": "integer",
                            "default": 3,
                            "minimum": 1,
                            "maximum": 10,
                            "description": "Maximum number of iterations"
                        },
                        "exit_condition": {
                            "type": "string",
                            "default": "quality_threshold",
                            "enum": ["quality_threshold", "no_gaps", "max_iterations"],
                            "description": "Condition to exit the loop"
                        },
                        "quality_threshold": {
                            "type": "integer",
                            "default": 80,
                            "minimum": 0,
                            "maximum": 100,
                            "description": "Quality score threshold for exit"
                        }
                    }
                }
            }
        }
