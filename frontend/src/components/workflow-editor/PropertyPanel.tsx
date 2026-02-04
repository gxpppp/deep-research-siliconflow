/**
 * Property Panel - Enhanced Right panel for editing node and edge properties
 * Enterprise-grade configuration interface
 */

import { useState, useEffect } from 'react';
import { X, Trash2, AlertCircle, CheckCircle, Settings, Briefcase, Database, Zap, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkflowEditorStore } from '@/stores/workflowEditorStore';
import { NODE_TYPE_COLORS, NODE_TYPE_ICONS, WorkflowNode, WorkflowEdge } from '@/types/workflow';
import { validateNodeConfig, ValidationResult } from '@/utils/validation';
import { getNodeDefaultConfig } from '@/utils/nodeDefaults';
import * as Icons from 'lucide-react';

// Validation indicator component
function ValidationIndicator({ result }: { result: ValidationResult }) {
  if (result.errors.length > 0) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-xs">
        <AlertCircle className="w-4 h-4" />
        <span>{result.errors.length} 个错误</span>
      </div>
    );
  }
  if (result.warnings.length > 0) {
    return (
      <div className="flex items-center gap-2 text-yellow-400 text-xs">
        <AlertCircle className="w-4 h-4" />
        <span>{result.warnings.length} 个警告</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-green-400 text-xs">
      <CheckCircle className="w-4 h-4" />
      <span>配置有效</span>
    </div>
  );
}

// Basic Config Tab
function BasicConfigTab({ node, onChange }: { node: WorkflowNode; onChange: (data: any) => void }) {
  const config = node.data.config || getNodeDefaultConfig(node.type);
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-slate-400">名称 *</Label>
        <Input
          value={config.basic.label}
          onChange={(e) => onChange({ 
            config: { 
              ...config, 
              basic: { ...config.basic, label: e.target.value } 
            } 
          })}
          className="bg-slate-800 border-slate-700 text-slate-200"
          placeholder="节点名称"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-400">描述</Label>
        <Textarea
          value={config.basic.description}
          onChange={(e) => onChange({ 
            config: { 
              ...config, 
              basic: { ...config.basic, description: e.target.value } 
            } 
          })}
          className="bg-slate-800 border-slate-700 text-slate-200 min-h-[80px]"
          placeholder="节点功能描述..."
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-400">标签</Label>
        <Input
          value={config.basic.tags.join(', ')}
          onChange={(e) => onChange({ 
            config: { 
              ...config, 
              basic: { ...config.basic, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) } 
            } 
          })}
          className="bg-slate-800 border-slate-700 text-slate-200"
          placeholder="用逗号分隔标签"
        />
      </div>
    </div>
  );
}

// Business Config Tab
function BusinessConfigTab({ node, onChange }: { node: WorkflowNode; onChange: (data: any) => void }) {
  const config = node.data.config || getNodeDefaultConfig(node.type);
  const business = config.business;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-slate-400">启用节点</Label>
        <Switch
          checked={business.enabled}
          onCheckedChange={(checked) => onChange({ 
            config: { 
              ...config, 
              business: { ...business, enabled: checked } 
            } 
          })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-400">超时时间 (ms)</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[business.timeout]}
            onValueChange={([value]) => onChange({ 
              config: { 
                ...config, 
                business: { ...business, timeout: value } 
              } 
            })}
            min={1000}
            max={300000}
            step={1000}
            className="flex-1"
          />
          <span className="text-slate-300 w-20 text-right">{business.timeout}ms</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-400">重试次数</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[business.retryCount]}
            onValueChange={([value]) => onChange({ 
              config: { 
                ...config, 
                business: { ...business, retryCount: value } 
              } 
            })}
            min={0}
            max={10}
            step={1}
            className="flex-1"
          />
          <span className="text-slate-300 w-20 text-right">{business.retryCount}次</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-400">重试策略</Label>
        <Select
          value={business.retryStrategy}
          onValueChange={(value) => onChange({ 
            config: { 
              ...config, 
              business: { ...business, retryStrategy: value as any } 
            } 
          })}
        >
          <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">固定间隔</SelectItem>
            <SelectItem value="linear">线性递增</SelectItem>
            <SelectItem value="exponential">指数退避</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-400">错误处理</Label>
        <Select
          value={business.errorHandling}
          onValueChange={(value) => onChange({ 
            config: { 
              ...config, 
              business: { ...business, errorHandling: value as any } 
            } 
          })}
        >
          <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stop">停止执行</SelectItem>
            <SelectItem value="skip">跳过节点</SelectItem>
            <SelectItem value="retry">重试执行</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Node-specific business params */}
      {node.type === 'planning' && (
        <>
          <div className="space-y-2">
            <Label className="text-slate-400">最大查询数</Label>
            <Input
              type="number"
              value={(business as any).maxQueries || 5}
              onChange={(e) => onChange({ 
                config: { 
                  ...config, 
                  business: { ...business, maxQueries: parseInt(e.target.value) } 
                } 
              })}
              className="bg-slate-800 border-slate-700 text-slate-200"
              min={1}
              max={20}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-slate-400">使用增强规划</Label>
            <Switch
              checked={(business as any).useEnhancedPlanning ?? true}
              onCheckedChange={(checked) => onChange({ 
                config: { 
                  ...config, 
                  business: { ...business, useEnhancedPlanning: checked } 
                } 
              })}
            />
          </div>
        </>
      )}

      {node.type === 'search' && (
        <>
          <div className="space-y-2">
            <Label className="text-slate-400">搜索引擎</Label>
            <Select
              value={(business as any).engine || 'uapi'}
              onValueChange={(value) => onChange({ 
                config: { 
                  ...config, 
                  business: { ...business, engine: value } 
                } 
              })}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uapi">UAPI</SelectItem>
                <SelectItem value="bing">Bing</SelectItem>
                <SelectItem value="baidu">Baidu</SelectItem>
                <SelectItem value="duckduckgo">DuckDuckGo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-400">最大结果数</Label>
            <Input
              type="number"
              value={(business as any).maxResults || 10}
              onChange={(e) => onChange({ 
                config: { 
                  ...config, 
                  business: { ...business, maxResults: parseInt(e.target.value) } 
                } 
              })}
              className="bg-slate-800 border-slate-700 text-slate-200"
              min={1}
              max={50}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-400">时间范围 (天)</Label>
            <Input
              type="number"
              value={(business as any).days || 30}
              onChange={(e) => onChange({ 
                config: { 
                  ...config, 
                  business: { ...business, days: parseInt(e.target.value) } 
                } 
              })}
              className="bg-slate-800 border-slate-700 text-slate-200"
              min={1}
              max={365}
            />
          </div>
        </>
      )}

      {node.type === 'analysis' && (
        <>
          <div className="flex items-center justify-between">
            <Label className="text-slate-400">启用质量评估</Label>
            <Switch
              checked={(business as any).enableQualityEvaluation ?? true}
              onCheckedChange={(checked) => onChange({ 
                config: { 
                  ...config, 
                  business: { ...business, enableQualityEvaluation: checked } 
                } 
              })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-400">质量阈值</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[(business as any).qualityThreshold || 60]}
                onValueChange={([value]) => onChange({ 
                  config: { 
                    ...config, 
                    business: { ...business, qualityThreshold: value } 
                  } 
                })}
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-slate-300 w-20 text-right">{(business as any).qualityThreshold || 60}</span>
            </div>
          </div>
        </>
      )}

      {node.type === 'condition' && (
        <>
          <div className="space-y-2">
            <Label className="text-slate-400">条件表达式</Label>
            <Textarea
              value={(business as any).conditionExpression || 'score > 60'}
              onChange={(e) => onChange({ 
                config: { 
                  ...config, 
                  business: { ...business, conditionExpression: e.target.value } 
                } 
              })}
              className="bg-slate-800 border-slate-700 text-slate-200 font-mono text-sm"
              placeholder="例如: score > 60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-400">真分支标签</Label>
            <Input
              value={(business as any).trueLabel || '是'}
              onChange={(e) => onChange({ 
                config: { 
                  ...config, 
                  business: { ...business, trueLabel: e.target.value } 
                } 
              })}
              className="bg-slate-800 border-slate-700 text-slate-200"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-400">假分支标签</Label>
            <Input
              value={(business as any).falseLabel || '否'}
              onChange={(e) => onChange({ 
                config: { 
                  ...config, 
                  business: { ...business, falseLabel: e.target.value } 
                } 
              })}
              className="bg-slate-800 border-slate-700 text-slate-200"
            />
          </div>
        </>
      )}

      {node.type === 'loop' && (
        <>
          <div className="space-y-2">
            <Label className="text-slate-400">最大迭代次数</Label>
            <Input
              type="number"
              value={(business as any).maxIterations || 3}
              onChange={(e) => onChange({ 
                config: { 
                  ...config, 
                  business: { ...business, maxIterations: parseInt(e.target.value) } 
                } 
              })}
              className="bg-slate-800 border-slate-700 text-slate-200"
              min={1}
              max={100}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-400">退出条件</Label>
            <Select
              value={(business as any).exitCondition || 'quality_threshold'}
              onValueChange={(value) => onChange({ 
                config: { 
                  ...config, 
                  business: { ...business, exitCondition: value } 
                } 
              })}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quality_threshold">质量阈值</SelectItem>
                <SelectItem value="no_gaps">无信息缺口</SelectItem>
                <SelectItem value="max_iterations">最大迭代次数</SelectItem>
                <SelectItem value="custom">自定义条件</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}

// Advanced Config Tab
function AdvancedConfigTab({ node, onChange }: { node: WorkflowNode; onChange: (data: any) => void }) {
  const config = node.data.config || getNodeDefaultConfig(node.type);
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-slate-400">日志级别</Label>
        <Select
          value={config.advanced.logLevel}
          onValueChange={(value) => onChange({ 
            config: { 
              ...config, 
              advanced: { ...config.advanced, logLevel: value as any } 
            } 
          })}
        >
          <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="debug">Debug</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warn</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="silent">Silent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-400">优先级</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[config.advanced.priority]}
            onValueChange={([value]) => onChange({ 
              config: { 
                ...config, 
                advanced: { ...config.advanced, priority: value } 
              } 
            })}
            min={0}
            max={10}
            step={1}
            className="flex-1"
          />
          <span className="text-slate-300 w-20 text-right">{config.advanced.priority}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-slate-400">并行执行</Label>
        <Switch
          checked={config.advanced.parallelExecution}
          onCheckedChange={(checked) => onChange({ 
            config: { 
              ...config, 
              advanced: { ...config.advanced, parallelExecution: checked } 
            } 
          })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-400">版本</Label>
        <Input
          value={config.advanced.version}
          onChange={(e) => onChange({ 
            config: { 
              ...config, 
              advanced: { ...config.advanced, version: e.target.value } 
            } 
          })}
          className="bg-slate-800 border-slate-700 text-slate-200"
          placeholder="1.0.0"
        />
      </div>
    </div>
  );
}

export function PropertyPanel() {
  const {
    workflow,
    selectedNodeIds,
    selectedEdgeIds,
    updateNode,
    removeNode,
    updateEdge,
    removeEdge,
    togglePropertyPanel,
  } = useWorkflowEditorStore();

  const [validationResult, setValidationResult] = useState<ValidationResult>({ valid: true, errors: [], warnings: [] });

  const selectedNode = selectedNodeIds.length === 1
    ? workflow.nodes.find((n) => n.id === selectedNodeIds[0])
    : null;

  const selectedEdge = selectedEdgeIds.length === 1
    ? workflow.edges.find((e) => e.id === selectedEdgeIds[0])
    : null;

  // Validate node config when node changes
  useEffect(() => {
    if (selectedNode) {
      const config = selectedNode.data.config || getNodeDefaultConfig(selectedNode.type);
      const result = validateNodeConfig(selectedNode.type, config);
      setValidationResult(result);
    }
  }, [selectedNode]);

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
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-200">
                    {selectedNode.data.config?.basic?.label || selectedNode.data.label}
                  </div>
                  <div className="text-xs text-slate-500">{selectedNode.type}</div>
                </div>
                <ValidationIndicator result={validationResult} />
              </div>

              {/* Validation errors */}
              {validationResult.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-1">
                  {validationResult.errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {error.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Validation warnings */}
              {validationResult.warnings.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 space-y-1">
                  {validationResult.warnings.map((warning, index) => (
                    <div key={index} className="text-xs text-yellow-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {warning.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Configuration Tabs */}
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid grid-cols-3 bg-slate-800">
                  <TabsTrigger value="basic" className="text-xs">
                    <Settings className="w-3 h-3 mr-1" />
                    基础
                  </TabsTrigger>
                  <TabsTrigger value="business" className="text-xs">
                    <Briefcase className="w-3 h-3 mr-1" />
                    业务
                  </TabsTrigger>
                  <TabsTrigger value="advanced" className="text-xs">
                    <Sliders className="w-3 h-3 mr-1" />
                    高级
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="mt-4">
                  <BasicConfigTab 
                    node={selectedNode} 
                    onChange={(data) => handleUpdateNodeData('config', data.config)} 
                  />
                </TabsContent>

                <TabsContent value="business" className="mt-4">
                  <BusinessConfigTab 
                    node={selectedNode} 
                    onChange={(data) => handleUpdateNodeData('config', data.config)} 
                  />
                </TabsContent>

                <TabsContent value="advanced" className="mt-4">
                  <AdvancedConfigTab 
                    node={selectedNode} 
                    onChange={(data) => handleUpdateNodeData('config', data.config)} 
                  />
                </TabsContent>
              </Tabs>

              {/* Status */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-400 text-xs">执行状态</Label>
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

              {/* Logs */}
              {selectedNode.data.logs && selectedNode.data.logs.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-slate-400 text-xs">执行日志</Label>
                  <div className="bg-slate-800 rounded-lg p-3 max-h-[150px] overflow-auto">
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
                <Textarea
                  value={selectedEdge.data?.condition || ''}
                  onChange={(e) => handleUpdateEdgeData('condition', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-200 font-mono text-sm"
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
              <div className="flex items-center justify-between">
                <Label className="text-slate-400">动画效果</Label>
                <Switch
                  checked={selectedEdge.data?.animated || false}
                  onCheckedChange={(checked) => handleUpdateEdgeData('animated', checked)}
                />
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
