import { useState, Suspense, lazy } from 'react'
import { Brain, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ProgressBar'
import { SettingsPanel } from '@/components/SettingsPanel'
import { ResearchChat } from '@/components/ResearchChat'
import { ReportViewer } from '@/components/ReportViewer'
import { ProcessVisualizer } from '@/components/ProcessVisualizer'
import { ResearchHistoryPanel } from '@/components/ResearchHistoryPanel'
import { GitHubLinkWithRestore } from '@/components/GitHubLink'
import { ModeSwitcher } from '@/components/ModeSwitcher'
import { ToastContainer } from '@/components/Toast'
import { useResearchStore } from '@/stores/researchStore'
import { cn } from '@/lib/utils'

// Lazy load Workflow Editor for code splitting
const WorkflowEditorApp = lazy(() => import('@/components/workflow-editor/WorkflowEditorApp'))

// Loading fallback component
function WorkflowEditorLoading() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-950">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400">加载工作流编辑器...</p>
      </div>
    </div>
  )
}

function App() {
  const { isResearching, progress, currentStage, statusMessage, report } = useResearchStore()
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic')

  // Advanced Mode - Workflow Editor (Lazy Loaded)
  if (mode === 'advanced') {
    return (
      <Suspense fallback={<WorkflowEditorLoading />}>
        <div className="h-screen w-full">
          <WorkflowEditorApp />
        </div>
      </Suspense>
    )
  }

  // Basic Mode - Original Interface
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">DeepResearch Platform</h1>
            <p className="text-xs text-muted-foreground">AI 驱动的深度研究助手</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <ModeSwitcher currentMode={mode} onModeChange={setMode} />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            历史记录
          </Button>
          <GitHubLinkWithRestore />
          <SettingsPanel />
        </div>
      </header>

      {/* Progress Bar - Only show when researching */}
      {isResearching && (
        <ProgressBar
          progress={progress}
          stage={currentStage}
          message={statusMessage}
          isActive={isResearching}
        />
      )}

      {/* Main Content - Three Column Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat */}
        <div className={cn(
          "border-r flex flex-col transition-all duration-300",
          report ? "w-[30%]" : "w-1/2"
        )}>
          <ResearchChat />
        </div>

        {/* Middle Panel - Process Visualizer */}
        <div className={cn(
          "border-r flex flex-col transition-all duration-300",
          report ? "w-[35%]" : "w-1/2"
        )}>
          <ProcessVisualizer />
        </div>

        {/* Right Panel - Report */}
        <div className={cn(
          "flex flex-col transition-all duration-300",
          report ? "w-[35%]" : "w-0 overflow-hidden"
        )}>
          <ReportViewer />
        </div>
      </main>

      {/* History Panel */}
      <ResearchHistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Footer */}
      <footer className="px-6 py-3 border-t bg-card text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <p>
            Powered by{' '}
            <a
              href="https://siliconflow.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              SiliconFlow
            </a>
            {' '}· 使用 DeepSeek & Qwen 等大模型
          </p>
          <p>
            研究过程可能需要 30-120 秒，请耐心等待
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
