/**
 * End Node - Exit point for workflow
 */

import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { WorkflowNodeData } from '@/types/workflow';

export const EndNode = memo((props: NodeProps<WorkflowNodeData>) => {
  return <BaseNode {...props} icon="Square" />;
});

EndNode.displayName = 'EndNode';
