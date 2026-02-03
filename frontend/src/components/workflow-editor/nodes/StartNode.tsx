/**
 * Start Node - Entry point for workflow
 */

import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { WorkflowNodeData } from '@/types/workflow';

export const StartNode = memo((props: NodeProps<WorkflowNodeData>) => {
  return <BaseNode {...props} icon="Play" />;
});

StartNode.displayName = 'StartNode';
