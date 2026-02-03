import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ResearchHistoryEntry, ResearchResponse, ProcessData, Settings } from '@/types'

/**
 * Research History Store
 * Manages research task history with localStorage persistence
 */

interface ResearchHistoryState {
  // History entries
  entries: ResearchHistoryEntry[]
  
  // Actions
  addEntry: (response: ResearchResponse, processData?: ProcessData, settings?: Settings) => void
  updateEntry: (id: string, updates: Partial<ResearchHistoryEntry>) => void
  deleteEntry: (id: string) => void
  deleteAllEntries: () => void
  toggleFavorite: (id: string) => void
  addTag: (id: string, tag: string) => void
  removeTag: (id: string, tag: string) => void
  
  // Getters
  getEntryById: (id: string) => ResearchHistoryEntry | undefined
  getFavoriteEntries: () => ResearchHistoryEntry[]
  getEntriesByTag: (tag: string) => ResearchHistoryEntry[]
  searchEntries: (query: string) => ResearchHistoryEntry[]
  getRecentEntries: (limit?: number) => ResearchHistoryEntry[]
  
  // Export
  exportEntryAsMarkdown: (id: string) => string
  exportEntryAsJSON: (id: string) => string
  exportAllAsJSON: () => string
}

const MAX_HISTORY_SIZE = 50 // Maximum number of entries to keep

export const useResearchHistoryStore = create<ResearchHistoryState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (response: ResearchResponse, processData?: ProcessData, settings?: Settings) => {
        const newEntry: ResearchHistoryEntry = {
          id: response.researchId,
          query: response.query,
          status: response.status,
          summary: response.report?.summary,
          fullReport: response.report?.rawContent,
          sources: response.sources,
          settings,
          processData,
          createdAt: new Date(),
          completedAt: response.status === 'completed' ? new Date() : undefined,
          durationMs: response.durationMs,
          isFavorite: false,
          tags: [],
        }

        set((state) => {
          // Check if entry already exists
          const existingIndex = state.entries.findIndex(e => e.id === newEntry.id)
          let newEntries: ResearchHistoryEntry[]

          if (existingIndex >= 0) {
            // Update existing entry
            newEntries = [...state.entries]
            newEntries[existingIndex] = {
              ...newEntries[existingIndex],
              ...newEntry,
              // Preserve favorite status and tags
              isFavorite: newEntries[existingIndex].isFavorite,
              tags: newEntries[existingIndex].tags,
            }
          } else {
            // Add new entry at the beginning
            newEntries = [newEntry, ...state.entries]
            
            // Limit history size
            if (newEntries.length > MAX_HISTORY_SIZE) {
              newEntries = newEntries.slice(0, MAX_HISTORY_SIZE)
            }
          }

          return { entries: newEntries }
        })
      },

      updateEntry: (id: string, updates: Partial<ResearchHistoryEntry>) => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, ...updates } : entry
          ),
        }))
      },

      deleteEntry: (id: string) => {
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== id),
        }))
      },

      deleteAllEntries: () => {
        set({ entries: [] })
      },

      toggleFavorite: (id: string) => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, isFavorite: !entry.isFavorite } : entry
          ),
        }))
      },

      addTag: (id: string, tag: string) => {
        const trimmedTag = tag.trim()
        if (!trimmedTag) return

        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id && !entry.tags?.includes(trimmedTag)
              ? { ...entry, tags: [...(entry.tags || []), trimmedTag] }
              : entry
          ),
        }))
      },

      removeTag: (id: string, tag: string) => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id
              ? { ...entry, tags: entry.tags?.filter((t) => t !== tag) || [] }
              : entry
          ),
        }))
      },

      getEntryById: (id: string) => {
        return get().entries.find((entry) => entry.id === id)
      },

      getFavoriteEntries: () => {
        return get().entries.filter((entry) => entry.isFavorite)
      },

      getEntriesByTag: (tag: string) => {
        return get().entries.filter((entry) => entry.tags?.includes(tag))
      },

      searchEntries: (query: string) => {
        const lowerQuery = query.toLowerCase()
        return get().entries.filter(
          (entry) =>
            entry.query.toLowerCase().includes(lowerQuery) ||
            entry.summary?.toLowerCase().includes(lowerQuery) ||
            entry.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
        )
      },

      getRecentEntries: (limit = 10) => {
        return get().entries.slice(0, limit)
      },

      exportEntryAsMarkdown: (id: string) => {
        const entry = get().getEntryById(id)
        if (!entry) return ''

        const lines: string[] = [
          `# 研究报告: ${entry.query}`,
          '',
          `**研究ID**: ${entry.id}`,
          `**状态**: ${entry.status}`,
          `**创建时间**: ${entry.createdAt.toLocaleString()}`,
          entry.completedAt ? `**完成时间**: ${entry.completedAt.toLocaleString()}` : '',
          entry.durationMs ? `**耗时**: ${(entry.durationMs / 1000).toFixed(1)}秒` : '',
          entry.tags?.length ? `**标签**: ${entry.tags.join(', ')}` : '',
          '',
          '---',
          '',
        ]

        if (entry.fullReport) {
          lines.push(entry.fullReport)
        } else if (entry.summary) {
          lines.push('## 摘要', '', entry.summary)
        }

        if (entry.sources?.length) {
          lines.push(
            '',
            '---',
            '',
            '## 参考来源',
            '',
            ...entry.sources.map(
              (source, idx) =>
                `${idx + 1}. [${source.title}](${source.url}) - ${source.source}`
            )
          )
        }

        return lines.filter(Boolean).join('\n')
      },

      exportEntryAsJSON: (id: string) => {
        const entry = get().getEntryById(id)
        if (!entry) return '{}'
        return JSON.stringify(entry, null, 2)
      },

      exportAllAsJSON: () => {
        return JSON.stringify(get().entries, null, 2)
      },
    }),
    {
      name: 'deepresearch-history-v1',
      partialize: (state) => ({ entries: state.entries }),
    }
  )
)

/**
 * Helper function to download content as file
 */
export function downloadAsFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return new Date(date).toLocaleDateString()
}
