/**
 * Validation System for Workflow Editor
 * Enterprise-grade validation rules and engine
 */

import {
  ValidationRule,
  ValidationError,
  ValidationResult,
  WorkflowNodeType,
  NodeConfigSchema,
  WorkflowNode,
  WorkflowEdge,
} from '@/types/workflow';

// ==========================================
// Validation Rules by Node Type
// ==========================================

export const nodeValidationRules: Record<WorkflowNodeType, ValidationRule[]> = {
  start: [
    { field: 'config.basic.label', type: 'required', message: '节点名称不能为空' },
    { field: 'config.basic.label', type: 'min', value: 1, message: '节点名称至少1个字符' },
    { field: 'config.basic.label', type: 'max', value: 50, message: '节点名称不能超过50个字符' },
  ],
  end: [
    { field: 'config.basic.label', type: 'required', message: '节点名称不能为空' },
    { field: 'config.basic.label', type: 'min', value: 1, message: '节点名称至少1个字符' },
    { field: 'config.basic.label', type: 'max', value: 50, message: '节点名称不能超过50个字符' },
  ],
  planning: [
    { field: 'config.basic.label', type: 'required', message: '节点名称不能为空' },
    { field: 'config.basic.label', type: 'min', value: 1, message: '节点名称至少1个字符' },
    { field: 'config.business.maxQueries', type: 'required', message: '最大查询数不能为空' },
    { field: 'config.business.maxQueries', type: 'min', value: 1, message: '最大查询数至少为1' },
    { field: 'config.business.maxQueries', type: 'max', value: 20, message: '最大查询数不能超过20' },
    { field: 'config.business.timeout', type: 'min', value: 1000, message: '超时时间至少1000ms' },
    { field: 'config.business.timeout', type: 'max', value: 300000, message: '超时时间不能超过300000ms' },
  ],
  search: [
    { field: 'config.basic.label', type: 'required', message: '节点名称不能为空' },
    { field: 'config.business.maxResults', type: 'required', message: '最大结果数不能为空' },
    { field: 'config.business.maxResults', type: 'min', value: 1, message: '最大结果数至少为1' },
    { field: 'config.business.maxResults', type: 'max', value: 50, message: '最大结果数不能超过50' },
    { field: 'config.business.days', type: 'min', value: 1, message: '时间范围至少为1天' },
    { field: 'config.business.days', type: 'max', value: 365, message: '时间范围不能超过365天' },
  ],
  analysis: [
    { field: 'config.basic.label', type: 'required', message: '节点名称不能为空' },
    { field: 'config.business.qualityThreshold', type: 'min', value: 0, message: '质量阈值不能小于0' },
    { field: 'config.business.qualityThreshold', type: 'max', value: 100, message: '质量阈值不能超过100' },
    { field: 'config.business.targetQualityScore', type: 'min', value: 0, message: '目标质量分数不能小于0' },
    { field: 'config.business.targetQualityScore', type: 'max', value: 100, message: '目标质量分数不能超过100' },
  ],
  synthesis: [
    { field: 'config.basic.label', type: 'required', message: '节点名称不能为空' },
    { field: 'config.business.maxLength', type: 'min', value: 100, message: '最大长度至少为100' },
    { field: 'config.business.maxLength', type: 'max', value: 50000, message: '最大长度不能超过50000' },
  ],
  condition: [
    { field: 'config.basic.label', type: 'required', message: '节点名称不能为空' },
    { field: 'config.business.conditionExpression', type: 'required', message: '条件表达式不能为空' },
    { field: 'config.business.conditionExpression', type: 'min', value: 1, message: '条件表达式至少1个字符' },
  ],
  loop: [
    { field: 'config.basic.label', type: 'required', message: '节点名称不能为空' },
    { field: 'config.business.maxIterations', type: 'required', message: '最大迭代次数不能为空' },
    { field: 'config.business.maxIterations', type: 'min', value: 1, message: '最大迭代次数至少为1' },
    { field: 'config.business.maxIterations', type: 'max', value: 100, message: '最大迭代次数不能超过100' },
  ],
};

// ==========================================
// Validation Engine
// ==========================================

export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

export function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}

export function validateField(
  value: any,
  rule: ValidationRule,
  context?: any
): ValidationError | null {
  switch (rule.type) {
    case 'required':
      if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
        return { field: rule.field, message: rule.message, type: rule.type };
      }
      break;

    case 'min':
      if (typeof value === 'number' && value < (rule.min ?? rule.value ?? 0)) {
        return { field: rule.field, message: rule.message, type: rule.type };
      }
      if (typeof value === 'string' && value.length < (rule.min ?? rule.value ?? 0)) {
        return { field: rule.field, message: rule.message, type: rule.type };
      }
      break;

    case 'max':
      if (typeof value === 'number' && value > (rule.max ?? rule.value ?? Infinity)) {
        return { field: rule.field, message: rule.message, type: rule.type };
      }
      if (typeof value === 'string' && value.length > (rule.max ?? rule.value ?? Infinity)) {
        return { field: rule.field, message: rule.message, type: rule.type };
      }
      break;

    case 'pattern':
      if (typeof value === 'string' && rule.pattern && !rule.pattern.test(value)) {
        return { field: rule.field, message: rule.message, type: rule.type };
      }
      break;

    case 'email':
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof value === 'string' && !emailPattern.test(value)) {
        return { field: rule.field, message: rule.message, type: rule.type };
      }
      break;

    case 'url':
      try {
        if (typeof value === 'string') new URL(value);
      } catch {
        return { field: rule.field, message: rule.message, type: rule.type };
      }
      break;

    case 'range':
      if (typeof value === 'number') {
        const min = rule.min ?? -Infinity;
        const max = rule.max ?? Infinity;
        if (value < min || value > max) {
          return { field: rule.field, message: rule.message, type: rule.type };
        }
      }
      break;

    case 'custom':
      if (rule.validator && !rule.validator(value, context)) {
        return { field: rule.field, message: rule.message, type: rule.type };
      }
      break;
  }

  return null;
}

export function validateNodeConfig(
  nodeType: WorkflowNodeType,
  config: NodeConfigSchema,
  context?: any
): ValidationResult {
  const rules = nodeValidationRules[nodeType] || [];
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  for (const rule of rules) {
    const value = getNestedValue(config, rule.field);
    const error = validateField(value, rule, context);
    if (error) {
      errors.push(error);
    }
  }

  // Add warnings for best practices
  if (config.business.timeout < 5000) {
    warnings.push({
      field: 'config.business.timeout',
      message: '超时时间较短，可能导致网络不稳定时失败',
      type: 'warning',
    });
  }

  if (config.business.retryCount > 5) {
    warnings.push({
      field: 'config.business.retryCount',
      message: '重试次数较多，可能影响执行效率',
      type: 'warning',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check for start nodes
  const startNodes = nodes.filter((n) => n.type === 'start');
  if (startNodes.length === 0) {
    errors.push({
      field: 'workflow',
      message: '工作流必须包含至少一个开始节点',
      type: 'required',
    });
  }
  if (startNodes.length > 1) {
    warnings.push({
      field: 'workflow',
      message: '多个开始节点可能导致执行路径混乱',
      type: 'warning',
    });
  }

  // Check for end nodes
  const endNodes = nodes.filter((n) => n.type === 'end');
  if (endNodes.length === 0) {
    errors.push({
      field: 'workflow',
      message: '工作流必须包含至少一个结束节点',
      type: 'required',
    });
  }

  // Check for disconnected nodes
  const connectedNodeIds = new Set<string>();
  edges.forEach((edge) => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  nodes.forEach((node) => {
    if (!connectedNodeIds.has(node.id) && nodes.length > 1) {
      errors.push({
        field: `node.${node.id}`,
        message: `节点 "${node.data.label}" 未连接`,
        type: 'connectivity',
      });
    }
  });

  // Check for cycles (simple check)
  const adjacencyList = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (!adjacencyList.has(edge.source)) {
      adjacencyList.set(edge.source, []);
    }
    adjacencyList.get(edge.source)!.push(edge.target);
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) {
        errors.push({
          field: 'workflow',
          message: '工作流包含循环，可能导致无限执行',
          type: 'cycle',
        });
        break;
      }
    }
  }

  // Validate each node config
  nodes.forEach((node) => {
    const nodeValidation = validateNodeConfig(node.type, node.data.config);
    if (!nodeValidation.valid) {
      errors.push(...nodeValidation.errors.map((e) => ({
        ...e,
        field: `node.${node.id}.${e.field}`,
      })));
    }
    warnings.push(...nodeValidation.warnings.map((w) => ({
      ...w,
      field: `node.${node.id}.${w.field}`,
    })));
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ==========================================
// Real-time Validation Hook
// ==========================================

export function useValidation() {
  const validate = (
    nodeType: WorkflowNodeType,
    config: NodeConfigSchema
  ): ValidationResult => {
    return validateNodeConfig(nodeType, config);
  };

  const validateFieldRealtime = (
    field: string,
    value: any,
    rules: ValidationRule[]
  ): ValidationError | null => {
    for (const rule of rules) {
      if (rule.field === field) {
        return validateField(value, rule);
      }
    }
    return null;
  };

  return {
    validate,
    validateField: validateFieldRealtime,
    validateWorkflow,
  };
}
