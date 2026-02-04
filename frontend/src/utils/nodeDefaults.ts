/**
 * Node Default Configurations
 * Default configurations for each node type
 */

import {
  NodeConfigSchema,
  PlanningNodeConfig,
  SearchNodeConfig,
  AnalysisNodeConfig,
  SynthesisNodeConfig,
  ConditionNodeConfig,
  LoopNodeConfig,
  WorkflowNodeType,
  DEFAULT_NODE_CONFIG,
} from '@/types/workflow';

// ==========================================
// Node Type Default Configs
// ==========================================

export const getPlanningNodeDefaults = (): PlanningNodeConfig => ({
  ...DEFAULT_NODE_CONFIG,
  basic: {
    ...DEFAULT_NODE_CONFIG.basic,
    label: '规划节点',
    description: '生成搜索查询策略',
    icon: 'Lightbulb',
    color: '#3b82f6',
    category: 'research',
  },
  business: {
    ...DEFAULT_NODE_CONFIG.business,
    maxQueries: 5,
    useEnhancedPlanning: true,
    domainDetection: true,
    queryTemplate: '',
    includeTimeContext: true,
  },
});

export const getSearchNodeDefaults = (): SearchNodeConfig => ({
  ...DEFAULT_NODE_CONFIG,
  basic: {
    ...DEFAULT_NODE_CONFIG.basic,
    label: '搜索节点',
    description: '执行网络搜索',
    icon: 'Search',
    color: '#8b5cf6',
    category: 'research',
  },
  business: {
    ...DEFAULT_NODE_CONFIG.business,
    engine: 'uapi',
    maxResults: 10,
    days: 30,
    safeSearch: true,
    region: 'zh-CN',
    language: 'zh',
    includeImages: false,
    includeNews: false,
  },
});

export const getAnalysisNodeDefaults = (): AnalysisNodeConfig => ({
  ...DEFAULT_NODE_CONFIG,
  basic: {
    ...DEFAULT_NODE_CONFIG.basic,
    label: '分析节点',
    description: '分析搜索结果质量',
    icon: 'BarChart3',
    color: '#f59e0b',
    category: 'research',
  },
  business: {
    ...DEFAULT_NODE_CONFIG.business,
    enableQualityEvaluation: true,
    qualityThreshold: 60,
    targetQualityScore: 80,
    analysisDepth: 'standard',
    extractEntities: true,
    generateSummary: true,
  },
});

export const getSynthesisNodeDefaults = (): SynthesisNodeConfig => ({
  ...DEFAULT_NODE_CONFIG,
  basic: {
    ...DEFAULT_NODE_CONFIG.basic,
    label: '综合节点',
    description: '生成最终研究报告',
    icon: 'FileText',
    color: '#ec4899',
    category: 'research',
  },
  business: {
    ...DEFAULT_NODE_CONFIG.business,
    reportFormat: 'structured',
    includeSources: true,
    maxLength: 5000,
    language: 'zh',
    includeCharts: false,
    citationStyle: 'apa',
  },
});

export const getConditionNodeDefaults = (): ConditionNodeConfig => ({
  ...DEFAULT_NODE_CONFIG,
  basic: {
    ...DEFAULT_NODE_CONFIG.basic,
    label: '条件节点',
    description: '条件分支控制',
    icon: 'GitBranch',
    color: '#6366f1',
    category: 'logic',
  },
  business: {
    ...DEFAULT_NODE_CONFIG.business,
    conditionType: 'expression',
    conditionExpression: 'score > 60',
    trueLabel: '是',
    falseLabel: '否',
    defaultBranch: 'false',
  },
});

export const getLoopNodeDefaults = (): LoopNodeConfig => ({
  ...DEFAULT_NODE_CONFIG,
  basic: {
    ...DEFAULT_NODE_CONFIG.basic,
    label: '循环节点',
    description: '迭代执行控制',
    icon: 'Repeat',
    color: '#14b8a6',
    category: 'logic',
  },
  business: {
    ...DEFAULT_NODE_CONFIG.business,
    maxIterations: 3,
    exitCondition: 'quality_threshold',
    qualityThreshold: 80,
    customExitExpression: '',
    loopVariable: 'iteration',
    incrementStrategy: 'linear',
  },
});

export const getStartNodeDefaults = (): NodeConfigSchema => ({
  ...DEFAULT_NODE_CONFIG,
  basic: {
    ...DEFAULT_NODE_CONFIG.basic,
    label: '开始',
    description: '工作流入口',
    icon: 'Play',
    color: '#10b981',
    category: 'flow',
  },
});

export const getEndNodeDefaults = (): NodeConfigSchema => ({
  ...DEFAULT_NODE_CONFIG,
  basic: {
    ...DEFAULT_NODE_CONFIG.basic,
    label: '结束',
    description: '工作流出口',
    icon: 'Square',
    color: '#ef4444',
    category: 'flow',
  },
});

// ==========================================
// Get Default Config by Node Type
// ==========================================

export function getNodeDefaultConfig(nodeType: WorkflowNodeType): NodeConfigSchema {
  switch (nodeType) {
    case 'start':
      return getStartNodeDefaults();
    case 'end':
      return getEndNodeDefaults();
    case 'planning':
      return getPlanningNodeDefaults();
    case 'search':
      return getSearchNodeDefaults();
    case 'analysis':
      return getAnalysisNodeDefaults();
    case 'synthesis':
      return getSynthesisNodeDefaults();
    case 'condition':
      return getConditionNodeDefaults();
    case 'loop':
      return getLoopNodeDefaults();
    default:
      return DEFAULT_NODE_CONFIG;
  }
}

// ==========================================
// Node Type Metadata
// ==========================================

export interface NodeTypeMetadata {
  type: WorkflowNodeType;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  inputCount: number;
  outputCount: number;
  configurable: boolean;
}

export const nodeTypeMetadata: NodeTypeMetadata[] = [
  {
    type: 'start',
    name: '开始',
    description: '工作流入口节点',
    category: 'flow',
    icon: 'Play',
    color: '#10b981',
    inputCount: 0,
    outputCount: 1,
    configurable: true,
  },
  {
    type: 'planning',
    name: '规划',
    description: '生成搜索查询策略',
    category: 'research',
    icon: 'Lightbulb',
    color: '#3b82f6',
    inputCount: 1,
    outputCount: 1,
    configurable: true,
  },
  {
    type: 'search',
    name: '搜索',
    description: '执行网络搜索',
    category: 'research',
    icon: 'Search',
    color: '#8b5cf6',
    inputCount: 1,
    outputCount: 1,
    configurable: true,
  },
  {
    type: 'analysis',
    name: '分析',
    description: '分析搜索结果质量',
    category: 'research',
    icon: 'BarChart3',
    color: '#f59e0b',
    inputCount: 1,
    outputCount: 1,
    configurable: true,
  },
  {
    type: 'synthesis',
    name: '综合',
    description: '生成最终研究报告',
    category: 'research',
    icon: 'FileText',
    color: '#ec4899',
    inputCount: 1,
    outputCount: 1,
    configurable: true,
  },
  {
    type: 'condition',
    name: '条件',
    description: '条件分支控制',
    category: 'logic',
    icon: 'GitBranch',
    color: '#6366f1',
    inputCount: 1,
    outputCount: 2,
    configurable: true,
  },
  {
    type: 'loop',
    name: '循环',
    description: '迭代执行控制',
    category: 'logic',
    icon: 'Repeat',
    color: '#14b8a6',
    inputCount: 1,
    outputCount: 2,
    configurable: true,
  },
  {
    type: 'end',
    name: '结束',
    description: '工作流出口节点',
    category: 'flow',
    icon: 'Square',
    color: '#ef4444',
    inputCount: 1,
    outputCount: 0,
    configurable: true,
  },
];

export function getNodeTypeMetadata(nodeType: WorkflowNodeType): NodeTypeMetadata | undefined {
  return nodeTypeMetadata.find((n) => n.type === nodeType);
}
