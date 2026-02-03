import { useResearchStore } from '@/stores/researchStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Lightbulb, 
  Search, 
  Clock,
  CheckCircle2,
  Loader2
} from 'lucide-react'

export function PlanningPanel() {
  const { processData, isResearching, status } = useResearchStore()
  const planning = processData.planning

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // If no planning data yet
  if (!planning && !isResearching) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Lightbulb className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          规划阶段
        </h3>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          开始研究后，AI 将在此展示研究计划和搜索策略
        </p>
      </div>
    )
  }

  // If planning is in progress
  if (!planning && isResearching && status === 'planning') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <h3 className="text-sm font-medium mb-2">正在制定研究计划...</h3>
        <p className="text-xs text-muted-foreground">
          AI 正在分析查询并生成搜索策略
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Planning Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-500" />
          <h3 className="text-sm font-semibold">研究计划</h3>
        </div>
        {planning?.isComplete && (
          <Badge variant="outline" className="text-[10px] gap-1">
            <CheckCircle2 className="w-3 h-3" />
            已完成
          </Badge>
        )}
      </div>

      {/* Strategy Card */}
      {planning?.strategy && (
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="py-3">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <span>研究策略</span>
              {planning.timestamp && (
                <span className="text-[10px] text-muted-foreground font-normal">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {formatTime(planning.timestamp)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {planning.strategy}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Search Queries */}
      {planning?.searchQueries && planning.searchQueries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold">搜索查询</h3>
            <Badge variant="secondary" className="text-[10px]">
              {planning.searchQueries.length} 个
            </Badge>
          </div>

          <div className="space-y-2">
            {planning.searchQueries.map((query, index) => (
              <Card 
                key={index} 
                className={cn(
                  "transition-all duration-300",
                  status === 'searching' && index === 0 && "border-blue-500 ring-1 ring-blue-500/20"
                )}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      "flex-shrink-0 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-medium",
                      status === 'searching' && index === 0 
                        ? "bg-blue-500 text-white animate-pulse"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium break-words">
                        {query}
                      </p>
                      {status === 'searching' && index === 0 && (
                        <p className="text-[10px] text-blue-600 mt-1">
                          正在搜索...
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State during research */}
      {isResearching && status === 'planning' && !planning?.searchQueries.length && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-3" />
          <p className="text-xs text-muted-foreground">
            正在生成搜索查询...
          </p>
        </div>
      )}
    </div>
  )
}
