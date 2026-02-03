/**
 * Workflow Editor Types
 * Type definitions for the ComfyUI-style workflow editor
 */

import { Node, Edge } from '@xyflow/react';

// ==========================================
// Node Types
// ==========================================

export type WorkflowNodeType = 
  | 'start' 
  | 'end' 
  | 'planning' 
  | 'search' 
  | 'analysis' 
  | 'synthesis'
  | 'condition' 
  | 'loop';

export interface NodeParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'array' | 'object';
  label: string;
  description?: string;
  default?: any;
  required?: boolean;
  options?: { label: string; value: any }[];
  min?: number;
  max?: number;
}

export interface NodePort {
  id: string;
  name: string;
  type: 'input' | 'output';
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required?: boolean;
  description?: string;
}

export interface NodeTypeDefinition {
  type: WorkflowNodeType;
  name: string;
  description: string;
  category: string;
  icon?: string;
  color?: string;
  inputs: NodePort[];
  outputs: NodePort[];
  parameters: NodeParameter[];
}

// ==========================================
// Node Data
// ==========================================

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  type: WorkflowNodeType;
  parameters: Record<string, any>;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  status: NodeExecutionStatus;
  logs: string[];
  executionTime?: number;
  error?: string;
}

export type NodeExecutionStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'skipped';

export interface WorkflowNode extends Node<WorkflowNodeData> {
  type: WorkflowNodeType;
}

// ==========================================
// Edge Data
// ==========================================

export interface WorkflowEdgeData extends Record<string, unknown> {
  condition?: string;
  label?: string;
  animated?: boolean;
}

export interface WorkflowEdge extends Edge<WorkflowEdgeData> {
  type?: 'default' | 'smoothstep' | 'step' | 'straight';
}

// ==========================================
// Workflow Definition
// ==========================================

export interface WorkflowMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface Workflow {
  id: string;
  metadata: WorkflowMetadata;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

// ==========================================
// Execution
// ==========================================

export interface ExecutionContext {
  query: string;
  settings: Record<string, any>;
  startTime: string;
  durationMs?: number;
}

export interface ExecutionEvent {
  type: 'node_start' | 'node_complete' | 'workflow_complete' | 'error';
  nodeId?: string;
  nodeType?: string;
  success?: boolean;
  output?: any;
  logs?: string[];
  message?: string;
  durationMs?: number;
}

export interface ExecutionState {
  isRunning: boolean;
  currentNodeId?: string;
  progress: number;
  startTime?: string;
  endTime?: string;
  logs: string[];
}

// ==========================================
// Editor State
// ==========================================

export interface EditorState {
  // Workflow data
  workflow: Workflow;
  
  // Selection
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  
  // UI State
  isNodePaletteOpen: boolean;
  isPropertyPanelOpen: boolean;
  
  // Execution
  execution: ExecutionState;
  
  // History (for undo/redo)
  history: {
    past: Workflow[];
    future: Workflow[];
  };
  
  // Clipboard
  clipboard: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  } | null;
}

// ==========================================
// API Types
// ==========================================

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  edgeCount: number;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  nodeCount: number;
  edgeCount: number;
}

// ==========================================
// Node Categories
// ==========================================

export const NODE_CATEGORIES = {
  flow: { label: '流程控制', color: '#6366f1' },
  research: { label: '研究节点', color: '#10b981' },
  logic: { label: '逻辑控制', color: '#f59e0b' },
} as const;

export const NODE_TYPE_COLORS: Record<WorkflowNodeType, string> = {
  start: '#10b981',
  end: '#ef4444',
  planning: '#3b82f6',
  search: '#8b5cf6',
  analysis: '#f59e0b',
  synthesis: '#ec4899',
  condition: '#6366f1',
  loop: '#14b8a6',
};

export const NODE_TYPE_ICONS: Record<WorkflowNodeType, string> = {
  start: 'Play',
  end: 'Square',
  planning: 'Lightbulb',
  search: 'Search',
  analysis: 'BarChart3',
  synthesis: 'FileText',
  condition: 'GitBranch',
  loop: 'Repeat',
};
