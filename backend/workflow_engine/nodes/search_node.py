"""
Search node for executing web searches.
"""

from typing import Dict, Any, List
from ..node import WorkflowNode, NodeConfig, NodeExecutionResult, NodeStatus


class SearchNode(WorkflowNode):
    """Search node - executes web searches."""
    
    async def execute(self, context: Dict[str, Any]) -> NodeExecutionResult:
        """Execute search logic."""
        self.status = NodeStatus.RUNNING
        self.log("Starting search phase")
        
        # Get inputs
        search_queries = self.inputs.get("search_queries", [])
        if not search_queries:
            query = self.inputs.get("query") or context.get("query", "")
            search_queries = [{"query": query, "priority": 1}]
        
        # Get search configuration
        engine = self.config.parameters.get("engine", "uapi")
        max_results = self.config.parameters.get("max_results", 10)
        days = self.config.parameters.get("days", 30)
        
        self.log(f"Executing {len(search_queries)} search queries")
        self.log(f"Search engine: {engine}")
        
        # In a real implementation, this would call the search tool
        # For now, return a placeholder structure
        search_results = []
        for sq in search_queries:
            search_results.append({
                "query": sq.get("query", ""),
                "results": [],
                "total": 0,
                "engine": engine
            })
        
        self.outputs = {
            "search_results": search_results,
            "total_results": sum(r.get("total", 0) for r in search_results),
            "queries_executed": len(search_queries)
        }
        
        self.log(f"Search complete: {self.outputs['total_results']} total results")
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
                    "default": "Search",
                    "description": "Node name"
                },
                "description": {
                    "type": "string",
                    "default": "Execute web searches",
                    "description": "Node description"
                },
                "parameters": {
                    "type": "object",
                    "properties": {
                        "engine": {
                            "type": "string",
                            "default": "uapi",
                            "enum": ["uapi", "bing", "baidu", "duckduckgo", "serpapi"],
                            "description": "Search engine to use"
                        },
                        "max_results": {
                            "type": "integer",
                            "default": 10,
                            "minimum": 1,
                            "maximum": 50,
                            "description": "Maximum results per query"
                        },
                        "days": {
                            "type": "integer",
                            "default": 30,
                            "minimum": 1,
                            "maximum": 365,
                            "description": "Time range in days"
                        }
                    }
                }
            }
        }
