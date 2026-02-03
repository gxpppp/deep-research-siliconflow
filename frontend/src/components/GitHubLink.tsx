import { useState } from 'react'
import { Github, X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface GitHubLinkProps {
  className?: string
}

const GITHUB_URL = 'https://github.com/gxpppp/deep-research-siliconflow'

export function GitHubLink({ className }: GitHubLinkProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  // 如果用户取消了链接，不显示任何内容
  if (isDismissed) {
    return null
  }

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 transition-all duration-300 ease-in-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none',
        className
      )}
    >
      {/* GitHub 链接按钮 */}
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="group flex items-center gap-2 px-3 py-2 h-auto rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 no-underline"
          title="访问 GitHub 仓库"
        >
          <Github className="h-4 w-4 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors" />
          <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
            GitHub
          </span>
          <ExternalLink className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </Button>

      {/* 取消链接按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/30"
        onClick={() => {
          setIsVisible(false)
          // 等待动画完成后设置 dismissed 状态
          setTimeout(() => setIsDismissed(true), 300)
        }}
        title="隐藏 GitHub 链接"
      >
        <X className="h-3 w-3 text-slate-400 hover:text-red-500 transition-colors" />
      </Button>
    </div>
  )
}

// 可恢复版本的 GitHub 链接组件
export function GitHubLinkWithRestore({ className }: GitHubLinkProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    // 从 localStorage 读取用户偏好
    if (typeof window !== 'undefined') {
      return localStorage.getItem('github-link-dismissed') === 'true'
    }
    return false
  })

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('github-link-dismissed', 'true')
  }

  const handleRestore = () => {
    setIsDismissed(false)
    localStorage.removeItem('github-link-dismissed')
  }

  if (isDismissed) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRestore}
        className={cn(
          'text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
          className
        )}
      >
        <Github className="h-3 w-3 mr-1" />
        显示 GitHub 链接
      </Button>
    )
  }

  return (
    <div
      className={cn(
        'relative flex items-center gap-1 group',
        className
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="flex items-center gap-2 px-3 py-2 h-auto rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
      >
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 no-underline"
          title="访问 GitHub 仓库 - gxpppp/deep-research-siliconflow"
        >
          <Github className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-300">
            GitHub
          </span>
        </a>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/30"
        onClick={handleDismiss}
        title="隐藏 GitHub 链接"
      >
        <X className="h-3 w-3 text-slate-400 hover:text-red-500" />
      </Button>
    </div>
  )
}

// 简洁版 GitHub 链接（仅图标）
export function GitHubLinkIcon({ className }: GitHubLinkProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('github-link-dismissed') === 'true'
    }
    return false
  })

  if (isDismissed) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8', className)}
        onClick={() => {
          setIsDismissed(false)
          localStorage.removeItem('github-link-dismissed')
        }}
        title="显示 GitHub 链接"
      >
        <Github className="h-4 w-4 text-slate-400" />
      </Button>
    )
  }

  return (
    <div className={cn('relative group', className)}>
      <Button
        variant="ghost"
        size="icon"
        asChild
        className="h-8 w-8"
      >
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="访问 GitHub 仓库"
        >
          <Github className="h-4 w-4" />
        </a>
      </Button>
      
      <button
        onClick={() => {
          setIsDismissed(true)
          localStorage.setItem('github-link-dismissed', 'true')
        }}
        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        title="隐藏"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
