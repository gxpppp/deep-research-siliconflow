import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settings, ModelHistoryEntry, PREDEFINED_PROVIDERS } from '@/types'

/**
 * Settings store with localStorage persistence
 * API Key is stored locally with user warning
 */

interface SettingsState extends Settings {
  // Model history
  modelHistory: ModelHistoryEntry[]
  
  // Actions
  setProvider: (provider: string) => void
  setCustomProviderUrl: (url: string) => void
  setApiKey: (apiKey: string) => void
  setModel: (model: string) => void
  setCustomModel: (model: string) => void
  setUseCustomModel: (use: boolean) => void
  addModelToHistory: (model: string, label: string) => void
  removeModelFromHistory: (model: string) => void
  
  // Search settings
  setSearchDays: (days: number) => void
  setMaxResults: (max: number) => void
  setEnablePdf: (enable: boolean) => void
  setLanguage: (lang: 'zh' | 'en') => void
  
  // Model parameters
  setContextLength: (length: number) => void
  setMaxTokens: (tokens: number) => void
  setTemperature: (temp: number) => void
  setEnableTokenTracking: (enable: boolean) => void
  
  resetSettings: () => void
  getEffectiveModel: () => string
  getApiBaseUrl: () => string
}

const defaultSettings: Settings = {
  // Provider settings
  provider: 'siliconflow',
  customProviderUrl: '',
  apiKey: '',
  model: 'deepseek-ai/DeepSeek-V2.5',
  customModel: '',
  useCustomModel: false,
  
  // Search settings
  searchDays: 30,
  maxResults: 10,
  enablePdf: true,
  language: 'zh',
  
  // Model parameters
  contextLength: 128000,
  maxTokens: 4000,
  temperature: 0.3,
  enableTokenTracking: false,
}

const MAX_HISTORY_SIZE = 10

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      modelHistory: [],

      // Provider actions
      setProvider: (provider) => set({ provider }),
      setCustomProviderUrl: (customProviderUrl) => set({ customProviderUrl }),
      setApiKey: (apiKey) => set({ apiKey }),
      
      // Model actions
      setModel: (model) => {
        set({ model, useCustomModel: false })
        // Add to history when selecting a predefined model
        const provider = get().provider
        const entry = get().modelHistory.find(h => h.model === model && h.provider === provider)
        if (entry) {
          get().addModelToHistory(model, entry.label)
        }
      },
      setCustomModel: (customModel) => set({ customModel }),
      setUseCustomModel: (useCustomModel) => set({ useCustomModel }),
      
      addModelToHistory: (model: string, label: string) => {
        const provider = get().provider
        set((state) => {
          const existingIndex = state.modelHistory.findIndex(
            h => h.model === model && h.provider === provider
          )
          
          let newHistory: ModelHistoryEntry[]
          
          if (existingIndex >= 0) {
            // Update existing entry
            newHistory = [...state.modelHistory]
            newHistory[existingIndex] = {
              ...newHistory[existingIndex],
              lastUsed: new Date(),
              useCount: newHistory[existingIndex].useCount + 1
            }
          } else {
            // Add new entry
            const newEntry: ModelHistoryEntry = {
              model,
              provider,
              label: label || model,
              lastUsed: new Date(),
              useCount: 1
            }
            newHistory = [newEntry, ...state.modelHistory].slice(0, MAX_HISTORY_SIZE)
          }
          
          // Sort by last used
          newHistory.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
          
          return { modelHistory: newHistory }
        })
      },
      
      removeModelFromHistory: (model: string) => {
        const provider = get().provider
        set((state) => ({
          modelHistory: state.modelHistory.filter(
            h => !(h.model === model && h.provider === provider)
          )
        }))
      },
      
      // Search settings actions
      setSearchDays: (searchDays) => set({ searchDays }),
      setMaxResults: (maxResults) => set({ maxResults }),
      setEnablePdf: (enablePdf) => set({ enablePdf }),
      setLanguage: (language) => set({ language }),
      
      // Model parameters actions
      setContextLength: (contextLength) => set({ contextLength }),
      setMaxTokens: (maxTokens) => set({ maxTokens }),
      setTemperature: (temperature) => set({ temperature }),
      setEnableTokenTracking: (enableTokenTracking) => set({ enableTokenTracking }),
      
      resetSettings: () => set({ ...defaultSettings, modelHistory: get().modelHistory }),
      
      // Getters
      getEffectiveModel: () => {
        const state = get()
        return state.useCustomModel && state.customModel 
          ? state.customModel 
          : state.model
      },
      
      getApiBaseUrl: () => {
        const state = get()
        if (state.provider === 'custom') {
          return state.customProviderUrl || 'http://localhost:8000'
        }
        
        const provider = PREDEFINED_PROVIDERS.find(p => p.id === state.provider)
        return provider?.baseUrl || 'https://api.siliconflow.cn/v1'
      }
    }),
    {
      name: 'deepresearch-settings-v2',
      partialize: (state) => ({
        provider: state.provider,
        customProviderUrl: state.customProviderUrl,
        apiKey: state.apiKey,
        model: state.model,
        customModel: state.customModel,
        useCustomModel: state.useCustomModel,
        modelHistory: state.modelHistory,
        searchDays: state.searchDays,
        maxResults: state.maxResults,
        enablePdf: state.enablePdf,
        language: state.language,
        contextLength: state.contextLength,
        maxTokens: state.maxTokens,
        temperature: state.temperature,
        enableTokenTracking: state.enableTokenTracking,
      }),
    }
  )
)

/**
 * Crypto utilities for API key encryption
 * TODO: Implement proper encryption using Web Crypto API
 */
export const cryptoUtils = {
  /**
   * Generate a random encryption key
   * This key should be stored in memory only (not localStorage)
   */
  async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    )
  },

  /**
   * Encrypt data using AES-GCM
   */
  async encrypt(data: string, key: CryptoKey): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(data)
    
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      key,
      encoded
    )
    
    return { ciphertext, iv }
  },

  /**
   * Decrypt data using AES-GCM
   */
  async decrypt(ciphertext: ArrayBuffer, iv: Uint8Array, key: CryptoKey): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      key,
      ciphertext
    )
    
    return new TextDecoder().decode(decrypted)
  },
}
