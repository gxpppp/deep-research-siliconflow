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
    { value: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3', description: '最新旗舰，671B参数' },
    { value: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1', description: '推理专用' },
    { value: 'deepseek-ai/DeepSeek-V2.5', label: 'DeepSeek-V2.5', description: '性价比之选' },
    { value: 'Qwen/Qwen3-235B-A22B', label: 'Qwen3-235B', description: 'Qwen3旗舰' },
    { value: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen2.5-72B', description: '全能旗舰' },
    { value: 'meta-llama/Meta-Llama-3.1-70B-Instruct', label: 'Llama-3.1-70B', description: '英文旗舰' },
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
