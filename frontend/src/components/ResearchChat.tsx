import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/stores/settingsStore'
import { useResearchStore } from '@/stores/researchStore'
import { startResearchStream } from '@/services/api'
import { generateId, cn } from '@/lib/utils'
import { ConsolePanel } from './ConsolePanel'
import type { ChatMessage, ResearchResponse, ResearchStatus, ToolCall, ToolResult } from '@/types'

const MAX_QUERY_LENGTH = 50000

export function ResearchChat() {
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [textareaHeight, setTextareaHeight] = useState(80)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<{ close: () => void } | null>(null)

  const settings = useSettingsStore()
  const {
    isResearching,
    messages,
    startResearch,
    updateStatus,
    setReport,
    addMessage,
    reset,
    addConsoleLog,
  } = useResearchStore()

  const handleSubmit = useCallback(async () => {
    if (!query.trim() || isResearching) return

    // Validate API key
    if (!settings.apiKey) {
      setError('请先设置 API Key')
      return
    }

    setError(null)

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    }
    addMessage(userMessage)

    // Start research
    const researchId = generateId()
    startResearch(researchId)

    // Add initial console log
    addConsoleLog('info', `开始研究: "${query}"`, { query, settings: { ...settings, apiKey: '***' } })

    // Clear input
    const currentQuery = query
    setQuery('')

    // Start SSE stream
    abortRef.current = startResearchStream(
      currentQuery,
      settings,
      (event) => {
        switch (event.type) {
          case 'status':
            const statusData = event.data as {
              status: ResearchStatus
              stage: string
              progress: number
              message: string
            }
            updateStatus(
              statusData.status,
              statusData.stage,
              statusData.progress,
              statusData.message
            )
            // Add console log for status changes
            addConsoleLog('info', `[${statusData.stage}] ${statusData.message}`, {
              progress: statusData.progress,
              status: statusData.status,
            })
            break

          case 'tool_call':
            const toolCallData = event.data as ToolCall
            console.log('Tool call:', event.data)
            const toolName = toolCallData.tool || toolCallData.toolName || '未知工具'
            // Build a descriptive message based on tool type
            let toolMessage = `调用工具: ${toolName}`
            let toolDetails: Record<string, unknown> = { toolName }
            
            if (toolCallData.query) {
              toolMessage += ` - 搜索: "${toolCallData.query}"`
              toolDetails.query = toolCallData.query
            } else if (toolCallData.url) {
              toolMessage += ` - 抓取: ${toolCallData.url}`
              toolDetails.url = toolCallData.url
            }
            
            if (toolCallData.parameters) {
              toolDetails.parameters = toolCallData.parameters
            }
            if (toolCallData.timestamp) {
              toolDetails.timestamp = toolCallData.timestamp
            }
            
            addConsoleLog('tool_call', toolMessage, toolDetails)
            break

          case 'tool_result':
            const toolResultData = event.data as ToolResult
            console.log('Tool result:', event.data)
            const resultToolName = toolResultData.tool || toolResultData.toolName || '未知工具'
            
            // Build result message with details
            let resultMessage = ''
            let resultDetails: Record<string, unknown> = { 
              toolName: resultToolName,
              success: toolResultData.success 
            }
            
            if (toolResultData.success) {
              const resultCount = toolResultData.result_count || 
                (Array.isArray(toolResultData.data) ? toolResultData.data.length : undefined)
              resultMessage = `✓ 工具 ${resultToolName} 执行成功`
              if (resultCount !== undefined) {
                resultMessage += ` (${resultCount} 条结果)`
              }
              
              // Include actual results in details
              if (toolResultData.data) {
                resultDetails.results = toolResultData.data
              }
            } else {
              resultMessage = `✗ 工具 ${resultToolName} 执行失败`
              if (toolResultData.error) {
                resultMessage += `: ${toolResultData.error}`
                resultDetails.error = toolResultData.error
              }
            }
            
            if (toolResultData.durationMs) {
              resultDetails.durationMs = toolResultData.durationMs
            }
            
            addConsoleLog(
              toolResultData.success ? 'tool_result' : 'error',
              resultMessage,
              resultDetails
            )
            break

          case 'thinking':
            const thinkingData = event.data as { content: string }
            addConsoleLog('thinking', `思考: ${thinkingData.content.substring(0, 100)}...`, thinkingData)
            break

          case 'search_query':
            const searchData = event.data as { query: string; source: string }
            addConsoleLog('search', `搜索: ${searchData.query}`, searchData)
            break

          case 'source_found':
            const sourceData = event.data as { title: string; url: string; source: string }
            addConsoleLog('source', `发现来源: ${sourceData.title}`, sourceData)
            break

          case 'complete':
            const completeData = event.data as {
              research_id: string
              query: string
              report: ResearchResponse['report']
              sources: ResearchResponse['sources']
              duration_ms: number
            }

            const response: ResearchResponse = {
              researchId: completeData.research_id,
              status: 'completed',
              query: completeData.query,
              report: completeData.report,
              sources: completeData.sources || [],
              progressPercent: 100,
              durationMs: completeData.duration_ms,
            }

            setReport(response)

            // Add success console log
            addConsoleLog('success', `研究完成！耗时 ${(completeData.duration_ms / 1000).toFixed(1)} 秒`, {
              durationMs: completeData.duration_ms,
              sourcesCount: completeData.sources?.length || 0,
            })

            // Add assistant message
            const assistantMessage: ChatMessage = {
              id: generateId(),
              role: 'assistant',
              content: completeData.report?.rawContent || '研究完成',
              timestamp: new Date(),
              researchId: completeData.research_id,
              sources: completeData.sources,
            }
            addMessage(assistantMessage)
            break

          case 'error':
            const errorData = event.data as { message: string }
            setError(errorData.message)
            updateStatus('error', '错误', 0, errorData.message)
            addConsoleLog('error', `错误: ${errorData.message}`, errorData)
            break
        }
      },
      (err) => {
        console.error('Stream error:', err)
        setError(err.message)
        updateStatus('error', '错误', 0, err.message)
      }
    )
  }, [query, isResearching, settings, startResearch, updateStatus, setReport, addMessage])

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      textarea.style.height = 'auto'
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 80), 400)
      textarea.style.height = `${newHeight}px`
      setTextareaHeight(newHeight)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= MAX_QUERY_LENGTH) {
      setQuery(value)
    }
  }

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.close()
      abortRef.current = null
    }
    addConsoleLog('warning', '研究已手动停止')
    reset()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium mb-2">开始深度研究</h3>
            <p className="text-sm text-center max-w-md">
              输入您想研究的问题，AI 将自动搜索、分析多个来源，
              <br />
              并生成带溯源的结构化报告
            </p>
            
            {/* Example queries */}
            <div className="mt-6 space-y-2">
              <p className="text-xs text-muted-foreground mb-2">示例问题：</p>
              {[
                '2024年人工智能芯片市场发展趋势',
                '新能源汽车电池技术最新突破',
                '量子计算在药物研发中的应用',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setQuery(example)}
                  className="block w-full text-left px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-800 dark:text-red-200 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-card">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder="输入研究问题..."
            disabled={isResearching}
            className={cn(
              "flex w-full rounded-md border border-input bg-background px-3 py-2 pr-14 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-y-auto",
              textareaHeight >= 400 && "overflow-y-auto"
            )}
            style={{ minHeight: 80, maxHeight: 400 }}
          />
          <div className="absolute right-2 bottom-2">
            {isResearching ? (
              <Button
                size="icon"
                variant="destructive"
                onClick={handleStop}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSubmit}
                disabled={!query.trim() || !settings.apiKey}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            按 Enter 发送，Shift + Enter 换行
            {!settings.apiKey && (
              <span className="text-red-500 ml-2">请先设置 API Key</span>
            )}
          </p>
          <p className={cn(
            "text-xs",
            query.length > MAX_QUERY_LENGTH * 0.9 ? "text-red-500" : "text-muted-foreground"
          )}>
            {query.length.toLocaleString()} / {MAX_QUERY_LENGTH.toLocaleString()} 字符
          </p>
        </div>
      </div>

      {/* Console Panel */}
      <ConsolePanel />
    </div>
  )
}
