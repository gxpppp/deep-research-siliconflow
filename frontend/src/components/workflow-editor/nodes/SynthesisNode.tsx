/**
 * Synthesis Node - Generates final report
 */

import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { WorkflowNodeData } from '@/types/workflow';

export const SynthesisNode = memo((props: NodeProps<WorkflowNodeData>) => {
  return <BaseNode {...props} icon="FileText" />;
});

SynthesisNode.displayName = 'SynthesisNode';
