/**
 * Toast Component - Notification display
 */

import { useEffect, useState } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore, Toast as ToastType } from '@/stores/toastStore'

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    iconColor: 'text-green-500',
    progressColor: 'bg-green-500',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    iconColor: 'text-red-500',
    progressColor: 'bg-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    iconColor: 'text-yellow-500',
    progressColor: 'bg-yellow-500',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    iconColor: 'text-blue-500',
    progressColor: 'bg-blue-500',
  },
}

interface ToastItemProps {
  toast: ToastType
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [progress, setProgress] = useState(100)
  const [isPaused, setIsPaused] = useState(false)
  const duration = toast.duration ?? 5000
  const config = toastConfig[toast.type]
  const Icon = config.icon

  useEffect(() => {
    if (duration <= 0 || isPaused) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(interval)
          return 0
        }
        return prev - (100 / (duration / 100))
      })
    }, 100)

    return () => clearInterval(interval)
  }, [duration, isPaused])

  return (
    <div
      className={cn(
        'relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg',
        'transform transition-all duration-300 ease-out',
        'animate-in slide-in-from-right-full',
        config.bgColor,
        config.borderColor
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
    >
      {/* Icon */}
      <div className={cn('mt-0.5 shrink-0', config.iconColor)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-slate-200">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="mt-1 text-sm text-slate-400 line-clamp-2">
            {toast.message}
          </p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700/50">
          <div
            className={cn('h-full transition-all duration-100', config.progressColor)}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  )
}

// Export individual toast for standalone usage
export { ToastItem }
