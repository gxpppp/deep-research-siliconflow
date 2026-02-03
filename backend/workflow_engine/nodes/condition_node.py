"""
Condition node for branching logic.
"""

from typing import Dict, Any
from ..node import WorkflowNode, NodeConfig, NodeExecutionResult, NodeStatus


class ConditionNode(WorkflowNode):
    """Condition node - evaluates conditions for branching."""
    
    async def execute(self, context: Dict[str, Any]) -> NodeExecutionResult:
        """Execute condition evaluation."""
        self.status = NodeStatus.RUNNING
        self.log("Evaluating condition")
        
        # Get inputs
        condition_input = self.inputs.get("input", {})
        
        # Get condition configuration
        condition_type = self.config.parameters.get("condition_type", "threshold")
        threshold = self.config.parameters.get("threshold", 60)
        operator = self.config.parameters.get("operator", ">=")
        
        # Evaluate condition
        result = False
        value = None
        
        if condition_type == "threshold":
            # Check if value meets threshold
            value = condition_input.get("value") or condition_input.get("quality_score")
            if value is not None:
                if operator == ">=":
                    result = value >= threshold
                elif operator == ">":
                    result = value > threshold
                elif operator == "<=":
                    result = value <= threshold
                elif operator == "<":
                    result = value < threshold
                elif operator == "==":
                    result = value == threshold
        
        elif condition_type == "boolean":
            # Check boolean value
            value = condition_input.get("value") or condition_input.get("should_continue")
            result = bool(value)
        
        elif condition_type == "exists":
            # Check if key exists
            key = self.config.parameters.get("key", "")
            result = key in condition_input and condition_input[key] is not None
        
        self.log(f"Condition evaluated: {result} (value: {value})")
        
        self.outputs = {
            "result": result,
            "value": value,
            "condition_type": condition_type,
            "threshold": threshold if condition_type == "threshold" else None
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
                    "default": "Condition",
                    "description": "Node name"
                },
                "description": {
                    "type": "string",
                    "default": "Evaluate condition for branching",
                    "description": "Node description"
                },
                "parameters": {
                    "type": "object",
                    "properties": {
                        "condition_type": {
                            "type": "string",
                            "default": "threshold",
                            "enum": ["threshold", "boolean", "exists"],
                            "description": "Type of condition to evaluate"
                        },
                        "threshold": {
                            "type": "number",
                            "default": 60,
                            "description": "Threshold value for comparison"
                        },
                        "operator": {
                            "type": "string",
                            "default": ">=",
                            "enum": [">=", ">", "<=", "<", "=="],
                            "description": "Comparison operator"
                        },
                        "key": {
                            "type": "string",
                            "default": "",
                            "description": "Key to check for 'exists' condition"
                        }
                    }
                }
            }
        }
