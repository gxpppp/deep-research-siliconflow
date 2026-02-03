import { useState, useEffect } from 'react'
import { useResearchStore } from '@/stores/researchStore'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Lightbulb, 
  Search, 
  BrainCircuit, 
  Clock,
  ChevronRight,
  Zap
} from 'lucide-react'
import { PlanningPanel } from './PlanningPanel'
import { SearchPanel } from './SearchPanel'
import { AnalysisPanel } from './AnalysisPanel'
import { StreamingPanel } from './StreamingPanel'

export function ProcessVisualizer() {
  const { processData, isResearching, status } = useResearchStore()
  const [activeTab, setActiveTab] = useState('streaming')

  // Auto-switch tab based on current phase
  const getActiveTab = () => {
    // Prioritize streaming tab when there's active streaming content
    if (processData.streamingContents.some(c => c.isStreaming)) {
      return 'streaming'
    }
    if (processData.currentPhase === 'planning') return 'planning'
    if (processData.currentPhase === 'searching') return 'search'
    if (processData.currentPhase === 'analyzing' || processData.currentPhase === 'synthesizing') return 'analysis'
    return activeTab
  }

  // Auto-switch to streaming when new streaming content arrives
  useEffect(() => {
    if (processData.streamingContents.some(c => c.isStreaming)) {
      setActiveTab('streaming')
    }
  }, [processData.streamingContents])

  const currentTab = isResearching ? getActiveTab() : activeTab

  // Get counts for badges
  const searchCount = processData.searchRounds.length
  const analysisStepCount = processData.analysis?.steps.length || 0
  const streamingCount = processData.streamingContents.length
  const activeStreamingCount = processData.streamingContents.filter(c => c.isStreaming).length

  return (
    <div className="flex flex-col h-full bg-card border-l">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold">研究过程</h2>
          {isResearching && (
            <Badge variant="secondary" className="text-[10px] animate-pulse">
              进行中
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          实时查看 AI 的研究过程
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 rounded-none border-b bg-muted/50 h-10">
          <TabsTrigger value="streaming" className="text-xs gap-1.5 relative">
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">实时输出</span>
            {activeStreamingCount > 0 && (
              <Badge variant="default" className="text-[10px] h-4 px-1 animate-pulse">
                {activeStreamingCount}
              </Badge>
            )}
            {streamingCount > 0 && activeStreamingCount === 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                {streamingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="planning" className="text-xs gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">规划</span>
            {processData.planning?.searchQueries.length ? (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                {processData.planning.searchQueries.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="search" className="text-xs gap-1.5">
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">搜索</span>
            {searchCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                {searchCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs gap-1.5">
            <BrainCircuit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">分析</span>
            {analysisStepCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                {analysisStepCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents */}
        <div className="flex-1 overflow-hidden relative">
          <TabsContent value="streaming" className="h-full m-0 data-[state=inactive]:hidden" forceMount>
            <div className="absolute inset-0">
              <StreamingPanel />
            </div>
          </TabsContent>

          <TabsContent value="planning" className="h-full m-0 data-[state=inactive]:hidden" forceMount>
            <div className="absolute inset-0">
              <ScrollArea className="h-full">
                <PlanningPanel />
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="search" className="h-full m-0 data-[state=inactive]:hidden" forceMount>
            <div className="absolute inset-0">
              <ScrollArea className="h-full">
                <SearchPanel />
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="h-full m-0 data-[state=inactive]:hidden" forceMount>
            <div className="absolute inset-0">
              <ScrollArea className="h-full">
                <AnalysisPanel />
              </ScrollArea>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer with timeline */}
      {isResearching && (
        <div className="px-4 py-2 border-t bg-muted/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>当前阶段:</span>
            <span className={cn(
              "font-medium",
              status === 'planning' && "text-yellow-600",
              status === 'searching' && "text-blue-600",
              status === 'analyzing' && "text-purple-600",
              status === 'synthesizing' && "text-green-600"
            )}>
              {status === 'planning' && '规划'}
              {status === 'searching' && '搜索'}
              {status === 'analyzing' && '分析'}
              {status === 'synthesizing' && '综合'}
            </span>
            <ChevronRight className="w-3 h-3" />
            <span className="truncate max-w-[150px]">
              {useResearchStore.getState().statusMessage}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
