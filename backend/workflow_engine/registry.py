"""
Node registry for managing available node types.
"""

from typing import Dict, Type, Any, List
import logging

from .node import WorkflowNode, NodeConfig, NodeType

logger = logging.getLogger(__name__)


class NodeRegistry:
    """
    Registry for workflow node types.
    
    Manages the available node types and their implementations.
    """
    
    _instance = None
    _nodes: Dict[str, Type[WorkflowNode]] = {}
    
    def __new__(cls):
        """Singleton pattern to ensure single registry instance."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize the registry with default node types."""
        self._nodes = {}
        self._register_default_nodes()
    
    def _register_default_nodes(self):
        """Register the built-in node types."""
        # Import node implementations
        try:
            from .nodes.planning_node import PlanningNode
            from .nodes.search_node import SearchNode
            from .nodes.analysis_node import AnalysisNode
            from .nodes.synthesis_node import SynthesisNode
            from .nodes.condition_node import ConditionNode
            from .nodes.loop_node import LoopNode
            from .nodes.start_node import StartNode
            from .nodes.end_node import EndNode
            
            self.register(NodeType.PLANNING.value, PlanningNode)
            self.register(NodeType.SEARCH.value, SearchNode)
            self.register(NodeType.ANALYSIS.value, AnalysisNode)
            self.register(NodeType.SYNTHESIS.value, SynthesisNode)
            self.register(NodeType.CONDITION.value, ConditionNode)
            self.register(NodeType.LOOP.value, LoopNode)
            self.register(NodeType.START.value, StartNode)
            self.register(NodeType.END.value, EndNode)
            
            logger.info(f"Registered {len(self._nodes)} default node types")
        except ImportError as e:
            logger.warning(f"Some node implementations not available: {e}")
    
    def register(self, node_type: str, node_class: Type[WorkflowNode]):
        """
        Register a new node type.
        
        Args:
            node_type: Unique identifier for the node type
            node_class: Node class implementation
        """
        self._nodes[node_type] = node_class
        logger.debug(f"Registered node type: {node_type}")
    
    def unregister(self, node_type: str):
        """
        Unregister a node type.
        
        Args:
            node_type: Node type to unregister
        """
        if node_type in self._nodes:
            del self._nodes[node_type]
            logger.debug(f"Unregistered node type: {node_type}")
    
    def get(self, node_type: str) -> Type[WorkflowNode]:
        """
        Get the node class for a type.
        
        Args:
            node_type: Node type identifier
            
        Returns:
            Node class
            
        Raises:
            KeyError: If node type not found
        """
        if node_type not in self._nodes:
            raise KeyError(f"Unknown node type: {node_type}")
        return self._nodes[node_type]
    
    def create_node(self, node_data: Dict[str, Any]) -> WorkflowNode:
        """
        Create a node instance from data.
        
        Args:
            node_data: Node configuration data
            
        Returns:
            Node instance
        """
        node_type = node_data.get("type", "planning")
        node_id = node_data.get("id")
        
        if node_type not in self._nodes:
            logger.warning(f"Unknown node type '{node_type}', using generic node")
            # Fallback to creating a generic node
            from .nodes.base_node import GenericNode
            node_class = GenericNode
        else:
            node_class = self._nodes[node_type]
        
        config = NodeConfig(
            name=node_data.get("name", ""),
            description=node_data.get("description", ""),
            type=NodeType(node_type),
            parameters=node_data.get("parameters", {}),
            position=node_data.get("position", {"x": 0, "y": 0})
        )
        
        return node_class(node_id, config)
    
    def list_types(self) -> List[str]:
        """List all registered node types."""
        return list(self._nodes.keys())
    
    def get_node_schemas(self) -> Dict[str, Any]:
        """
        Get configuration schemas for all node types.
        
        Returns:
            Dictionary mapping node types to their schemas
        """
        schemas = {}
        for node_type, node_class in self._nodes.items():
            try:
                # Create a temporary instance to get schema
                temp_config = NodeConfig(
                    name="temp",
                    description="",
                    type=NodeType(node_type)
                )
                temp_node = node_class("temp", temp_config)
                schemas[node_type] = {
                    "type": node_type,
                    "schema": temp_node.get_config_schema()
                }
            except Exception as e:
                logger.warning(f"Failed to get schema for {node_type}: {e}")
                schemas[node_type] = {
                    "type": node_type,
                    "schema": {"type": "object"}
                }
        return schemas
