"""
Base node class for workflow engine.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, AsyncGenerator
from dataclasses import dataclass, field
from enum import Enum
import uuid


class NodeStatus(str, Enum):
    """Node execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class NodeType(str, Enum):
    """Supported node types."""
    PLANNING = "planning"
    SEARCH = "search"
    ANALYSIS = "analysis"
    SYNTHESIS = "synthesis"
    CONDITION = "condition"
    LOOP = "loop"
    START = "start"
    END = "end"


@dataclass
class NodeConfig:
    """Node configuration schema."""
    name: str
    description: str
    type: NodeType
    inputs: Dict[str, Any] = field(default_factory=dict)
    outputs: Dict[str, Any] = field(default_factory=dict)
    parameters: Dict[str, Any] = field(default_factory=dict)
    position: Dict[str, float] = field(default_factory=lambda: {"x": 0, "y": 0})


@dataclass
class NodeExecutionResult:
    """Result of node execution."""
    success: bool
    output: Dict[str, Any]
    logs: List[str] = field(default_factory=list)
    error: Optional[str] = None
    execution_time_ms: int = 0


class WorkflowNode(ABC):
    """
    Base class for all workflow nodes.
    
    Each node represents a discrete unit of work in the research workflow.
    """
    
    def __init__(self, node_id: str, config: NodeConfig):
        self.id = node_id
        self.config = config
        self.status = NodeStatus.PENDING
        self.inputs: Dict[str, Any] = {}
        self.outputs: Dict[str, Any] = {}
        self.execution_logs: List[str] = []
        
    @abstractmethod
    async def execute(self, context: Dict[str, Any]) -> NodeExecutionResult:
        """
        Execute the node's logic.
        
        Args:
            context: Execution context containing shared state
            
        Returns:
            Execution result with outputs and status
        """
        pass
    
    def get_config_schema(self) -> Dict[str, Any]:
        """
        Return the configuration schema for this node type.
        
        Returns:
            JSON schema for node configuration
        """
        return {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Node name"},
                "description": {"type": "string", "description": "Node description"},
                "parameters": {"type": "object", "description": "Node-specific parameters"}
            }
        }
    
    def validate_config(self) -> bool:
        """
        Validate the node configuration.
        
        Returns:
            True if configuration is valid
        """
        return True
    
    def set_input(self, key: str, value: Any):
        """Set an input value."""
        self.inputs[key] = value
        
    def get_output(self, key: str) -> Any:
        """Get an output value."""
        return self.outputs.get(key)
    
    def log(self, message: str):
        """Add an execution log."""
        self.execution_logs.append(message)
        
    def to_dict(self) -> Dict[str, Any]:
        """Serialize node to dictionary."""
        return {
            "id": self.id,
            "type": self.config.type.value,
            "name": self.config.name,
            "description": self.config.description,
            "position": self.config.position,
            "parameters": self.config.parameters,
            "status": self.status.value,
            "inputs": self.inputs,
            "outputs": self.outputs
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "WorkflowNode":
        """Create node from dictionary."""
        config = NodeConfig(
            name=data.get("name", ""),
            description=data.get("description", ""),
            type=NodeType(data.get("type", "planning")),
            parameters=data.get("parameters", {}),
            position=data.get("position", {"x": 0, "y": 0})
        )
        return cls(data.get("id", str(uuid.uuid4())), config)
