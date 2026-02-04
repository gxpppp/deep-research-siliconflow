/**
 * ErrorDetailModal Component
 * Display detailed error information for failed nodes
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, RefreshCw, Settings, XCircle, Clock } from 'lucide-react';

interface ErrorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeName: string;
  error?: {
    message: string;
    stack?: string;
    type?: string;
    timestamp?: string;
    suggestions?: string[];
  };
  onRetry?: () => void;
  onConfigure?: () => void;
}

export function ErrorDetailModal({
  isOpen,
  onClose,
  nodeId,
  nodeName,
  error,
  onRetry,
  onConfigure,
}: ErrorDetailModalProps) {
  // Parse error type for display
  const getErrorTypeLabel = (type?: string) => {
    const types: Record<string, string> = {
      'timeout': '执行超时',
      'connection': '连接错误',
      'validation': '验证错误',
      'runtime': '运行时错误',
      'api': 'API 错误',
      'network': '网络错误',
      'parse': '解析错误',
    };
    return types[type || ''] || '执行错误';
  };

  // Get error color based on type
  const getErrorColor = (type?: string) => {
    const colors: Record<string, string> = {
      'timeout': 'text-yellow-400 bg-yellow-500/20',
      'connection': 'text-orange-400 bg-orange-500/20',
      'validation': 'text-blue-400 bg-blue-500/20',
      'runtime': 'text-red-400 bg-red-500/20',
      'api': 'text-purple-400 bg-purple-500/20',
    };
    return colors[type || ''] || 'text-red-400 bg-red-500/20';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-lg text-red-400">
                节点执行失败
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                {nodeName} (ID: {nodeId.slice(0, 8)}...)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Error Type Badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={`${getErrorColor(error?.type)} border-0`}
            >
              <AlertCircle className="w-3 h-3 mr-1" />
              {getErrorTypeLabel(error?.type)}
            </Badge>
            {error?.timestamp && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(error.timestamp).toLocaleString()}
              </span>
            )}
          </div>

          {/* Error Message */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-400 mb-2">错误信息</h4>
            <p className="text-sm text-slate-300">
              {error?.message || '未知错误'}
            </p>
          </div>

          {/* Suggestions */}
          {error?.suggestions && error.suggestions.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-400 mb-2">建议解决方案</h4>
              <ul className="space-y-1">
                {error.suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    className="text-sm text-slate-300 flex items-start gap-2"
                  >
                    <span className="text-blue-400 mt-1">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Stack Trace */}
          {error?.stack && (
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">错误堆栈</h4>
              <ScrollArea className="h-[200px] bg-slate-950 rounded-lg border border-slate-800">
                <pre className="p-3 text-xs text-slate-500 font-mono whitespace-pre-wrap">
                  {error.stack}
                </pre>
              </ScrollArea>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-700 text-slate-400 hover:text-slate-200"
            >
              关闭
            </Button>
            {onConfigure && (
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onConfigure();
                }}
                className="flex-1 border-slate-700 text-slate-400 hover:text-slate-200"
              >
                <Settings className="w-4 h-4 mr-2" />
                修改配置
              </Button>
            )}
            {onRetry && (
              <Button
                onClick={() => {
                  onClose();
                  onRetry();
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重试执行
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
