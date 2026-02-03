/**
 * Loop Node - Iterative execution control
 */

import { memo } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { WorkflowNodeData } from '@/types/workflow';

export const LoopNode = memo((props: NodeProps<WorkflowNodeData>) => {
  return (
    <>
      <BaseNode {...props} icon="Repeat">
        {props.data.parameters?.max_iterations && (
          <div className="text-xs text-slate-400">
            最大迭代: {props.data.parameters.max_iterations}
          </div>
        )}
      </BaseNode>
      {/* Loop back handle */}
      <Handle
        type="source"
        id="loop"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-700"
        style={{ bottom: -6 }}
      />
    </>
  );
});

LoopNode.displayName = 'LoopNode';
