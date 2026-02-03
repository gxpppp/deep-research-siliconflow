import type { Settings, ModelConfig } from '@/types'

/**
 * API service for backend communication
 * Handles SSE streaming for research requests
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'

/**
 * Get API base URL based on provider settings
 */
export function getApiBaseUrl(settings: Settings): string {
  if (settings.provider === 'custom') {
    return settings.customProviderUrl || API_BASE_URL
  }
  return API_BASE_URL
}

/**
 * Fetch available models from provider API
 * Supports multiple providers: siliconflow, openai, azure, anthropic, gemini, custom
 */
export async function fetchModels(
  provider: string,
  apiKey: string,
  baseUrl?: string
): Promise<{ models: ModelConfig[]; default: string }> {
  // For custom providers, return empty list and let user input manually
  if (provider === 'custom') {
    return { models: [], default: '' }
  }

  // Use backend proxy to fetch models (to avoid CORS)
  const response = await fetch(`${API_BASE_URL}/api/models`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider,
      api_key: apiKey,
      base_url: baseUrl,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch models')
  }

  return response.json()
}

/**
 * Start a research request with SSE streaming
 * Returns an EventSource for consuming stream events
 */
export function startResearchStream(
  query: string,
  settings: Settings,
  onEvent: (event: { type: string; data: unknown }) => void,
  onError: (error: Error) => void
): { close: () => void } {
  // Prepare request body with all new parameters
  const requestBody = {
    query,
    settings: {
      // Provider settings
      provider: settings.provider,
      custom_provider_url: settings.customProviderUrl,
      api_key: settings.apiKey,
      model: settings.useCustomModel ? settings.customModel : settings.model,
      
      // Search settings
      search_days: settings.searchDays,
      max_results: settings.maxResults,
      enable_pdf: settings.enablePdf,
      language: settings.language,
      
      // Model parameters (new)
      context_length: settings.contextLength,
      max_tokens: settings.maxTokens,
      temperature: settings.temperature,
      enable_token_tracking: settings.enableTokenTracking,
    },
  }

  // Use fetch with ReadableStream for SSE
  const abortController = new AbortController()

  fetch(`${API_BASE_URL}/api/research`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(requestBody),
    signal: abortController.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        let currentEvent: { type: string; data: string } | null = null

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = { type: line.slice(7), data: '' }
          } else if (line.startsWith('data: ') && currentEvent) {
            currentEvent.data = line.slice(6)
          } else if (line === '' && currentEvent) {
            // Event complete
            try {
              const parsedData = JSON.parse(currentEvent.data)
              onEvent({ type: currentEvent.type, data: parsedData })
            } catch (e) {
              console.error('Failed to parse SSE data:', currentEvent.data)
            }
            currentEvent = null
          }
        }
      }
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError(error)
      }
    })

  return {
    close: () => abortController.abort(),
  }
}

/**
 * Check backend health status
 */
export async function checkHealth(): Promise<{ status: string; version: string }> {
  const response = await fetch(`${API_BASE_URL}/health`)
  if (!response.ok) {
    throw new Error('Health check failed')
  }
  return response.json()
}

/**
 * Validate API key for a provider
 */
export async function validateApiKey(
  provider: string,
  apiKey: string,
  baseUrl?: string
): Promise<{ valid: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/validate-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        api_key: apiKey,
        base_url: baseUrl,
      }),
    })

    if (!response.ok) {
      return { valid: false, message: '验证请求失败' }
    }

    const data = await response.json()
    return { valid: data.valid, message: data.message }
  } catch (error) {
    return { valid: false, message: '网络错误' }
  }
}
