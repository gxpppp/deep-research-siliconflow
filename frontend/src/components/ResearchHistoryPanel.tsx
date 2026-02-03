import { useState, useMemo } from 'react'
import {
  History,
  Search,
  Trash2,
  Download,
  Star,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Tag,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useResearchHistoryStore,
  downloadAsFile,
  formatRelativeTime,
} from '@/stores/researchHistoryStore'
import type { ResearchHistoryEntry } from '@/types'

interface ResearchHistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelectEntry?: (entry: ResearchHistoryEntry) => void
}

export function ResearchHistoryPanel({
  isOpen,
  onClose,
  onSelectEntry,
}: ResearchHistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'favorites' | 'completed' | 'error'>('all')
  const [selectedEntry, setSelectedEntry] = useState<ResearchHistoryEntry | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')
  const [tagInputVisible, setTagInputVisible] = useState<string | null>(null)

  const {
    entries,
    deleteEntry,
    deleteAllEntries,
    toggleFavorite,
    addTag,
    removeTag,
    exportEntryAsMarkdown,
    exportEntryAsJSON,
    exportAllAsJSON,
  } = useResearchHistoryStore()

  // Filter entries
  const filteredEntries = useMemo(() => {
    let result = entries

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (entry) =>
          entry.query.toLowerCase().includes(query) ||
          entry.summary?.toLowerCase().includes(query) ||
          entry.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Apply category filter
    switch (filter) {
      case 'favorites':
        result = result.filter((entry) => entry.isFavorite)
        break
      case 'completed':
        result = result.filter((entry) => entry.status === 'completed')
        break
      case 'error':
        result = result.filter((entry) => entry.status === 'error')
        break
    }

    return result
  }, [entries, searchQuery, filter])

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    entries.forEach((entry) => {
      entry.tags?.forEach((tag) => tags.add(tag))
    })
    return Array.from(tags)
  }, [entries])

  const handleExportMarkdown = (entry: ResearchHistoryEntry) => {
    const content = exportEntryAsMarkdown(entry.id)
    const filename = `research-${entry.query.slice(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}-${new Date().toISOString().slice(0, 10)}.md`
    downloadAsFile(content, filename, 'text/markdown')
  }

  const handleExportJSON = (entry: ResearchHistoryEntry) => {
    const content = exportEntryAsJSON(entry.id)
    const filename = `research-${entry.query.slice(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`
    downloadAsFile(content, filename, 'application/json')
  }

  const handleExportAll = () => {
    const content = exportAllAsJSON()
    const filename = `research-history-${new Date().toISOString().slice(0, 10)}.json`
    downloadAsFile(content, filename, 'application/json')
  }

  const handleDeleteAll = () => {
    deleteAllEntries()
    setShowDeleteConfirm(null)
  }

  const handleAddTag = (entryId: string) => {
    if (newTag.trim()) {
      addTag(entryId, newTag.trim())
      setNewTag('')
      setTagInputVisible(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成'
      case 'error':
        return '出错'
      case 'pending':
        return '等待中'
      case 'planning':
        return '规划中'
      case 'searching':
        return '搜索中'
      case 'analyzing':
        return '分析中'
      case 'synthesizing':
        return '综合中'
      default:
        return status
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">研究历史</h2>
            <Badge variant="secondary" className="text-xs">
              {entries.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {entries.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportAll}
                  className="h-8"
                >
                  <Download className="h-4 w-4 mr-1" />
                  导出
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm('all')}
                  className="h-8 text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  清空
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索历史记录..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {(['all', 'favorites', 'completed', 'error'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
              className="flex-1 text-xs"
            >
              {f === 'all' && '全部'}
              {f === 'favorites' && '收藏'}
              {f === 'completed' && '已完成'}
              {f === 'error' && '出错'}
            </Button>
          ))}
        </div>

        {/* Tags filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {allTags.slice(0, 5).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer text-xs"
                onClick={() => setSearchQuery(tag)}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Entries list */}
      <ScrollArea className="flex-1">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <History className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">
              {searchQuery ? '没有找到匹配的历史记录' : '暂无研究历史'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="group bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedEntry(entry)
                  setShowDetailDialog(true)
                }}
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-sm text-gray-900 line-clamp-2 flex-1">
                    {entry.query}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(entry.id)
                    }}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        entry.isFavorite
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-400'
                      }`}
                    />
                  </Button>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  {getStatusIcon(entry.status)}
                  <span>{getStatusText(entry.status)}</span>
                  <span>•</span>
                  <span>{formatRelativeTime(entry.createdAt)}</span>
                  {entry.durationMs && (
                    <>
                      <span>•</span>
                      <span>{(entry.durationMs / 1000).toFixed(0)}秒</span>
                    </>
                  )}
                </div>

                {/* Summary preview */}
                {entry.summary && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {entry.summary.slice(0, 100)}...
                  </p>
                )}

                {/* Tags */}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs px-1.5 py-0"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleExportMarkdown(entry)
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Markdown
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleExportJSON(entry)
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    JSON
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-600 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDeleteConfirm(entry.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedEntry && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">{selectedEntry.query}</DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusIcon(selectedEntry.status)}
                    <span>{getStatusText(selectedEntry.status)}</span>
                    <span>•</span>
                    <span>{formatRelativeTime(selectedEntry.createdAt)}</span>
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Tags section */}
                <div>
                  <h4 className="text-sm font-medium mb-2">标签</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeTag(selectedEntry.id, tag)}
                        />
                      </Badge>
                    ))}
                    {tagInputVisible === selectedEntry.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="新标签"
                          className="h-7 w-24 text-xs"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddTag(selectedEntry.id)
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handleAddTag(selectedEntry.id)}
                        >
                          添加
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setTagInputVisible(selectedEntry.id)}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        添加标签
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 my-4" />

                {/* Summary */}
                {selectedEntry.summary && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">摘要</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {selectedEntry.summary}
                    </p>
                  </div>
                )}

                {/* Sources */}
                {selectedEntry.sources && selectedEntry.sources.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      参考来源 ({selectedEntry.sources.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedEntry.sources.slice(0, 5).map((source, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="text-gray-400">{idx + 1}.</span>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {source.title}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                      {selectedEntry.sources.length > 5 && (
                        <p className="text-xs text-gray-500">
                          还有 {selectedEntry.sources.length - 5} 个来源...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Full report preview */}
                {selectedEntry.fullReport && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">完整报告</h4>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {selectedEntry.fullReport.slice(0, 1000)}...
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExportMarkdown(selectedEntry)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  导出 Markdown
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExportJSON(selectedEntry)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  导出 JSON
                </Button>
                {onSelectEntry && (
                  <Button
                    onClick={() => {
                      onSelectEntry(selectedEntry)
                      setShowDetailDialog(false)
                    }}
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    查看详情
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!showDeleteConfirm}
        onOpenChange={() => setShowDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              {showDeleteConfirm === 'all'
                ? '确定要清空所有研究历史吗？此操作不可撤销。'
                : '确定要删除这条研究记录吗？此操作不可撤销。'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(null)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                showDeleteConfirm === 'all'
                  ? handleDeleteAll()
                  : (deleteEntry(showDeleteConfirm!), setShowDeleteConfirm(null))
              }
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
