/**
 * Search Node - Executes web searches
 */

import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { WorkflowNodeData } from '@/types/workflow';

export const SearchNode = memo((props: NodeProps<WorkflowNodeData>) => {
  return <BaseNode {...props} icon="Search" />;
});

SearchNode.displayName = 'SearchNode';
