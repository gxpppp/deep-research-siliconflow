/**
 * Analysis Node - Analyzes search results
 */

import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { WorkflowNodeData } from '@/types/workflow';

export const AnalysisNode = memo((props: NodeProps<WorkflowNodeData>) => {
  return <BaseNode {...props} icon="BarChart3" />;
});

AnalysisNode.displayName = 'AnalysisNode';
