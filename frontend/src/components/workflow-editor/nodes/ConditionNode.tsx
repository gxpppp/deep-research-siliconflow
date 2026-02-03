/**
 * Condition Node - Conditional branching
 */

import { memo } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { WorkflowNodeData } from '@/types/workflow';

export const ConditionNode = memo((props: NodeProps<WorkflowNodeData>) => {
  return (
    <>
      <BaseNode {...props} icon="GitBranch">
        {props.data.parameters?.condition && (
          <div className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
            {props.data.parameters.condition}
          </div>
        )}
      </BaseNode>
      {/* Additional output handles for true/false branches */}
      <Handle
        type="source"
        id="true"
        position={Position.Right}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-slate-700"
        style={{ right: -6, top: '35%' }}
      />
      <Handle
        type="source"
        id="false"
        position={Position.Right}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-slate-700"
        style={{ right: -6, top: '65%' }}
      />
    </>
  );
});

ConditionNode.displayName = 'ConditionNode';
