import { useResearchStore } from '@/stores/researchStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  BrainCircuit,
  Clock,
  CheckCircle2,
  Loader2,
  Lightbulb,
  Scale,
  Target,
  Puzzle,
  ChevronRight
} from 'lucide-react'
import type { AnalysisStep } from '@/types'

export function AnalysisPanel() {
  const { processData, isResearching, status } = useResearchStore()
  const analysis = processData.analysis

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Get icon for analysis step type
  const getStepIcon = (type: AnalysisStep['type']) => {
    switch (type) {
      case 'insight':
        return <Lightbulb className="w-4 h-4 text-yellow-500" />
      case 'comparison':
        return <Scale className="w-4 h-4 text-blue-500" />
      case 'evaluation':
        return <Target className="w-4 h-4 text-red-500" />
      case 'synthesis':
        return <Puzzle className="w-4 h-4 text-green-500" />
      default:
        return <BrainCircuit className="w-4 h-4 text-purple-500" />
    }
  }

  // Get label for analysis step type
  const getStepLabel = (type: AnalysisStep['type']) => {
    switch (type) {
      case 'insight':
        return '洞察'
      case 'comparison':
        return '对比'
      case 'evaluation':
        return '评估'
      case 'synthesis':
        return '综合'
      default:
        return '分析'
    }
  }

  // If no analysis data yet
  if (!analysis && !isResearching) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <BrainCircuit className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          分析阶段
        </h3>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          开始研究后，AI 将在此展示分析过程和关键发现
        </p>
      </div>
    )
  }

  // If analysis is in progress but no steps yet
  if (!analysis && isResearching && (status === 'analyzing' || status === 'synthesizing')) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <h3 className="text-sm font-medium mb-2">正在进行深度分析...</h3>
        <p className="text-xs text-muted-foreground">
          AI 正在综合分析所有收集到的信息
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Analysis Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-semibold">分析过程</h3>
          {analysis?.steps.length ? (
            <Badge variant="secondary" className="text-[10px]">
              {analysis.steps.length} 步骤
            </Badge>
          ) : null}
        </div>
        {analysis?.isComplete && (
          <Badge variant="outline" className="text-[10px] gap-1">
            <CheckCircle2 className="w-3 h-3" />
            已完成
          </Badge>
        )}
      </div>

      {/* Analysis Steps Timeline */}
      {analysis?.steps && analysis.steps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">分析步骤</h3>
            {analysis.timestamp && (
              <span className="text-[10px] text-muted-foreground">
                开始于 {formatTime(analysis.timestamp)}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {analysis.steps.map((step, index) => (
              <AnalysisStepCard
                key={step.id}
                step={step}
                index={index}
                isLatest={index === analysis.steps.length - 1}
                isAnalyzing={isResearching && (status === 'analyzing' || status === 'synthesizing')}
                formatTime={formatTime}
                getStepIcon={getStepIcon}
                getStepLabel={getStepLabel}
              />
            ))}
          </div>
        </div>
      )}

      {/* Key Findings */}
      {analysis?.keyFindings && analysis.keyFindings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            <h3 className="text-sm font-semibold">关键发现</h3>
            <Badge variant="secondary" className="text-[10px]">
              {analysis.keyFindings.length} 条
            </Badge>
          </div>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="py-3 px-4">
              <ul className="space-y-2">
                {analysis.keyFindings.map((finding, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-500/10 text-yellow-600 text-[10px] flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {finding}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State during analysis */}
      {isResearching && (status === 'analyzing' || status === 'synthesizing') && !analysis?.steps.length && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-3" />
          <p className="text-xs text-muted-foreground">
            正在分析收集到的信息...
          </p>
        </div>
      )}
    </div>
  )
}

// Individual Analysis Step Card
interface AnalysisStepCardProps {
  step: AnalysisStep
  index: number
  isLatest: boolean
  isAnalyzing: boolean
  formatTime: (date: Date) => string
  getStepIcon: (type: AnalysisStep['type']) => React.ReactNode
  getStepLabel: (type: AnalysisStep['type']) => string
}

function AnalysisStepCard({
  step,
  index,
  isLatest,
  isAnalyzing,
  formatTime,
  getStepIcon,
  getStepLabel
}: AnalysisStepCardProps) {
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      isLatest && isAnalyzing && "border-purple-500 ring-1 ring-purple-500/20"
    )}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-start gap-3">
          <span className={cn(
            "flex-shrink-0 w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-medium",
            isLatest && isAnalyzing
              ? "bg-purple-500 text-white animate-pulse"
              : "bg-muted text-muted-foreground"
          )}>
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getStepIcon(step.type)}
              <CardTitle className="text-xs font-medium">
                {step.title}
              </CardTitle>
              <Badge variant="outline" className="text-[10px] h-4 px-1">
                {getStepLabel(step.type)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3 inline mr-1" />
                {formatTime(step.timestamp)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-0 pb-4 px-4">
        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {step.content}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
