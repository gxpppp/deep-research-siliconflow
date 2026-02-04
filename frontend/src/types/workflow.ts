/**
 * Workflow Editor Types - Enterprise Grade
 * Type definitions for the professional workflow editor
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

// ==========================================
// Data Mapping
// ==========================================

export interface DataMappingItem {
  id: string;
  source: string;
  target: string;
  transform?: string;
  required: boolean;
  description?: string;
}

// ==========================================
// Node Configuration Schema
// ==========================================

export interface NodeBasicConfig {
  label: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  tags: string[];
}

export interface NodeBusinessConfig {
  enabled: boolean;
  timeout: number;
  retryCount: number;
  retryInterval: number;
  retryStrategy: 'fixed' | 'exponential' | 'linear';
  continueOnError: boolean;
  errorHandling: 'stop' | 'skip' | 'retry';
}

export interface NodeDataMappingConfig {
  inputs: DataMappingItem[];
  outputs: DataMappingItem[];
  autoMap: boolean;
  validateMapping: boolean;
}

export interface NodeEventsConfig {
  onBefore: string;
  onAfter: string;
  onError: string;
  onTimeout: string;
  onRetry: string;
}

export interface NodeAdvancedConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  permissions: string[];
  customProperties: Record<string, any>;
  parallelExecution: boolean;
  priority: number;
  version: string;
}

export interface NodeConfigSchema {
  basic: NodeBasicConfig;
  business: NodeBusinessConfig;
  dataMapping: NodeDataMappingConfig;
  events: NodeEventsConfig;
  advanced: NodeAdvancedConfig;
}

// ==========================================
// Node Type Specific Configs
// ==========================================

export interface PlanningNodeConfig extends NodeConfigSchema {
  business: NodeBusinessConfig & {
    maxQueries: number;
    useEnhancedPlanning: boolean;
    domainDetection: boolean;
    queryTemplate: string;
    includeTimeContext: boolean;
  };
}

export interface SearchNodeConfig extends NodeConfigSchema {
  business: NodeBusinessConfig & {
    engine: 'uapi' | 'bing' | 'baidu' | 'duckduckgo' | 'serpapi';
    maxResults: number;
    days: number;
    safeSearch: boolean;
    region: string;
    language: string;
    includeImages: boolean;
    includeNews: boolean;
  };
}

export interface AnalysisNodeConfig extends NodeConfigSchema {
  business: NodeBusinessConfig & {
    enableQualityEvaluation: boolean;
    qualityThreshold: number;
    targetQualityScore: number;
    analysisDepth: 'basic' | 'standard' | 'deep';
    extractEntities: boolean;
    generateSummary: boolean;
  };
}

export interface SynthesisNodeConfig extends NodeConfigSchema {
  business: NodeBusinessConfig & {
    reportFormat: 'structured' | 'markdown' | 'academic' | 'executive';
    includeSources: boolean;
    maxLength: number;
    language: string;
    includeCharts: boolean;
    citationStyle: 'apa' | 'mla' | 'chicago';
  };
}

export interface ConditionNodeConfig extends NodeConfigSchema {
  business: NodeBusinessConfig & {
    conditionType: 'expression' | 'javascript' | 'python';
    conditionExpression: string;
    trueLabel: string;
    falseLabel: string;
    defaultBranch: 'true' | 'false';
  };
}

export interface LoopNodeConfig extends NodeConfigSchema {
  business: NodeBusinessConfig & {
    maxIterations: number;
    exitCondition: 'quality_threshold' | 'no_gaps' | 'max_iterations' | 'custom';
    qualityThreshold: number;
    customExitExpression: string;
    loopVariable: string;
    incrementStrategy: 'linear' | 'exponential';
  };
}

export type NodeTypeConfigMap = {
  start: NodeConfigSchema;
  end: NodeConfigSchema;
  planning: PlanningNodeConfig;
  search: SearchNodeConfig;
  analysis: AnalysisNodeConfig;
  synthesis: SynthesisNodeConfig;
  condition: ConditionNodeConfig;
  loop: LoopNodeConfig;
};

// ==========================================
// Node Data
// ==========================================

export type NodeExecutionStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'skipped'
  | 'paused'
  | 'cancelled';

export interface WorkflowNodeData extends Record<string, unknown> {
  // Core
  label: string;
  description: string;
  type: WorkflowNodeType;
  
  // Configuration
  config: NodeConfigSchema;
  
  // Runtime data
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  status: NodeExecutionStatus;
  logs: string[];
  executionTime?: number;
  error?: string;
  retryCount: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: string;
}

export interface WorkflowNode extends Node<WorkflowNodeData> {
  type: WorkflowNodeType;
}

// ==========================================
// Edge Configuration
// ==========================================

export interface EdgeStyleConfig {
  strokeWidth: number;
  strokeColor: string;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  arrowStart: boolean;
  arrowEnd: boolean;
  curvature: number;
  animated: boolean;
  animationSpeed: number;
}

export interface EdgeBranchCondition {
  type: 'if' | 'else' | 'elseif' | 'default';
  expression: string;
  priority: number;
  label: string;
  color: string;
}

export interface EdgeLabelConfig {
  text: string;
  position: 'start' | 'middle' | 'end';
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  borderRadius: number;
  padding: number;
}

export interface WorkflowEdgeData extends Record<string, unknown> {
  // Basic
  id: string;
  
  // Style
  style: EdgeStyleConfig;
  
  // Label
  label: EdgeLabelConfig;
  
  // Condition
  branchCondition?: EdgeBranchCondition;
  
  // Metadata
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    description: string;
    tags: string[];
  };
}

export type EdgeType = 'straight' | 'smoothstep' | 'bezier' | 'step';

export interface WorkflowEdge extends Edge<WorkflowEdgeData> {
  type: EdgeType;
}

// ==========================================
// Workflow Definition
// ==========================================

export interface WorkflowMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  category: string;
  isTemplate: boolean;
  isPublic: boolean;
}

export interface WorkflowSettings {
  autoSave: boolean;
  autoSaveInterval: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  defaultEdgeType: EdgeType;
  theme: 'light' | 'dark' | 'system';
}

export interface Workflow {
  id: string;
  metadata: WorkflowMetadata;
  settings: WorkflowSettings;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

// ==========================================
// Validation
// ==========================================

export interface ValidationRule {
  field: string;
  type: 'required' | 'min' | 'max' | 'pattern' | 'email' | 'url' | 'custom' | 'range';
  message: string;
  value?: any;
  min?: number;
  max?: number;
  pattern?: RegExp;
  validator?: (value: any, context?: any) => boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  type: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ==========================================
// Templates
// ==========================================

export interface NodeTemplate {
  id: string;
  name: string;
  description: string;
  nodeType: WorkflowNodeType;
  config: NodeConfigSchema;
  isDefault: boolean;
  isPublic: boolean;
  author: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  usageCount: number;
}

export interface EdgeTemplate {
  id: string;
  name: string;
  description: string;
  style: EdgeStyleConfig;
  label: EdgeLabelConfig;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Execution
// ==========================================

export interface ExecutionContext {
  query: string;
  settings: Record<string, any>;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  variables: Record<string, any>;
}

export interface ExecutionEvent {
  type: 'node_start' | 'node_complete' | 'node_error' | 'node_retry' | 'workflow_complete' | 'workflow_error' | 'workflow_cancelled';
  nodeId?: string;
  nodeType?: string;
  success?: boolean;
  output?: any;
  logs?: string[];
  error?: string;
  message?: string;
  durationMs?: number;
  timestamp: string;
}

export interface ExecutionState {
  isRunning: boolean;
  isPaused: boolean;
  currentNodeId?: string;
  progress: number;
  startTime?: string;
  endTime?: string;
  logs: string[];
  variables: Record<string, any>;
  statistics: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    skippedNodes: number;
  };
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
  isTemplatePanelOpen: boolean;
  activeTab: string;
  
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
  
  // Validation
  validation: ValidationResult;
  
  // Templates
  templates: {
    nodeTemplates: NodeTemplate[];
    edgeTemplates: EdgeTemplate[];
  };
}

// ==========================================
// API Types
// ==========================================

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  settings?: Partial<WorkflowSettings>;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  settings?: Partial<WorkflowSettings>;
  metadata?: Partial<WorkflowMetadata>;
}

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  category: string;
  tags: string[];
  nodeCount: number;
  edgeCount: number;
  isTemplate: boolean;
  isPublic: boolean;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  nodeCount: number;
  edgeCount: number;
}

// ==========================================
// Constants
// ==========================================

export const NODE_CATEGORIES = {
  flow: { label: '流程控制', color: '#6366f1', icon: 'GitBranch' },
  research: { label: '研究节点', color: '#10b981', icon: 'Search' },
  logic: { label: '逻辑控制', color: '#f59e0b', icon: 'Brain' },
  io: { label: '输入输出', color: '#3b82f6', icon: 'Database' },
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

export const DEFAULT_NODE_CONFIG: NodeConfigSchema = {
  basic: {
    label: 'New Node',
    description: '',
    icon: 'Circle',
    color: '#64748b',
    category: 'general',
    tags: [],
  },
  business: {
    enabled: true,
    timeout: 30000,
    retryCount: 3,
    retryInterval: 1000,
    retryStrategy: 'exponential',
    continueOnError: false,
    errorHandling: 'stop',
  },
  dataMapping: {
    inputs: [],
    outputs: [],
    autoMap: false,
    validateMapping: true,
  },
  events: {
    onBefore: '',
    onAfter: '',
    onError: '',
    onTimeout: '',
    onRetry: '',
  },
  advanced: {
    logLevel: 'info',
    permissions: [],
    customProperties: {},
    parallelExecution: false,
    priority: 0,
    version: '1.0.0',
  },
};

export const DEFAULT_EDGE_STYLE: EdgeStyleConfig = {
  strokeWidth: 2,
  strokeColor: '#64748b',
  strokeStyle: 'solid',
  arrowStart: false,
  arrowEnd: true,
  curvature: 0.5,
  animated: false,
  animationSpeed: 1,
};
