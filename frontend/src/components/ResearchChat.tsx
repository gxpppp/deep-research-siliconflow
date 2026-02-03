import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/stores/settingsStore'
import { useResearchStore } from '@/stores/researchStore'
import { startResearchStream } from '@/services/api'
import { generateId, cn } from '@/lib/utils'
import type { ChatMessage, ResearchResponse, ResearchStatus, ToolCall, ToolResult, SearchResultItem, SearchRound, AnalysisStep } from '@/types'

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
    // Process visualization actions
    setPlanningData,
    addSearchRound,
    updateSearchRound,
    addAnalysisStep,
    updateProcessPhase,
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
            // Update process phase
            updateProcessPhase(statusData.status)
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

            // If it's a search tool call, create a new search round
            if (toolCallData.query && toolName.toLowerCase().includes('search')) {
              const searchRound: SearchRound = {
                id: generateId(),
                roundNumber: useResearchStore.getState().processData.searchRounds.length + 1,
                query: toolCallData.query,
                results: [],
                resultCount: 0,
                durationMs: 0,
                timestamp: new Date(),
                isExpanded: true,
              }
              addSearchRound(searchRound)
            }
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

              // Update search round if it's a search result
              if (resultToolName.toLowerCase().includes('search') && Array.isArray(toolResultData.data)) {
                const searchRounds = useResearchStore.getState().processData.searchRounds
                const latestRound = searchRounds[searchRounds.length - 1]
                if (latestRound) {
                  const searchResults: SearchResultItem[] = toolResultData.data.map((item: unknown) => ({
                    title: (item as Record<string, string>).title || '',
                    url: (item as Record<string, string>).link || (item as Record<string, string>).url || '',
                    snippet: (item as Record<string, string>).snippet || (item as Record<string, string>).description || '',
                    source: (item as Record<string, string>).source || 'DuckDuckGo',
                  }))
                  updateSearchRound(latestRound.id, {
                    results: searchResults,
                    resultCount: searchResults.length,
                    durationMs: toolResultData.durationMs || 0,
                  })
                }
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
            const thinkingData = event.data as { content: string; stage?: string }
            addConsoleLog('thinking', `思考: ${thinkingData.content.substring(0, 100)}...`, thinkingData)
            
            // If it's a planning thinking, update planning data
            if (thinkingData.stage === 'planning' || useResearchStore.getState().status === 'planning') {
              // Try to extract search queries from thinking content
              const content = thinkingData.content
              if (content.includes('搜索查询') || content.includes('搜索策略')) {
                setPlanningData({
                  searchQueries: [],
                  strategy: content,
                  timestamp: new Date(),
                  isComplete: false,
                })
              }
            }
            
            // If it's an analysis thinking, add as analysis step
            if (thinkingData.stage === 'analysis' || useResearchStore.getState().status === 'analyzing') {
              const step: AnalysisStep = {
                id: generateId(),
                stepNumber: useResearchStore.getState().processData.analysis?.steps.length || 0 + 1,
                title