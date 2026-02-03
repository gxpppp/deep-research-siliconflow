/**
 * Base Node Component - Common structure for all workflow nodes
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { WorkflowNodeData, NODE_TYPE_COLORS } from '@/types/workflow';
import * as Icons from 'lucide-react';

interface BaseNodeProps extends NodeProps<WorkflowNodeData> {
  icon: string;
  children?: React.ReactNode;
}

export const BaseNode = memo(({ 
  id, 
  data, 
  selected, 
  icon,
  children 
}: BaseNodeProps) => {
  const color = NODE_TYPE_COLORS[data.type];
  const IconComponent = (Icons as any)[icon];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div
      className={`
        min-w-[180px] max-w-[240px] rounded-lg border-2 overflow-hidden
        transition-all duration-200 shadow-lg
        ${selected ? 'border-white shadow-xl' : 'border-slate-700'}
      `}
      style={{
        backgroundColor: '#1e293b',
        borderColor: selected ? color : undefined,
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ backgroundColor: `${color}20`, borderBottom: `1px solid ${color}40` }}
      >
        <div className="w-6 h-6 rounded flex items-center justify-center" style={{ color }}>
          {IconComponent && <IconComponent className="w-4 h-4" />}
        </div>
        <span className="text-sm font-medium text-slate-200 truncate flex-1">
          {data.label}
        </span>
        {data.status && data.status !== 'pending' && (
          <div className={`w-2 h-2 rounded-full ${getStatusColor(data.status)}`} />
        )}
      </div>

      {/* Body */}
      <div className="p-3">
        {data.description && (
          <p className="text-xs text-slate-400 mb-2 line-clamp-2">{data.description}</p>
        )}
        
        {children}

        {/* Parameters preview */}
        {Object.keys(data.parameters || {}).length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-700">
            {Object.entries(data.parameters).slice(0, 2).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-slate-500">{key}:</span>
                <span className="text-slate-300 truncate max-w-[80px]">
                  {String(value)}
                </span>
              </div>
            ))}
            {Object.keys(data.parameters).length > 2 && (
              <span className="text-xs text-slate-500">...</span>
            )}
          </div>
        )}
      </div>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-700"
        style={{ left: -6 }}
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-700"
        style={{ right: -6 }}
      />
    </div>
  );
});

BaseNode.displayName = 'BaseNode';
