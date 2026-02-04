/**
 * StatusIndicator Component
 * Visual indicator for node execution status with animations
 */

import { memo } from 'react';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  SkipForward,
  Loader2
} from 'lucide-react';
import { NodeExecutionStatus } from '@/types/workflow';

interface StatusIndicatorProps {
  status: NodeExecutionStatus;
  progress?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  executionTime?: number;
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500',
    label: '待执行',
    animate: false,
  },
  running: {
    icon: Loader2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500',
    label: '运行中',
    animate: true,
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500',
    label: '已完成',
    animate: false,
  },
  failed: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500',
    label: '失败',
    animate: false,
  },
  skipped: {
    icon: SkipForward,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500',
    label: '已跳过',
    animate: false,
  },
  paused: {
    icon: Play,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500',
    label: '已暂停',
    animate: false,
  },
};

const SIZE_CONFIG = {
  sm: {
    container: 'w-5 h-5',
    icon: 'w-3 h-3',
    progress: 'w-5 h-5',
    text: 'text-[10px]',
  },
  md: {
    container: 'w-6 h-6',
    icon: 'w-4 h-4',
    progress: 'w-6 h-6',
    text: 'text-xs',
  },
  lg: {
    container: 'w-8 h-8',
    icon: 'w-5 h-5',
    progress: 'w-8 h-8',
    text: 'text-sm',
  },
};

export const StatusIndicator = memo(({
  status,
  progress = 0,
  size = 'md',
  showLabel = false,
  executionTime,
}: StatusIndicatorProps) => {
  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  // Format execution time
  const formatTime = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Status Icon Container */}
      <div className={`relative ${sizeConfig.container}`}>
        {/* Background ring for running state */}
        {status === 'running' && (
          <>
            {/* Outer pulse ring */}
            <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-ping" />
            {/* Inner spinning ring */}
            <div className="absolute inset-0 rounded-full border-2 border-t-blue-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          </>
        )}
        
        {/* Status icon */}
        <div 
          className={`
            ${sizeConfig.container} 
            rounded-full 
            flex items-center justify-center
            ${config.bgColor}
            ${config.animate ? 'animate-pulse' : ''}
          `}
        >
          <Icon 
            className={`
              ${sizeConfig.icon} 
              ${config.color}
              ${status === 'running' ? 'animate-spin' : ''}
            `} 
          />
        </div>

        {/* Progress ring for running state */}
        {status === 'running' && progress > 0 && (
          <svg 
            className={`absolute inset-0 ${sizeConfig.progress} -rotate-90`}
            viewBox="0 0 36 36"
          >
            <path
              className="text-slate-700"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              className="text-blue-400"
              strokeDasharray={`${progress}, 100`}
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        )}
      </div>

      {/* Label and execution time */}
      {showLabel && (
        <div className="flex flex-col">
          <span className={`${sizeConfig.text} ${config.color} font-medium`}>
            {config.label}
          </span>
          {executionTime && (
            <span className="text-[10px] text-slate-500">
              {formatTime(executionTime)}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

StatusIndicator.displayName = 'StatusIndicator';

// Error badge component for failed nodes
interface ErrorBadgeProps {
  errorCount?: number;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export const ErrorBadge = memo(({
  errorCount = 1,
  onClick,
  size = 'md',
}: ErrorBadgeProps) => {
  const sizeConfig = {
    sm: 'w-4 h-4 text-[8px]',
    md: 'w-5 h-5 text-[10px]',
  };

  return (
    <button
      onClick={onClick}
      className={`
        ${sizeConfig[size]}
        bg-red-500 
        text-white 
        rounded-full 
        flex items-center justify-center
        animate-bounce
        hover:bg-red-600
        transition-colors
        cursor-pointer
        shadow-lg
        shadow-red-500/50
      `}
      title="点击查看错误详情"
    >
      {errorCount > 99 ? '99+' : errorCount}
    </button>
  );
});

ErrorBadge.displayName = 'ErrorBadge';

// Execution progress bar component
interface ExecutionProgressProps {
  progress: number;
  status: NodeExecutionStatus;
  className?: string;
}

export const ExecutionProgress = memo(({
  progress,
  status,
  className = '',
}: ExecutionProgressProps) => {
  const getColor = () => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className={`w-full h-1 bg-slate-700 rounded-full overflow-hidden ${className}`}>
      <div 
        className={`h-full ${getColor()} transition-all duration-300`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
});

ExecutionProgress.displayName = 'ExecutionProgress';
