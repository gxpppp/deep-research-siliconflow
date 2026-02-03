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

// Model provider configuration
export interface ProviderConfig {
  id: string
  name: string
  baseUrl: string
  description: string
  requiresApiKey: boolean
  apiKeyPlaceholder?: string
  apiKeyHelpUrl?: string
}

// Model configuration
export interface ModelConfig {
  value: string
  label: string
  description: string
  provider?: string
  contextLength?: number
}

// Model history entry
export interface ModelHistoryEntry {
  model: string
  provider: string
  label: string
  lastUsed: Date
  useCount: number
}

// User settings
export interface Settings {
  // Provider settings
  provider: string
  customProviderUrl: string
  apiKey: string
  model: string
  customModel: string
  useCustomModel: boolean
  
  // Search settings
  searchDays: number
  maxResults: number
  enablePdf: boolean
  language: 'zh' | 'en'
  
  // Model parameters (new)
  contextLength: number
  maxTokens: number
  temperature: number
  enableTokenTracking: boolean
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

// Process Visualization Types

// Planning phase data
export interface PlanningData {
  searchQueries: string[]
  strategy: string
  timestamp: Date
  isComplete: boolean
}

// Single search result item
export interface SearchResultItem {
  title: string
  url: string
  snippet: string
  source: string
}

// Search round data (one iteration)
export interface SearchRound {
  id: string
  roundNumber: number
  query: string
  results: SearchResultItem[]
  resultCount: number
  durationMs: number
  timestamp: Date
  isExpanded: boolean
}

// Analysis step data
export interface AnalysisStep {
  id: string
  stepNumber: number
  title: string
  content: string
  type: 'insight' | 'comparison' | 'evaluation' | 'synthesis'
  timestamp: Date
}

// Analysis phase data
export interface AnalysisData {
  steps: AnalysisStep[]
  keyFindings: string[]
  isComplete: boolean
  timestamp: Date
}

// Complete process data
export interface ProcessData {
  planning: PlanningData | null
  searchRounds: SearchRound[]
  analysis: AnalysisData | null
  currentPhase: ResearchStatus
  streamingContents: StreamingContent[]
}

// Streaming content for real-time display
export interface StreamingContent {
  id: string
  stage: 'planning' | 'search_analysis' | 'deep_analysis' | 'synthesis'
  title: string
  content: string
  isStreaming: boolean
  timestamp: Date
  error?: string
}

// SSE Event types - extended
export type SSEEventType = 
  | 'status'
  | 'tool_call'
  | 'tool_result'
  | 'thinking'
  | 'search_query'
  | 'source_found'
  | 'content_start'
  | 'content_chunk'
  | 'content_complete'
  | 'planning_complete'
  | 'analysis_complete'
  | 'complete'
  | 'error'

// Predefined model providers
export const PREDEFINED_PROVIDERS: ProviderConfig[] = [
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    description: '国内优质大模型聚合平台，支持 DeepSeek、Qwen 等',
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-xxxxxxxxxxxxxxxx',
    apiKeyHelpUrl: 'https://cloud.siliconflow.cn/'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    description: 'OpenAI 官方 API，支持 GPT-4、GPT-3.5 等',
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-xxxxxxxxxxxxxxxx',
    apiKeyHelpUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    baseUrl: 'https://{your-resource}.openai.azure.com/openai/deployments/{deployment}',
    description: '微软 Azure OpenAI 服务',
    requiresApiKey: true,
    apiKeyPlaceholder: 'your-azure-api-key',
    apiKeyHelpUrl: 'https://portal.azure.com/'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    description: 'Claude 系列模型 API',
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-ant-xxxxxxxx',
    apiKeyHelpUrl: 'https://console.anthropic.com/'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    description: 'Google Gemini 系列模型',
    requiresApiKey: true,
    apiKeyPlaceholder: 'AIzaSyxxxxxxxx',
    apiKeyHelpUrl: 'https://makersuite.google.com/app/apikey'
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    description: '其他 OpenAI 兼容的 API 服务',
    requiresApiKey: true,
    apiKeyPlaceholder: 'your-api-key'
  }
]

// Common models by provider
export const COMMON_MODELS: Record<string, ModelConfig[]> = {
  siliconflow: [
    // DeepSeek 系列
    { value: 'deepseek-ai/DeepSeek-V3.2', label: 'DeepSeek-V3.2', description: '最新V3.2版本' },
    { value: 'Pro/deepseek-ai/DeepSeek-V3.2', label: 'DeepSeek-V3.2 Pro', description: 'Pro版本V3.2' },
    { value: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3', description: 'V3正式版' },
    { value: 'Pro/deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3 Pro', description: 'Pro版本V3' },
    { value: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1', description: '推理专用' },
    { value: 'Pro/deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1 Pro', description: 'Pro版本R1' },
    { value: 'deepseek-ai/DeepSeek-V2.5', label: 'DeepSeek-V2.5', description: '性价比之选' },
    // Qwen3 系列
    { value: 'Qwen/Qwen3-235B-A22B-Instruct-2507', label: 'Qwen3-235B-Instruct', description: 'Qwen3旗舰Instruct' },
    { value: 'Qwen/Qwen3-235B-A22B-Thinking-2507', label: 'Qwen3-235B-Thinking', description: 'Qwen3旗舰Thinking' },
    { value: 'Qwen/Qwen3-32B', label: 'Qwen3-32B', description: 'Qwen3 32B' },
    { value: 'Qwen/Qwen3-14B', label: 'Qwen3-14B', description: 'Qwen3 14B' },
    { value: 'Qwen/Qwen3-8B', label: 'Qwen3-8B', description: 'Qwen3 8B' },
    { value: 'Qwen/Qwen3-30B-A3B', label: 'Qwen3-30B-A3B', description: 'Qwen3 MoE' },
    // Qwen2.5 系列
    { value: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen2.5-72B', description: 'Qwen2.5旗舰' },
    { value: 'Qwen/Qwen2.5-72B-Instruct-128K', label: 'Qwen2.5-72B-128K', description: '128K上下文' },
    { value: 'Qwen/Qwen2.5-32B-Instruct', label: 'Qwen2.5-32B', description: 'Qwen2.5 32B' },
    { value: 'Qwen/Qwen2.5-14B-Instruct', label: 'Qwen2.5-14B', description: 'Qwen2.5 14B' },
    { value: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen2.5-7B', description: 'Qwen2.5 7B' },
    { value: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen2.5-Coder-32B', description: '代码专用' },
    // GLM 系列
    { value: 'zai-org/GLM-4.6', label: 'GLM-4.6', description: '智谱GLM4.6' },
    { value: 'zai-org/GLM-4.5-Air', label: 'GLM-4.5-Air', description: 'GLM4.5 Air' },
    { value: 'THUDM/GLM-4-32B-0414', label: 'GLM-4-32B', description: 'GLM4 32B' },
    { value: 'THUDM/GLM-4-9B-0414', label: 'GLM-4-9B', description: 'GLM4 9B' },
    { value: 'THUDM/GLM-Z1-32B-0414', label: 'GLM-Z1-32B', description: 'GLM-Z1推理' },
    // Kimi 系列
    { value: 'Pro/moonshotai/Kimi-K2.5', label: 'Kimi-K2.5 Pro', description: 'Kimi K2.5 Pro' },
    { value: 'moonshotai/Kimi-K2-Thinking', label: 'Kimi-K2-Thinking', description: 'Kimi K2推理' },
    { value: 'Pro/moonshotai/Kimi-K2-Thinking', label: 'Kimi-K2-Thinking Pro', description: 'Kimi K2推理Pro' },
    { value: 'moonshotai/Kimi-K2-Instruct-0905', label: 'Kimi-K2-Instruct', description: 'Kimi K2指令' },
    // 其他
    { value: 'Qwen/QwQ-32B', label: 'QwQ-32B', description: 'QwQ推理模型' },
    { value: 'MiniMaxAI/MiniMax-M2', label: 'MiniMax-M2', description: 'MiniMax M2' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o', description: '最新多模态旗舰' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: '轻量快速' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: '高性能' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: '经济实惠' },
  ],
  azure: [
    { value: 'gpt-4', label: 'GPT-4', description: 'Azure GPT-4' },
    { value: 'gpt-4o', label: 'GPT-4o', description: 'Azure GPT-4o' },
    { value: 'gpt-35-turbo', label: 'GPT-3.5 Turbo', description: 'Azure GPT-3.5' },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: '智能与速度平衡' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', description: '最强推理' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', description: '快速响应' },
  ],
  gemini: [
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: '多模态旗舰' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: '轻量快速' },
    { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro', description: '稳定可靠' },
  ],
  custom: []
}
