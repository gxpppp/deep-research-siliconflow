/**
 * Toast Store - Global notification system
 */

import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9)

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = generateId()
    const duration = toast.duration ?? 5000 // Default 5 seconds
    
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }))
    
    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
  
  clearAll: () => {
    set({ toasts: [] })
  },
}))

// Helper functions for common toast types
export const toast = {
  success: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({
      type: 'success',
      title,
      message,
      duration,
    })
  },
  
  error: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({
      type: 'error',
      title,
      message,
      duration: duration ?? 8000, // Errors stay longer
    })
  },
  
  warning: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({
      type: 'warning',
      title,
      message,
      duration,
    })
  },
  
  info: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({
      type: 'info',
      title,
      message,
      duration,
    })
  },
  
  promise: async <T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((err: Error) => string)
    }
  ): Promise<T> => {
    // Add loading toast
    const loadingToast = {
      type: 'info' as const,
      title: loading,
      duration: 0, // No auto dismiss
    }
    useToastStore.getState().addToast(loadingToast)
    const loadingId = useToastStore.getState().toasts[useToastStore.getState().toasts.length - 1].id
    
    try {
      const result = await promise
      
      // Remove loading toast
      useToastStore.getState().removeToast(loadingId)
      
      // Show success toast
      const successMessage = typeof success === 'function' ? success(result) : success
      toast.success(successMessage)
      
      return result
    } catch (err) {
      // Remove loading toast
      useToastStore.getState().removeToast(loadingId)
      
      // Show error toast
      const errorMessage = typeof error === 'function' ? error(err as Error) : error
      toast.error('操作失败', errorMessage)
      
      throw err
    }
  },
}
