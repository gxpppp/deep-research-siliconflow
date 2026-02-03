import { useRef, useEffect } from 'react'
import { useResearchStore } from '@/stores/researchStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Lightbulb, 
  Search, 
  BrainCircuit, 
  FileText,
  Sparkles
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function StreamingPanel() {
  const { processData, isResearching } = useResearchStore()
  const { streamingContents } = processData
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [streamingContents])
  
  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'planning':
        return <Lightbulb className="w-4 h-4" />
      case 'search_analysis':
        return <Search className="w-4 h-4" />
      case 'deep_analysis':
        return <BrainCircuit className="w-4 h-4" />
      case 'synthesis':
        return <FileText className="w-4 h-4" />
      default:
        return <Sparkles className="w-4 h-4" />
    }
  }
  
  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'planning':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
      case 'search_analysis':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'deep_analysis':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
      case 'synthesis':
        return 'bg-green-500/10 text-green-600 border-green-500/20'
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    }
  }
  
  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'planning':
        return '规划'
      case 'search_analysis':
        return '搜索分析'
      case 'deep_analysis':
        return '深度分析'
      case 'synthesis':
        return '综合总结'
      default:
        return stage
    }
  }
  
  if (streamingContents.length === 0 && !isResearching) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Sparkles className="w-12 h-12 mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">实时输出</h3>
        <p className="text-sm text-center">
          开始研究后，AI 的实时思考过程将在这里显示
        </p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-full">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {streamingContents.map((content) => (
            <div
              key={content.id}
              className={cn(
                "rounded-lg border bg-card overflow-hidden transition-all duration-300",
                content.isStreaming && "ring-2 ring-primary/20"
              )}
            >
              {/* Header */}
              <div className={cn(
                "px-4 py-3 border-b flex items-center gap-2",
                getStageColor(content.stage)
              )}>
                {getStageIcon(content.stage)}
                <span className="text-sm font-medium">{content.title}</span>
                <Badge 
                  variant="outline" 
                  className="ml-auto text-[10px] h-5"
                >
                  {getStageLabel(content.stage)}
                </Badge>
                {content.isStreaming && (
                  <span className="flex items-center gap-1 text-[10px]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    生成中
                  </span>
                )}
              </div>
              
              {/* Content */}
              <div className="p-4">
                {content.content ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content.content}
                    </ReactMarkdown>
                    {content.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5"></span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    正在思考...
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="px-4 py-2 bg-muted/30 border-t text-[10px] text-muted-foreground flex items-center justify-between">
                <span>
                  {content.timestamp.toLocaleTimeString()}
                </span>
                {content.error && (
                  <span className="text-red-500">错误: {content.error}</span>
                )}
              </div>
            </div>
          ))}
          
          {/* Empty state when researching but no content yet */}
          {streamingContents.length === 0 && isResearching && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="relative">
                <Sparkles className="w-8 h-8 animate-pulse" />
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
              </div>
              <p className="text-sm mt-4">AI 正在准备...</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
