"""
Workflow Engine for DeepResearch Platform.

A modular workflow system that supports visual workflow editing and execution.
"""

from .node import WorkflowNode, NodeConfig
from .graph import WorkflowGraph
from .executor import WorkflowExecutor
from .registry import NodeRegistry

__all__ = [
    "WorkflowNode",
    "NodeConfig",
    "WorkflowGraph",
    "WorkflowExecutor",
    "NodeRegistry",
]
