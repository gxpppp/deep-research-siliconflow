import { useState } from 'react'
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
  ChevronRight
} from 'lucide-react'
import { PlanningPanel } from './PlanningPanel'
import { SearchPanel } from './SearchPanel'
import { AnalysisPanel } from './AnalysisPanel'

export function ProcessVisualizer() {
  const { processData, isResearching, status } = useResearchStore()
  const [activeTab, setActiveTab] = useState('planning')

  // Auto-switch tab based on current phase
  const getActiveTab = () => {
    if (processData.currentPhase === 'planning') return 'planning'
    if (processData.currentPhase === 'searching') return 'search'
    if (processData.currentPhase === 'analyzing' || processData.currentPhase === 'synthesizing') return 'analysis'
    return activeTab
  }

  const currentTab = isResearching ? getActiveTab() : activeTab

  // Get counts for badges
  const searchCount = processData.searchRounds.length
  const analysisStepCount = processData.analysis?.steps.length || 0

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
        <TabsList className="grid w-full grid-cols-3 rounded-none border-b bg-muted/50 h-10">
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
        <div className="flex-1 overflow-hidden">
          <TabsContent value="planning" className="h-full m-0">
            <ScrollArea className="h-full">
              <PlanningPanel />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="search" className="h-full m-0">
            <ScrollArea className="h-full">
              <SearchPanel />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analysis" className="h-full m-0">
            <ScrollArea className="h-full">
              <AnalysisPanel />
            </ScrollArea>
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
