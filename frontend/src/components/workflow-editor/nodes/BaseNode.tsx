/**
 * Base Node Component - Enhanced with inline editing, detail view, and execution status
 */

import { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronUp, 
  Clock,
  Settings,
  AlertCircle,
  Terminal
} from 'lucide-react';
import { WorkflowNodeData, NODE_TYPE_COLORS } from '@/types/workflow';
import { useWorkflowEditorStore } from '@/stores/workflowEditorStore';
import { EditableField, EditableTextarea } from './EditableField';
import { StatusIndicator, ErrorBadge } from './StatusIndicator';
import { ErrorDetailModal } from './ErrorDetailModal';
import * as Icons from 'lucide-react';

interface BaseNodeProps extends NodeProps<WorkflowNodeData> {
  icon: string;
  children?: React.ReactNode;
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

// Log entry component with level-based coloring
function LogEntry({ log }: { log: string }) {
  // Parse log level from log string (e.g., "[INFO] message" or "[ERROR] message")
  const levelMatch = log.match(/^\[(\w+)\]/);
  const level = levelMatch ? levelMatch[1].toLowerCase() : 'info';
  
  const colors: Record<string, string> = {
    debug: 'text-blue-400',
    info: 'text-slate-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
  };

  return (
    <div className={`text-[10px] font-mono truncate ${colors[level] || colors.info}`}>
      {log}
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
  const [showErrorModal, setShowErrorModal] = useState(false);
  const { updateNode, selectNode, setPropertyPanelOpen } = useWorkflowEditorStore();

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

  // Get node status style
  const getNodeStatusStyle = () => {
    switch (data.status) {
      case 'running':
        return {
          boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)',
          animation: 'pulse-ring 2s infinite',
        };
      case 'completed':
        return {
          boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.5)',
        };
      case 'failed':
        return {
          boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.3)',
        };
      default:
        return {};
    }
  };

  return (
    <>
      {/* Error Detail Modal */}
      <ErrorDetailModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        nodeId={id}
        nodeName={data.config?.basic?.label || data.label}
        error={data.error ? {
          message: data.error,
          type: 'runtime',
          timestamp: new Date().toISOString(),
          suggestions: [
            '检查节点配置参数是否正确',
            '查看执行日志获取详细信息',
            '尝试增加超时时间',
            '检查网络连接状态',
          ],
        } : undefined}
        onRetry={() => {
          // Retry logic will be implemented in the execution hook
          console.log('Retry node:', id);
        }}
        onConfigure={() => {
          selectNode(id);
          setPropertyPanelOpen(true);
        }}
      />

      <div
        className={`
          min-w-[200px] max-w-[280px] rounded-lg border-2 overflow-hidden
          transition-all duration-200 shadow-lg relative
          ${selected ? 'border-white shadow-xl ring-2 ring-white/20' : 'border-slate-700'}
        `}
        style={{
          backgroundColor: '#1e293b',
          borderColor: selected ? color : data.status === 'failed' ? '#ef4444' : data.status === 'running' ? '#3b82f6' : undefined,
          ...getNodeStatusStyle(),
        }}
        onDoubleClick={() => selectNode(id)}
      >
        {/* Running Animation Overlay */}
        {data.status === 'running' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
            <div className="absolute inset-0 border-2 border-blue-400/30 rounded-lg animate-ping" />
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent"
              style={{
                animation: 'shimmer 2s infinite',
              }}
            />
          </div>
        )}

        {/* Error Badge */}
        {data.status === 'failed' && (
          <div className="absolute -top-2 -right-2 z-10">
            <ErrorBadge
              errorCount={1}
              onClick={(e) => {
                e?.stopPropagation();
                setShowErrorModal(true);
              }}
            />
          </div>
        )}

        {/* Header */}
        <div
          className="px-3 py-2 flex items-center gap-2 relative"
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
          <StatusIndicator 
            status={data.status} 
            size="sm"
            executionTime={data.executionTime}
          />
        </div>

        {/* Body */}
        <div className="p-3 relative">
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
              {/* Status with Label */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">执行状态</span>
                <StatusIndicator 
                  status={data.status} 
                  size="sm" 
                  showLabel
                  executionTime={data.executionTime}
                />
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

              {/* Recent Logs */}
              {data.logs && data.logs.length > 0 && (
                <div className="bg-slate-800/50 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      最近日志
                    </div>
                    <Terminal className="w-3 h-3 text-slate-500" />
                  </div>
                  <div className="space-y-0.5 max-h-[100px] overflow-y-auto">
                    {data.logs.slice(-5).map((log, index) => (
                      <LogEntry key={index} log={log} />
                    ))}
                  </div>
                </div>
              )}

              {/* Error Preview (if failed) */}
              {data.status === 'failed' && data.error && (
                <div 
                  className="bg-red-500/10 border border-red-500/30 rounded p-2 cursor-pointer hover:bg-red-500/20 transition-colors"
                  onClick={() => setShowErrorModal(true)}
                >
                  <div className="flex items-center gap-1 text-red-400 text-xs">
                    <AlertCircle className="w-3 h-3" />
                    <span className="truncate">{data.error}</span>
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
          className={`!w-3 !h-3 !border-2 !border-slate-700 transition-colors ${
            data.status === 'running' ? '!bg-blue-400' : 
            data.status === 'completed' ? '!bg-green-400' :
            data.status === 'failed' ? '!bg-red-400' : '!bg-slate-400'
          }`}
          style={{ left: -6 }}
        />

        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Right}
          className={`!w-3 !h-3 !border-2 !border-slate-700 transition-colors ${
            data.status === 'running' ? '!bg-blue-400' : 
            data.status === 'completed' ? '!bg-green-400' :
            data.status === 'failed' ? '!bg-red-400' : '!bg-slate-400'
          }`}
          style={{ right: -6 }}
        />
      </div>

      {/* Add shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>
    </>
  );
});

BaseNode.displayName = 'BaseNode';
