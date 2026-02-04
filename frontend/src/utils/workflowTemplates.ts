/**
 * Workflow Templates
 * Pre-defined workflow templates for quick start
 */

import { Workflow, WorkflowNode, WorkflowEdge } from '@/types/workflow';
import { getNodeDefaultConfig } from './nodeDefaults';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  nodes: Partial<WorkflowNode>[];
  edges: Partial<WorkflowEdge>[];
}

// Template 1: Standard Research Flow
export const standardResearchTemplate: WorkflowTemplate = {
  id: 'standard-research',
  name: '标准研究流程',
  description: '经典的研究工作流：规划 → 搜索 → 分析 → 综合',
  category: '基础模板',
  nodes: [
    {
      id: 'start-1',
      type: 'start',
      position: { x: 100, y: 300 },
      data: {
        label: '开始',
        description: '研究工作流入口',
        type: 'start',
        config: getNodeDefaultConfig('start'),
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
    {
      id: 'planning-1',
      type: 'planning',
      position: { x: 300, y: 300 },
      data: {
        label: '规划',
        description: '生成搜索查询策略',
        type: 'planning',
        config: {
          ...getNodeDefaultConfig('planning'),
          business: {
            ...getNodeDefaultConfig('planning').business,
            maxQueries: 5,
            useEnhancedPlanning: true,
          },
        },
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
    {
      id: 'search-1',
      type: 'search',
      position: { x: 500, y: 300 },
      data: {
        label: '搜索',
        description: '执行网络搜索',
        type: 'search',
        config: {
          ...getNodeDefaultConfig('search'),
          business: {
            ...getNodeDefaultConfig('search').business,
            maxResults: 10,
            days: 30,
          },
        },
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
    {
      id: 'analysis-1',
      type: 'analysis',
      position: { x: 700, y: 300 },
      data: {
        label: '分析',
        description: '分析搜索结果质量',
        type: 'analysis',
        config: {
          ...getNodeDefaultConfig('analysis'),
          business: {
            ...getNodeDefaultConfig('analysis').business,
            enableQualityEvaluation: true,
            qualityThreshold: 60,
          },
        },
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
    {
      id: 'synthesis-1',
      type: 'synthesis',
      position: { x: 900, y: 300 },
      data: {
        label: '综合',
        description: '生成最终研究报告',
        type: 'synthesis',
        config: {
          ...getNodeDefaultConfig('synthesis'),
          business: {
            ...getNodeDefaultConfig('synthesis').business,
            reportFormat: 'structured',
            maxLength: 5000,
          },
        },
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
    {
      id: 'end-1',
      type: 'end',
      position: { x: 1100, y: 300 },
      data: {
        label: '结束',
        description: '工作流完成',
        type: 'end',
        config: getNodeDefaultConfig('end'),
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'start-1', target: 'planning-1', type: 'smoothstep' },
    { id: 'e2', source: 'planning-1', target: 'search-1', type: 'smoothstep' },
    { id: 'e3', source: 'search-1', target: 'analysis-1', type: 'smoothstep' },
    { id: 'e4', source: 'analysis-1', target: 'synthesis-1', type: 'smoothstep' },
    { id: 'e5', source: 'synthesis-1', target: 'end-1', type: 'smoothstep' },
  ],
};

// Template 2: Iterative Research with Quality Check
export const iterativeResearchTemplate: WorkflowTemplate = {
  id: 'iterative-research',
  name: '迭代研究流程',
  description: '带质量评估的迭代流程，自动补充搜索直到质量达标',
  category: '高级模板',
  nodes: [
    {
      id: 'start-2',
      type: 'start',
      position: { x: 100, y: 300 },
      data: {
        label: '开始',
        description: '迭代研究工作流入口',
        type: 'start',
        config: getNodeDefaultConfig('start'),
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
    {
      id: 'planning-2',
      type: 'planning',
      position: { x: 300, y: 300 },
      data: {
        label: '规划',
        description: '生成搜索策略',
        type: 'planning',
        config: getNodeDefaultConfig('planning'),
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
    {
      id: 'search-2',
      type: 'search',
      position: { x: 500, y: 300 },
      data: {
        label: '搜索',
        description: '执行搜索',
        type: 'search',
        config: getNodeDefaultConfig('search'),
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
    {
      id: 'analysis-2',
      type: 'analysis',
      position: { x: 700, y: 300 },
      data: {
        label: '质量分析',
        description: '评估搜索结果质量',
        type: 'analysis',
        config: {
          ...getNodeDefaultConfig('analysis'),
          business: {
            ...getNodeDefaultConfig('analysis').business,
            qualityThreshold: 80,
            targetQualityScore: 85,
          },
        },
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
    {
      id: 'condition-2',
      type: 'condition',
      position: { x: 900, y: 300 },
      data: {
        label: '质量检查',
        description: '检查质量是否达标',
        type: 'condition',
        config: {
          ...getNodeDefaultConfig('condition'),
          business: {
            ...getNodeDefaultConfig('condition').business,
            conditionExpression: 'qualityScore >= 80',
            trueLabel: '达标',
            falseLabel: '未达标',
          },
        },
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
    {
      id: 'synthesis-2',
      type: 'synthesis',
      position: { x: 1100, y: 200 },
      data: {
        label: '综合',
        description: '生成报告',
        type: 'synthesis',
        config: getNodeDefaultConfig('synthesis'),
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
    {
      id: 'loop-2',
      type: 'loop',
      position: { x: 700, y: 450 },
      data: {
        label: '迭代控制',
        description: '控制迭代次数',
        type: 'loop',
        config: {
          ...getNodeDefaultConfig('loop'),
          business: {
            ...getNodeDefaultConfig('loop').business,
            maxIterations: 3,
            exitCondition: 'quality_threshold',
          },
        },
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
    {
      id: 'end-2',
      type: 'end',
      position: { x: 1300, y: 200 },
      data: {
        label: '结束',
        description: '工作流完成',
        type: 'end',
        config: getNodeDefaultConfig('end'),
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'start-2', target: 'planning-2', type: 'smoothstep' },
    { id: 'e2', source: 'planning-2', target: 'search-2', type: 'smoothstep' },
    { id: 'e3', source: 'search-2', target: 'analysis-2', type: 'smoothstep' },
    { id: 'e4', source: 'analysis-2', target: 'condition-2', type: 'smoothstep' },
    { id: 'e5', source: 'condition-2', target: 'synthesis-2', type: 'smoothstep', label: '达标' },
    { id: 'e6', source: 'condition-2', target: 'loop-2', type: 'smoothstep', label: '未达标' },
    { id: 'e7', source: 'loop-2', target: 'search-2', type: 'smoothstep' },
    { id: 'e8', source: 'synthesis-2', target: 'end-2', type: 'smoothstep' },
  ],
};

// Template 3: Quick Search
export const quickSearchTemplate: WorkflowTemplate = {
  id: 'quick-search',
  name: '快速搜索',
  description: '简化的搜索流程，适合快速获取信息',
  category: '快速模板',
  nodes: [
    {
      id: 'start-3',
      type: 'start',
      position: { x: 100, y: 300 },
      data: {
        label: '开始',
        description: '快速搜索入口',
        type: 'start',
        config: getNodeDefaultConfig('start'),
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
    {
      id: 'search-3',
      type: 'search',
      position: { x: 300, y: 300 },
      data: {
        label: '快速搜索',
        description: '执行快速搜索',
        type: 'search',
        config: {
          ...getNodeDefaultConfig('search'),
          business: {
            ...getNodeDefaultConfig('search').business,
            maxResults: 5,
            days: 7,
          },
        },
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
    {
      id: 'synthesis-3',
      type: 'synthesis',
      position: { x: 500, y: 300 },
      data: {
        label: '快速综合',
        description: '生成简洁报告',
        type: 'synthesis',
        config: {
          ...getNodeDefaultConfig('synthesis'),
          business: {
            ...getNodeDefaultConfig('synthesis').business,
            reportFormat: 'executive',
            maxLength: 1000,
          },
        },
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
    {
      id: 'end-3',
      type: 'end',
      position: { x: 700, y: 300 },
      data: {
        label: '结束',
        description: '完成',
        type: 'end',
        config: getNodeDefaultConfig('end'),
        status: 'pending',
        logs: [],
        inputs: {},
        outputs: {},
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'start-3', target: 'search-3', type: 'smoothstep' },
    { id: 'e2', source: 'search-3', target: 'synthesis-3', type: 'smoothstep' },
    { id: 'e3', source: 'synthesis-3', target: 'end-3', type: 'smoothstep' },
  ],
};

// All templates
export const workflowTemplates: WorkflowTemplate[] = [
  standardResearchTemplate,
  iterativeResearchTemplate,
  quickSearchTemplate,
];

// Get template by ID
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((t) => t.id === id);
}

// Apply template to create new workflow
export function applyTemplate(templateId: string): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const template = getTemplateById(templateId);
  if (!template) {
    return { nodes: [], edges: [] };
  }

  // Generate new IDs for nodes
  const idMap = new Map<string, string>();
  const newNodes: WorkflowNode[] = template.nodes.map((node) => {
    const newId = crypto.randomUUID();
    idMap.set(node.id!, newId);
    return {
      ...node,
      id: newId,
      data: {
        ...node.data!,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    } as WorkflowNode;
  });

  // Update edge references
  const newEdges: WorkflowEdge[] = template.edges.map((edge) => ({
    ...edge,
    id: crypto.randomUUID(),
    source: idMap.get(edge.source!) || edge.source!,
    target: idMap.get(edge.target!) || edge.target!,
  })) as WorkflowEdge[];

  return { nodes: newNodes, edges: newEdges };
}
