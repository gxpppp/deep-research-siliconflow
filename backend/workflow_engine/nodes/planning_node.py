"""
Planning node for generating search queries.
"""

from typing import Dict, Any, List
from ..node import WorkflowNode, NodeConfig, NodeExecutionResult, NodeStatus


class PlanningNode(WorkflowNode):
    """Planning node - generates search queries from research question."""
    
    async def execute(self, context: Dict[str, Any]) -> NodeExecutionResult:
        """Execute planning logic."""
        self.status = NodeStatus.RUNNING
        self.log("Starting planning phase")
        
        # Get inputs
        query = self.inputs.get("query") or context.get("query", "")
        settings = self.inputs.get("settings") or context.get("settings", {})
        
        # Get planning configuration
        use_enhanced = self.config.parameters.get("use_enhanced_planning", True)
        max_queries = self.config.parameters.get("max_queries", 5)
        
        self.log(f"Planning for query: {query[:50]}...")
        self.log(f"Using enhanced planning: {use_enhanced}")
        
        # In a real implementation, this would call the LLM
        # For now, return a placeholder structure
        search_queries = [
            {"query": query, "priority": 1, "dimension": "core"},
            {"query": f"{query} 最新进展", "priority": 2, "dimension": "trends"},
            {"query": f"{query} 案例分析", "priority": 3, "dimension": "examples"},
        ]
        
        # Limit to max_queries
        search_queries = search_queries[:max_queries]
        
        self.outputs = {
            "search_queries": search_queries,
            "planning_summary": f"Generated {len(search_queries)} search queries",
            "domain_type": "general"
        }
        
        self.log(f"Planning complete: {len(search_queries)} queries generated")
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
                    "default": "Planning",
                    "description": "Node name"
                },
                "description": {
                    "type": "string",
                    "default": "Generate search queries",
                    "description": "Node description"
                },
                "parameters": {
                    "type": "object",
                    "properties": {
                        "use_enhanced_planning": {
                            "type": "boolean",
                            "default": True,
                            "description": "Use enhanced planning with domain detection"
                        },
                        "max_queries": {
                            "type": "integer",
                            "default": 5,
                            "minimum": 1,
                            "maximum": 10,
                            "description": "Maximum number of search queries"
                        }
                    }
                }
            }
        }
