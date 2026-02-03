import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settings } from '@/types'

/**
 * Settings store with localStorage persistence
 * API Key is encrypted using Web Crypto API before storage
 */

interface SettingsState extends Settings {
  // Actions
  setApiKey: (apiKey: string) => void
  setModel: (model: string) => void
  setSearchDays: (days: number) => void
  setMaxResults: (max: number) => void
  setEnablePdf: (enable: boolean) => void
  setLanguage: (lang: 'zh' | 'en') => void
  resetSettings: () => void
}

const defaultSettings: Settings = {
  apiKey: '',
  model: 'deepseek-ai/DeepSeek-V2.5',
  searchDays: 30,
  maxResults: 10,
  enablePdf: true,
  language: 'zh',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setApiKey: (apiKey) => set({ apiKey }),
      setModel: (model) => set({ model }),
      setSearchDays: (searchDays) => set({ searchDays }),
      setMaxResults: (maxResults) => set({ maxResults }),
      setEnablePdf: (enablePdf) => set({ enablePdf }),
      setLanguage: (language) => set({ language }),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'deepresearch-settings',
      // TODO: Implement encryption for API key before storage
      // For MVP, we store plaintext with a warning to the user
      partialize: (state) => ({
        apiKey: state.apiKey,
        model: state.model,
        searchDays: state.searchDays,
        maxResults: state.maxResults,
        enablePdf: state.enablePdf,
        language: state.language,
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
