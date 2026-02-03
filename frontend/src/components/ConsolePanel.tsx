import { useRef, useEffect, useState, useCallback } from 'react'
import { useResearchStore } from '@/stores/researchStore'
import type { ConsoleLog, ConsoleLogLevel } from '@/types'
import { 
  Terminal, 
  Trash2, 
  Pause, 
  Play, 
  ChevronDown, 
  ChevronUp,
  Maximize2,
  Minimize2,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Log level configuration
const LOG_LEVEL_CONFIG: Record<ConsoleLogLevel, { 
  icon: string
  color: string
  bgColor: string
  label: string
}> = {
  info: {
    icon: '🔵',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    label: 'INFO',
  },
  success: {
    icon: '🟢',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    label: 'SUCCESS',
  },
  warning: {
    icon: '🟡',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    label: 'WARNING',
  },
  error: {
    icon: '🔴',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    label: 'ERROR',
  },
  tool_call: {
    icon: '🔧',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
    label: 'TOOL',
  },
  tool_result: {
    icon: '📊',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    label: 'RESULT',
  },
  thinking: {
    icon: '💭',
    color: 'text-pink-400',
    bgColor: 'bg-pink-400/10',
    label: 'THINKING',
  },
  search: {
    icon: '🔍',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    label: 'SEARCH',
  },
  source: {
    icon: '📚',
    color: 'text-teal-400',
    bgColor: 'bg-teal-400/10',
    label: 'SOURCE',
  },
}

// Format timestamp
function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// Console log item component
function ConsoleLogItem({ log, isExpanded, onToggle }: { 
  log: ConsoleLog
  isExpanded: boolean
  onToggle: () => void
}) {
  const config = LOG_LEVEL_CONFIG[log.level]
  const hasDetails = log.details !== undefined && log.details !== null

  return (
    <div 
      className={cn(
        "px-3 py-2 border-b border-border/50 hover:bg-accent/50 transition-colors",
        isExpanded && "bg-accent/30"
      )}
    >
      <div 
        className="flex items-start gap-2 cursor-pointer"
        onClick={hasDetails ? onToggle : undefined}
      >
        <span className="text-xs font-mono text-muted-foreground whitespace-nowrap mt-0.5">
          {formatTime(log.timestamp)}
        </span>
        
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px] px-1 py-0 h-4 shrink-0",
            config.color,
            config.bgColor
          )}
        >
          {config.label}
        </Badge>
        
        <span className={cn("text-sm flex-1 break-all", config.color)}>
          {log.message}
        </span>
        
        {hasDetails && (
          <span className="text-muted-foreground">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </span>
        )}
      </div>
      
      {isExpanded && hasDetails && (
        <div className="mt-2 ml-20 p-2 rounded bg-muted/50 overflow-auto">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
            {typeof log.details === 'string' 
              ? log.details 
              : JSON.stringify(log.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export function ConsolePanel() {
  const {
    consoleLogs,
    isConsoleOpen,
    isAutoScroll,
    unreadLogCount,
    isResearching,
    toggleConsole,
    clearConsoleLogs,
    toggleAutoScroll,
    markLogsAsRead,
  } = useResearchStore()

  const scrollRef = useRef<HTMLDivElement>(null)
  const [isMaximized, setIsMaximized] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<ConsoleLogLevel | 'all'>('all')

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current && isAutoScroll && isConsoleOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [consoleLogs, isAutoScroll, isConsoleOpen])

  // Mark logs as read when console is opened
  useEffect(() => {
    if (isConsoleOpen) {
      markLogsAsRead()
    }
  }, [isConsoleOpen, markLogsAsRead])

  const toggleLogExpand = useCallback((logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }, [])

  const exportLogs = useCallback(() => {
    const logText = consoleLogs.map(log => {
      const time = formatTime(log.timestamp)
      const level = LOG_LEVEL_CONFIG[log.level].label
      let text = `[${time}] [${level}] ${log.message}`
      if (log.details) {
        text += '\n' + (typeof log.details === 'string' 
          ? log.details 
          : JSON.stringify(log.details, null, 2))
      }
      return text
    }).join('\n\n')

    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `research-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [consoleLogs])

  const filteredLogs = filter === 'all' 
    ? consoleLogs 
    : consoleLogs.filter(log => log.level === filter)

  const logCounts = consoleLogs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1
    return acc
  }, {} as Record<ConsoleLogLevel, number>)

  return (
    <div 
      className={cn(
        "border-t border-border bg-card transition-all duration-300",
        isConsoleOpen ? (isMaximized ? "h-[60vh]" : "h-[300px]") : "h-[40px]"
      )}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 h-[40px] bg-muted/50 cursor-pointer hover:bg-muted"
        onClick={toggleConsole}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">实时控制台</span>
          {unreadLogCount > 0 && !isConsoleOpen && (
            <Badge variant="destructive" className="text-[10px] h-4 px-1">
              {unreadLogCount}
            </Badge>
          )}
          {isResearching && (
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isConsoleOpen && (
            <>
              {/* Filter buttons */}
              <div className="flex items-center gap-0.5 mr-2">
                <Button
                  variant={filter === 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setFilter('all')}
                >
                  全部 ({consoleLogs.length})
                </Button>
                {(['info', 'tool_call', 'tool_result', 'error'] as ConsoleLogLevel[]).map(level => (
                  logCounts[level] > 0 && (
                    <Button
                      key={level}
                      variant={filter === level ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn(
                        "h-6 text-[10px] px-2",
                        filter === level && LOG_LEVEL_CONFIG[level].color
                      )}
                      onClick={() => setFilter(level)}
                    >
                      {LOG_LEVEL_CONFIG[level].label} ({logCounts[level]})
                    </Button>
                  )
                ))}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={toggleAutoScroll}
                title={isAutoScroll ? '暂停自动滚动' : '开启自动滚动'}
              >
                {isAutoScroll ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={exportLogs}
                title="导出日志"
              >
                <Download className="w-3 h-3" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? '最小化' : '最大化'}
              >
                {isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:text-destructive"
                onClick={clearConsoleLogs}
                title="清空日志"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
          
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {isConsoleOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isConsoleOpen && (
        <ScrollArea className="h-[calc(100%-40px)]" ref={scrollRef}>
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Terminal className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">暂无日志</p>
              <p className="text-xs opacity-50">开始研究后将显示实时输出</p>
            </div>
          ) : (
            <div className="pb-4">
              {filteredLogs.map((log) => (
                <ConsoleLogItem
                  key={log.id}
                  log={log}
                  isExpanded={expandedLogs.has(log.id)}
                  onToggle={() => toggleLogExpand(log.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  )
}
