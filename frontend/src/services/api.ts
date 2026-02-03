import type { Settings, ModelConfig } from '@/types'

/**
 * API service for backend communication
 * Handles SSE streaming for research requests
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

/**
 * Fetch available models from backend
 */
export async function fetchModels(): Promise<{ models: ModelConfig[]; default: string }> {
  const response = await fetch(`${API_BASE_URL}/api/models`)
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
  // Prepare request body
  const requestBody = {
    query,
    settings: {
      api_key: settings.apiKey,
      model: settings.model,
      search_days: settings.searchDays,
      max_results: settings.maxResults,
      enable_pdf: settings.enablePdf,
      language: settings.language,
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
