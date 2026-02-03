"""
Workflow graph definition and management.
"""

from typing import Dict, Any, List, Optional, Set, Tuple
from dataclasses import dataclass, field
import json
import uuid
from pathlib import Path

from .node import WorkflowNode, NodeType, NodeConfig, NodeStatus


@dataclass
class Edge:
    """Connection between two nodes."""
    id: str
    source: str  # Source node ID
    target: str  # Target node ID
    source_handle: Optional[str] = None  # Output handle
    target_handle: Optional[str] = None  # Input handle
    condition: Optional[str] = None  # Optional condition for conditional edges
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "source": self.source,
            "target": self.target,
            "sourceHandle": self.source_handle,
            "targetHandle": self.target_handle,
            "condition": self.condition
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Edge":
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            source=data["source"],
            target=data["target"],
            source_handle=data.get("sourceHandle"),
            target_handle=data.get("targetHandle"),
            condition=data.get("condition")
        )


@dataclass
class WorkflowMetadata:
    """Workflow metadata."""
    name: str
    description: str
    version: str = "1.0.0"
    author: str = ""
    created_at: str = ""
    updated_at: str = ""
    tags: List[str] = field(default_factory=list)


class WorkflowGraph:
    """
    Represents a workflow as a directed graph of nodes and edges.
    """
    
    def __init__(self, workflow_id: Optional[str] = None):
        self.id = workflow_id or str(uuid.uuid4())
        self.nodes: Dict[str, WorkflowNode] = {}
        self.edges: Dict[str, Edge] = {}
        self.metadata: WorkflowMetadata = WorkflowMetadata(
            name="Untitled Workflow",
            description=""
        )
        
    def add_node(self, node: WorkflowNode) -> str:
        """
        Add a node to the workflow.
        
        Args:
            node: Node instance to add
            
        Returns:
            Node ID
        """
        self.nodes[node.id] = node
        return node.id
    
    def remove_node(self, node_id: str) -> bool:
        """
        Remove a node and its connected edges.
        
        Args:
            node_id: ID of node to remove
            
        Returns:
            True if node was removed
        """
        if node_id not in self.nodes:
            return False
        
        # Remove connected edges
        edges_to_remove = [
            edge_id for edge_id, edge in self.edges.items()
            if edge.source == node_id or edge.target == node_id
        ]
        for edge_id in edges_to_remove:
            del self.edges[edge_id]
        
        del self.nodes[node_id]
        return True
    
    def add_edge(self, edge: Edge) -> str:
        """
        Add an edge between nodes.
        
        Args:
            edge: Edge to add
            
        Returns:
            Edge ID
        """
        self.edges[edge.id] = edge
        return edge.id
    
    def remove_edge(self, edge_id: str) -> bool:
        """
        Remove an edge.
        
        Args:
            edge_id: ID of edge to remove
            
        Returns:
            True if edge was removed
        """
        if edge_id not in self.edges:
            return False
        del self.edges[edge_id]
        return True
    
    def get_node(self, node_id: str) -> Optional[WorkflowNode]:
        """Get a node by ID."""
        return self.nodes.get(node_id)
    
    def get_edge(self, edge_id: str) -> Optional[Edge]:
        """Get an edge by ID."""
        return self.edges.get(edge_id)
    
    def get_successors(self, node_id: str) -> List[WorkflowNode]:
        """
        Get all successor nodes (nodes that this node connects to).
        
        Args:
            node_id: Source node ID
            
        Returns:
            List of successor nodes
        """
        successors = []
        for edge in self.edges.values():
            if edge.source == node_id and edge.target in self.nodes:
                successors.append(self.nodes[edge.target])
        return successors
    
    def get_predecessors(self, node_id: str) -> List[WorkflowNode]:
        """
        Get all predecessor nodes (nodes that connect to this node).
        
        Args:
            node_id: Target node ID
            
        Returns:
            List of predecessor nodes
        """
        predecessors = []
        for edge in self.edges.values():
            if edge.target == node_id and edge.source in self.nodes:
                predecessors.append(self.nodes[edge.source])
        return predecessors
    
    def get_start_nodes(self) -> List[WorkflowNode]:
        """Get all nodes with no predecessors (entry points)."""
        start_nodes = []
        for node in self.nodes.values():
            if not self.get_predecessors(node.id):
                start_nodes.append(node)
        return start_nodes
    
    def get_end_nodes(self) -> List[WorkflowNode]:
        """Get all nodes with no successors (exit points)."""
        end_nodes = []
        for node in self.nodes.values():
            if not self.get_successors(node.id):
                end_nodes.append(node)
        return end_nodes
    
    def validate(self) -> Tuple[bool, List[str]]:
        """
        Validate the workflow graph.
        
        Returns:
            Tuple of (is_valid, list of error messages)
        """
        errors = []
        
        # Check for start nodes
        start_nodes = self.get_start_nodes()
        if not start_nodes:
            errors.append("Workflow must have at least one start node")
        
        # Check for end nodes
        end_nodes = self.get_end_nodes()
        if not end_nodes:
            errors.append("Workflow must have at least one end node")
        
        # Check for disconnected nodes
        if len(self.nodes) > 1:
            for node in self.nodes.values():
                if not self.get_predecessors(node.id) and not self.get_successors(node.id):
                    errors.append(f"Node '{node.config.name}' is disconnected")
        
        # Check for cycles (simple check)
        visited = set()
        rec_stack = set()
        
        def has_cycle(node_id: str) -> bool:
            visited.add(node_id)
            rec_stack.add(node_id)
            
            for successor in self.get_successors(node_id):
                if successor.id not in visited:
                    if has_cycle(successor.id):
                        return True
                elif successor.id in rec_stack:
                    return True
            
            rec_stack.remove(node_id)
            return False
        
        for node in self.nodes.values():
            if node.id not in visited:
                if has_cycle(node.id):
                    errors.append("Workflow contains cycles")
                    break
        
        return len(errors) == 0, errors
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize workflow to dictionary."""
        return {
            "id": self.id,
            "metadata": {
                "name": self.metadata.name,
                "description": self.metadata.description,
                "version": self.metadata.version,
                "author": self.metadata.author,
                "created_at": self.metadata.created_at,
                "updated_at": self.metadata.updated_at,
                "tags": self.metadata.tags
            },
            "nodes": [node.to_dict() for node in self.nodes.values()],
            "edges": [edge.to_dict() for edge in self.edges.values()]
        }
    
    def to_json(self, indent: int = 2) -> str:
        """Serialize workflow to JSON string."""
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "WorkflowGraph":
        """Create workflow from dictionary."""
        from .registry import NodeRegistry
        
        workflow = cls(data.get("id"))
        
        # Load metadata
        metadata = data.get("metadata", {})
        workflow.metadata = WorkflowMetadata(
            name=metadata.get("name", "Untitled Workflow"),
            description=metadata.get("description", ""),
            version=metadata.get("version", "1.0.0"),
            author=metadata.get("author", ""),
            created_at=metadata.get("created_at", ""),
            updated_at=metadata.get("updated_at", ""),
            tags=metadata.get("tags", [])
        )
        
        # Load nodes using registry
        registry = NodeRegistry()
        for node_data in data.get("nodes", []):
            node = registry.create_node(node_data)
            if node:
                workflow.add_node(node)
        
        # Load edges
        for edge_data in data.get("edges", []):
            edge = Edge.from_dict(edge_data)
            workflow.add_edge(edge)
        
        return workflow
    
    @classmethod
    def from_json(cls, json_str: str) -> "WorkflowGraph":
        """Create workflow from JSON string."""
        data = json.loads(json_str)
        return cls.from_dict(data)
    
    def save(self, filepath: str):
        """Save workflow to file."""
        Path(filepath).write_text(self.to_json(), encoding="utf-8")
    
    @classmethod
    def load(cls, filepath: str) -> "WorkflowGraph":
        """Load workflow from file."""
        data = json.loads(Path(filepath).read_text(encoding="utf-8"))
        return cls.from_dict(data)
