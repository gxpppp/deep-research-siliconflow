/**
 * Type definitions for DeepResearch Platform
 */

// Research status enum
export type ResearchStatus = 
  | 'pending'
  | 'planning'
  | 'searching'
  | 'analyzing'
  | 'synthesizing'
  | 'completed'
  | 'error'
  | 'timeout'

// Model configuration
export interface ModelConfig {
  value: string
  label: string
  description: string
}

// User settings
export interface Settings {
  apiKey: string
  model: string
  searchDays: number
  maxResults: number
  enablePdf: boolean
  language: 'zh' | 'en'
}

// Research request
export interface ResearchRequest {
  query: string
  settings: Settings
  conversationId?: string
}

// Tool call
export interface ToolCall {
  tool?: string
  toolName?: string
  query?: string
  url?: string
  parameters?: Record<string, unknown>
  timestamp?: string
  progress?: number
}

// Tool result
export interface ToolResult {
  tool?: string
  toolName?: string
  success: boolean
  data?: unknown
  error?: string
  durationMs?: number
  result_count?: number
  timestamp?: string
}

// Citation
export interface Citation {
  index: number
  title: string
  source: string
  date?: string
  url: string
}

// Research report structure
export interface ResearchReport {
  summary: string
  researchPath: string[]
  keyFindings: string[]
  multiDimensionalAnalysis: Record<string, unknown>
  openQuestions: string[]
  references: string[]
  rawContent: string
}

// Research response
export interface ResearchResponse {
  researchId: string
  status: ResearchStatus
  query: string
  currentStage?: string
  progressPercent: number
  report?: ResearchReport
  sources?: Citation[]
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  durationMs?: number
  errorMessage?: string
}

// SSE Event types
export type SSEEventType = 
  | 'status'
  | 'tool_call'
  | 'tool_result'
  | 'thinking'
  | 'search_query'
  | 'source_found'
  | 'complete'
  | 'error'

export interface SSEEvent {
  type: SSEEventType
  data: unknown
}

// Console log types
export type ConsoleLogLevel = 
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'tool_call'
  | 'tool_result'
  | 'thinking'
  | 'search'
  | 'source'

export interface ConsoleLog {
  id: string
  timestamp: Date
  level: ConsoleLogLevel
  message: string
  details?: unknown
  metadata?: Record<string, unknown>
}

// Message in chat
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  researchId?: string
  sources?: Citation[]
}

// Conversation
export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}
