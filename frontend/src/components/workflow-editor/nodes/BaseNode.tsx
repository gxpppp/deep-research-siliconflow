/**
 * Base Node Component - Enhanced with inline editing and detail view
 */

import { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronUp, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  Settings,
  MoreHorizontal
} from 'lucide-react';
import { WorkflowNodeData, NODE_TYPE_COLORS } from '@/types/workflow';
import { useWorkflowEditorStore } from '@/stores/workflowEditorStore';
import { EditableField, EditableTextarea } from './EditableField';
import * as Icons from 'lucide-react';

interface BaseNodeProps extends NodeProps<WorkflowNodeData> {
  icon: string;
  children?: React.ReactNode;
}

// Status icon component
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return <Play className="w-3 h-3 text-blue-400" />;
    case 'completed':
      return <CheckCircle className="w-3 h-3 text-green-400" />;
    case 'failed':
      return <XCircle className="w-3 h-3 text-red-400" />;
    default:
      return <Clock className="w-3 h-3 text-slate-500" />;
  }
}

// Detail row component
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1 text-xs">
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-300">{value}</span>
    </div>
  );
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
  const [isExpanded, setIsExpanded] = useState(false);
  const { updateNode, selectNode, setPropertyPanelOpen } = useWorkflowEditorStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return '运行中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      default: return '待执行';
    }
  };

  // Handle node update
  const handleUpdate = useCallback((updates: Partial<WorkflowNodeData>) => {
    updateNode(id, { ...data, ...updates });
  }, [id, data, updateNode]);

  // Handle expand toggle
  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  // Get key parameters to display
  const getKeyParams = () => {
    const config = data.config;
    if (!config) return [];
    
    const params: { label: string; value: string }[] = [];
    
    // Add business params based on node type
    const business = config.business as any;
    if (business) {
      if (business.maxQueries !== undefined) {
        params.push({ label: '查询数', value: `${business.maxQueries}` });
      }
      if (business.maxResults !== undefined) {
        params.push({ label: '结果数', value: `${business.maxResults}` });
      }
      if (business.qualityThreshold !== undefined) {
        params.push({ label: '质量阈值', value: `${business.qualityThreshold}` });
      }
      if (business.maxIterations !== undefined) {
        params.push({ label: '迭代次数', value: `${business.maxIterations}` });
      }
      if (business.timeout !== undefined) {
        params.push({ label: '超时', value: `${business.timeout / 1000}s` });
      }
      if (business.retryCount !== undefined) {
        params.push({ label: '重试', value: `${business.retryCount}次` });
      }
    }
    
    return params.slice(0, 3);
  };

  const keyParams = getKeyParams();

  return (
    <div
      className={`
        min-w-[200px] max-w-[280px] rounded-lg border-2 overflow-hidden
        transition-all duration-200 shadow-lg
        ${selected ? 'border-white shadow-xl ring-2 ring-white/20' : 'border-slate-700'}
      `}
      style={{
        backgroundColor: '#1e293b',
        borderColor: selected ? color : undefined,
      }}
      onDoubleClick={() => selectNode(id)}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ backgroundColor: `${color}20`, borderBottom: `1px solid ${color}40` }}
      >
        <div className="w-6 h-6 rounded flex items-center justify-center" style={{ color }}>
          {IconComponent && <IconComponent className="w-4 h-4" />}
        </div>
        
        {/* Editable Label */}
        <div className="flex-1 min-w-0">
          <EditableField
            value={data.config?.basic?.label || data.label}
            placeholder="节点名称"
            className="font-medium"
            onSave={(value) => {
              const config = data.config || { basic: { label: value } };
              handleUpdate({
                label: value,
                config: {
                  ...config,
                  basic: { ...config.basic, label: value }
                }
              });
            }}
          />
        </div>
        
        {/* Status Indicator */}
        {data.status && data.status !== 'pending' && (
          <div className={`w-2 h-2 rounded-full ${getStatusColor(data.status)}`} />
        )}
      </div>

      {/* Body */}
      <div className="p-3">
        {/* Editable Description */}
        <EditableTextarea
          value={data.config?.basic?.description || data.description || ''}
          placeholder="点击添加描述..."
          rows={2}
          onSave={(value) => {
            const config = data.config || { basic: {} };
            handleUpdate({
              description: value,
              config: {
                ...config,
                basic: { ...config.basic, description: value }
              }
            });
          }}
        />

        {/* Key Parameters Preview */}
        {keyParams.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {keyParams.map((param, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-[10px] bg-slate-700/50 text-slate-400 border-0"
              >
                {param.label}: {param.value}
              </Badge>
            ))}
          </div>
        )}

        {/* Custom Children */}
        {children}

        {/* Expand/Collapse Button */}
        <button
          onClick={toggleExpand}
          className="w-full mt-2 flex items-center justify-center gap-1 py-1 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-700/30 rounded transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              收起详情
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              展开详情
            </>
          )}
        </button>

        {/* Detail View (Expanded) */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-2">
            {/* Status */}
            <div className="flex items-center gap-2">
              <StatusIcon status={data.status} />
              <span className="text-xs text-slate-400">
                状态: {getStatusText(data.status)}
              </span>
            </div>

            {/* Config Summary */}
            {data.config && (
              <div className="bg-slate-800/50 rounded p-2 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  配置摘要
                </div>
                <DetailRow 
                  label="超时" 
                  value={`${(data.config.business.timeout / 1000).toFixed(0)}s`} 
                />
                <DetailRow 
                  label="重试" 
                  value={`${data.config.business.retryCount}次`} 
                />
                <DetailRow 
                  label="日志级别" 
                  value={data.config.advanced.logLevel} 
                />
              </div>
            )}

            {/* Execution Info */}
            {data.executionTime && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                执行时间: {data.executionTime}ms
              </div>
            )}

            {/* Recent Logs */}
            {data.logs && data.logs.length > 0 && (
              <div className="bg-slate-800/50 rounded p-2">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  最近日志
                </div>
                <div className="space-y-0.5 max-h-[80px] overflow-y-auto">
                  {data.logs.slice(-3).map((log, index) => (
                    <div key={index} className="text-[10px] text-slate-400 font-mono truncate">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-7 text-xs text-slate-400 hover:text-slate-200"
                onClick={(e) => {
                  e.stopPropagation();
                  selectNode(id);
                  setPropertyPanelOpen(true);
                }}
              >
                <Settings className="w-3 h-3 mr-1" />
                详细设置
              </Button>
            </div>
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
