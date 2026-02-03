import { cn } from '@/lib/utils'

interface ProgressBarProps {
  progress: number
  stage: string
  message: string
  isActive: boolean
}

const stages = [
  { key: 'planning', label: '规划', icon: '📋' },
  { key: 'searching', label: '搜索', icon: '🔍' },
  { key: 'analyzing', label: '分析', icon: '📊' },
  { key: 'synthesizing', label: '总结', icon: '✍️' },
  { key: 'completed', label: '完成', icon: '✅' },
]

export function ProgressBar({ progress, stage, message, isActive }: ProgressBarProps) {
  const currentStageIndex = stages.findIndex(s => 
    stage.toLowerCase().includes(s.key) || s.key === stage.toLowerCase()
  )

  return (
    <div className="w-full bg-card border-b p-4">
      {/* Progress stages */}
      <div className="flex items-center justify-between mb-3">
        {stages.map((s, index) => {
          const isCompleted = index < currentStageIndex
          const isCurrent = index === currentStageIndex && isActive
          
          return (
            <div key={s.key} className="flex items-center">
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300',
                  isCompleted && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                  isCurrent && 'bg-primary text-primary-foreground animate-pulse',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
              >
                <span>{s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    'w-8 h-0.5 mx-1 transition-colors duration-300',
                    isCompleted ? 'bg-green-500' : 'bg-muted'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'absolute top-0 left-0 h-full transition-all duration-500 ease-out',
            progress === 100 
              ? 'bg-green-500' 
              : 'bg-primary'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status message */}
      <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
        <span>{message}</span>
        <span className="font-medium">{progress}%</span>
      </div>
    </div>
  )
}
