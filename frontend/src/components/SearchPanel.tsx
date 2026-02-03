import { useResearchStore } from '@/stores/researchStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Accordion,
} from '@/components/ui/accordion'
import {
  Search,
  Clock,
  CheckCircle2,
  Loader2,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react'
import { useState } from 'react'
import type { SearchRound, SearchResultItem } from '@/types'

export function SearchPanel() {
  const { processData, isResearching, status, toggleSearchRoundExpand } = useResearchStore()
  const { searchRounds } = processData
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // If no search data yet
  if (searchRounds.length === 0 && !isResearching) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Search className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          搜索阶段
        </h3>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          开始研究后，AI 将在此展示搜索过程和结果
        </p>
      </div>
    )
  }

  // If searching is in progress but no results yet
  if (searchRounds.length === 0 && isResearching && status === 'searching') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <h3 className="text-sm font-medium mb-2">正在执行搜索...</h3>
        <p className="text-xs text-muted-foreground">
          AI 正在使用 DuckDuckGo 搜索相关信息
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold">搜索过程</h3>
          <Badge variant="secondary" className="text-[10px]">
            {searchRounds.length} 轮
          </Badge>
        </div>
        {isResearching && status === 'searching' && (
          <Badge variant="outline" className="text-[10px] gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            搜索中
          </Badge>
        )}
      </div>

      {/* Search Rounds Accordion */}
      <Accordion type="multiple" className="space-y-2">
        {searchRounds.map((round, index) => (
          <SearchRoundItem
            key={round.id}
            round={round}
            index={index}
            isLatest={index === searchRounds.length - 1}
            isSearching={isResearching && status === 'searching' && index === searchRounds.length - 1}
            formatTime={formatTime}
            formatDuration={formatDuration}
            copiedId={copiedId}
            onCopy={copyToClipboard}
            onToggleExpand={() => toggleSearchRoundExpand(round.id)}
          />
        ))}
      </Accordion>

      {/* Empty State during search */}
      {isResearching && status === 'searching' && searchRounds.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-3" />
          <p className="text-xs text-muted-foreground">
            正在搜索相关信息...
          </p>
        </div>
      )}
    </div>
  )
}

// Individual Search Round Component
interface SearchRoundItemProps {
  round: SearchRound
  index: number
  isLatest: boolean
  isSearching: boolean
  formatTime: (date: Date) => string
  formatDuration: (ms: number) => string
  copiedId: string | null
  onCopy: (text: string, id: string) => void
  onToggleExpand: () => void
}

function SearchRoundItem({
  round,
  index,
  isLatest,
  isSearching,
  formatTime,
  formatDuration,
  copiedId,
  onCopy,
  onToggleExpand
}: SearchRoundItemProps) {
  const [isExpanded, setIsExpanded] = useState(round.isExpanded)

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
    onToggleExpand()
  }

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      isLatest && isSearching && "border-blue-500 ring-1 ring-blue-500/20"
    )}>
      <CardHeader className="py-3 px-4 cursor-pointer" onClick={handleToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={cn(
              "flex-shrink-0 w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-medium",
              isLatest && isSearching
                ? "bg-blue-500 text-white animate-pulse"
                : "bg-muted text-muted-foreground"
            )}>
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xs font-medium truncate">
                {round.query}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {formatTime(round.timestamp)}
                </span>
                {round.durationMs > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    耗时 {formatDuration(round.durationMs)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {round.resultCount} 结果
            </Badge>
            {isLatest && isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="py-0 pb-4 px-4">
          <div className="border-t pt-3 space-y-2">
            {round.results.length > 0 ? (
              round.results.map((result, resultIndex) => (
                <SearchResultItem
                  key={resultIndex}
                  result={result}
                  resultIndex={resultIndex}
                  copiedId={copiedId}
                  onCopy={onCopy}
                />
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">
                  {isSearching ? '正在获取搜索结果...' : '暂无搜索结果'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Individual Search Result Component
interface SearchResultItemProps {
  result: SearchResultItem
  resultIndex: number
  copiedId: string | null
  onCopy: (text: string, id: string) => void
}

function SearchResultItem({
  result,
  resultIndex,
  copiedId,
  onCopy
}: SearchResultItemProps) {
  const copyId = `result-${resultIndex}`
  const isCopied = copiedId === copyId

  return (
    <div className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 w-4 h-4 rounded bg-primary/10 text-primary text-[10px] flex items-center justify-center">
          {resultIndex + 1}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-medium line-clamp-1 mb-1">
            {result.title}
          </h4>
          <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">
            {result.snippet}
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              <Globe className="w-3 h-3 mr-1" />
              {result.source}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px]"
              onClick={() => onCopy(`${result.title}\n${result.url}`, copyId)}
            >
              {isCopied ? (
                <Check className="w-3 h-3 mr-1 text-green-500" />
              ) : (
                <Copy className="w-3 h-3 mr-1" />
              )}
              {isCopied ? '已复制' : '复制'}
            </Button>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-blue-500 hover:underline flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              访问
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
