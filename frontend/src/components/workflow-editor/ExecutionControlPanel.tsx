/**
 * ExecutionControlPanel Component
 * Control panel for workflow execution with input parameters
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Terminal,
  Settings,
} from 'lucide-react';
import { useWorkflowEditorStore } from '@/stores/workflowEditorStore';
import { ExecutionState } from '@/types/workflow';

interface ExecutionControlPanelProps {
  onStartExecution: (input: string) => void;
  onPauseExecution: () => void;
  onStopExecution: () => void;
  onResetExecution: () => void;
}

// Input parameters dialog
function ExecutionInputDialog({
  isOpen,
  onClose,
  onStart,
}: {
  isOpen: boolean;
  onClose: () => void;
  onStart: (input: string) => void;
}) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    await onStart(input);
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-slate-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-green-400" />
            开始执行工作流
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            输入研究主题或查询内容，开始执行工作流
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="query" className="text-slate-400">
              研究主题 / 查询内容 *
            </Label>
            <Input
              id="query"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如：人工智能在医疗领域的最新进展"
              className="bg-slate-800 border-slate-700 text-slate-200"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim()) {
                  handleStart();
                }
              }}
            />
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
            <h4 className="text-xs font-medium text-slate-500 uppercase">执行配置</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">模型</span>
                <span className="text-slate-300">DeepSeek-V2.5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">超时</span>
                <span className="text-slate-300">5分钟</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">最大迭代</span>
                <span className="text-slate-300">3次</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">质量阈值</span>
                <span className="text-slate-300">80分</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-700 text-slate-400"
            >
              取消
            </Button>
            <Button
              onClick={handleStart}
              disabled={!input.trim() || isLoading}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  启动中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  开始执行
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Execution statistics component
function ExecutionStats({ stats }: { stats: ExecutionState['statistics'] }) {
  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1">
        <span className="text-slate-500">总节点:</span>
        <Badge variant="secondary" className="bg-slate-700 text-slate-300">
          {stats.totalNodes}
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-slate-500">已完成:</span>
        <Badge variant="secondary" className="bg-green-500/20 text-green-400">
          {stats.completedNodes}
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-slate-500">失败:</span>
        <Badge variant="secondary" className="bg-red-500/20 text-red-400">
          {stats.failedNodes}
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-slate-500">跳过:</span>
        <Badge variant="secondary" className="bg-gray-500/20 text-gray-400">
          {stats.skippedNodes}
        </Badge>
      </div>
    </div>
  );
}

// Execution timer component
function ExecutionTimer({ startTime, endTime }: { startTime?: string; endTime?: string }) {
  const [elapsed, setElapsed] = useState(0);

  useState(() => {
    if (!startTime || endTime) return;
    
    const interval = setInterval(() => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      setElapsed(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!startTime) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-slate-500">
      <Clock className="w-3 h-3" />
      <span>{formatTime(elapsed)}</span>
    </div>
  );
}

export function ExecutionControlPanel({
  onStartExecution,
  onPauseExecution,
  onStopExecution,
  onResetExecution,
}: ExecutionControlPanelProps) {
  const [showInputDialog, setShowInputDialog] = useState(false);
  const { execution, workflow } = useWorkflowEditorStore();

  const handleStart = (input: string) => {
    onStartExecution(input);
  };

  return (
    <>
      <ExecutionInputDialog
        isOpen={showInputDialog}
        onClose={() => setShowInputDialog(false)}
        onStart={handleStart}
      />

      <div className="bg-slate-900 border-b border-slate-800 p-4">
        <div className="flex items-center justify-between">
          {/* Left: Title and Status */}
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-sm font-medium text-slate-200">工作流执行</h2>
              <p className="text-xs text-slate-500">
                {execution.isRunning
                  ? '正在执行中...'
                  : execution.statistics.completedNodes > 0
                  ? '执行已完成'
                  : '准备就绪'}
              </p>
            </div>

            {execution.isRunning && (
              <ExecutionTimer startTime={execution.startTime} />
            )}
          </div>

          {/* Center: Progress and Stats */}
          <div className="flex-1 max-w-md mx-8">
            {execution.isRunning && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">执行进度</span>
                  <span className="text-slate-300">{execution.progress}%</span>
                </div>
                <Progress value={execution.progress} className="h-2" />
              </div>
            )}
            {execution.statistics.totalNodes > 0 && (
              <ExecutionStats stats={execution.statistics} />
            )}
          </div>

          {/* Right: Control Buttons */}
          <div className="flex items-center gap-2">
            {!execution.isRunning ? (
              <>
                {execution.statistics.completedNodes > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onResetExecution}
                    className="border-slate-700 text-slate-400"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    重置
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setShowInputDialog(true)}
                  disabled={workflow.nodes.length === 0}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Play className="w-4 h-4 mr-1" />
                  开始执行
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPauseExecution}
                  className="border-slate-700 text-slate-400"
                >
                  <Pause className="w-4 h-4 mr-1" />
                  暂停
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onStopExecution}
                >
                  <Square className="w-4 h-4 mr-1" />
                  停止
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Current Node Info */}
        {execution.isRunning && execution.currentNodeId && (
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            <span className="text-xs text-slate-400">当前执行:</span>
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
              {workflow.nodes.find((n) => n.id === execution.currentNodeId)?.data.label ||
                execution.currentNodeId}
            </Badge>
          </div>
        )}
      </div>
    </>
  );
}
