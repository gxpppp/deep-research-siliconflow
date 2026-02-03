/**
 * Planning Node - Generates search queries
 */

import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { WorkflowNodeData } from '@/types/workflow';

export const PlanningNode = memo((props: NodeProps<WorkflowNodeData>) => {
  return <BaseNode {...props} icon="Lightbulb" />;
});

PlanningNode.displayName = 'PlanningNode';
