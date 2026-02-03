/**
 * Property Panel - Right panel for editing node properties
 */

import { useState } from 'react';
import { X, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useWorkflowEditorStore } from '@/stores/workflowEditorStore';
import { NODE_TYPE_COLORS, NODE_TYPE_ICONS } from '@/types/workflow';
import * as Icons from 'lucide-react';

export function PropertyPanel() {
  const {
    workflow,
    selectedNodeIds,
    selectedEdgeIds,
    updateNode,
    removeNode,
    updateEdge,
    removeEdge,
    deselectAll,
    togglePropertyPanel,
  } = useWorkflowEditorStore();

  const selectedNode = selectedNodeIds.length === 1
    ? workflow.nodes.find((n) => n.id === selectedNodeIds[0])
    : null;

  const selectedEdge = selectedEdgeIds.length === 1
    ? workflow.edges.find((e) => e.id === selectedEdgeIds[0])
    : null;

  const handleUpdateNodeData = (key: string, value: any) => {
    if (selectedNode) {
      updateNode(selectedNode.id, { ...selectedNode.data, [key]: value });
    }
  };

  const handleUpdateEdgeData = (key: string, value: any) => {
    if (selectedEdge) {
      updateEdge(selectedEdge.id, { ...selectedEdge.data, [key]: value });
    }
  };

  const handleDelete = () => {
    if (selectedNode) {
      removeNode(selectedNode.id);
    } else if (selectedEdge) {
      removeEdge(selectedEdge.id);
    }
  };

  // Get icon component
  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">属性面板</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePropertyPanel}>
          <X className="w-4 h-4 text-slate-400" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* No selection */}
          {!selectedNode && !selectedEdge && (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">选择一个节点或连接线</p>
              <p className="text-xs mt-1">查看和编辑属性</p>
            </div>
          )}

          {/* Node properties */}
          {selectedNode && (
            <>
              {/* Node header */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: `${NODE_TYPE_COLORS[selectedNode.type]}20`,
                    border: `1px solid ${NODE_TYPE_COLORS[selectedNode.type]}40`,
                  }}
                >
                  <div style={{ color: NODE_TYPE_COLORS[selectedNode.type] }}>
                    {getIcon(NODE_TYPE_ICONS[selectedNode.type])}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    {selectedNode.data.label}
                  </div>
                  <div className="text-xs text-slate-500">{selectedNode.type}</div>
                </div>
              </div>

              {/* Label */}
              <div className="space-y-2">
                <Label className="text-slate-400">名称</Label>
                <Input
                  value={selectedNode.data.label}
                  onChange={(e) => handleUpdateNodeData('label', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-slate-400">描述</Label>
                <Textarea
                  value={selectedNode.data.description || ''}
                  onChange={(e) => handleUpdateNodeData('description', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-200 min-h-[80px]"
                  placeholder="节点描述..."
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-slate-400">状态</Label>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={selectedNode.data.status === 'completed' ? 'default' : 'secondary'}
                    className={`
                      ${selectedNode.data.status === 'running' ? 'bg-blue-500' : ''}
                      ${selectedNode.data.status === 'completed' ? 'bg-green-500' : ''}
                      ${selectedNode.data.status === 'failed' ? 'bg-red-500' : ''}
                      ${selectedNode.data.status === 'pending' ? 'bg-slate-600' : ''}
                    `}
                  >
                    {selectedNode.data.status === 'running' && '运行中'}
                    {selectedNode.data.status === 'completed' && '已完成'}
                    {selectedNode.data.status === 'failed' && '失败'}
                    {selectedNode.data.status === 'pending' && '待执行'}
                  </Badge>
                </div>
              </div>

              {/* Parameters */}
              {Object.keys(selectedNode.data.parameters || {}).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-slate-400">参数</Label>
                  <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                    {Object.entries(selectedNode.data.parameters).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-slate-500">{key}</span>
                        <span className="text-slate-300">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Logs */}
              {selectedNode.data.logs && selectedNode.data.logs.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-slate-400">执行日志</Label>
                  <div className="bg-slate-800 rounded-lg p-3 max-h-[200px] overflow-auto">
                    {selectedNode.data.logs.map((log, index) => (
                      <div key={index} className="text-xs text-slate-400 font-mono">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-slate-800">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除节点
                </Button>
              </div>
            </>
          )}

          {/* Edge properties */}
          {selectedEdge && (
            <>
              <div className="pb-4 border-b border-slate-800">
                <div className="text-sm font-medium text-slate-200">连接线</div>
                <div className="text-xs text-slate-500">
                  {selectedEdge.source} → {selectedEdge.target}
                </div>
              </div>

              {/* Condition */}
              <div className="space-y-2">
                <Label className="text-slate-400">条件表达式</Label>
                <Input
                  value={selectedEdge.data?.condition || ''}
                  onChange={(e) => handleUpdateEdgeData('condition', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  placeholder="例如: score > 60"
                />
              </div>

              {/* Label */}
              <div className="space-y-2">
                <Label className="text-slate-400">标签</Label>
                <Input
                  value={selectedEdge.data?.label || ''}
                  onChange={(e) => handleUpdateEdgeData('label', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  placeholder="标签文本"
                />
              </div>

              {/* Animated */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="animated"
                  checked={selectedEdge.data?.animated || false}
                  onChange={(e) => handleUpdateEdgeData('animated', e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800"
                />
                <Label htmlFor="animated" className="text-slate-400 cursor-pointer">
                  动画效果
                </Label>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-800">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除连接线
                </Button>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
