import { Brain, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ProgressBar'
import { SettingsPanel } from '@/components/SettingsPanel'
import { ResearchChat } from '@/components/ResearchChat'
import { ReportViewer } from '@/components/ReportViewer'
import { useResearchStore } from '@/stores/researchStore'

function App() {
  const { isResearching, progress, currentStage, statusMessage } = useResearchStore()

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
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://github.com/yourusername/deepresearch-platform"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </Button>
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

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat */}
        <div className="w-1/2 border-r flex flex-col">
          <ResearchChat />
        </div>

        {/* Right Panel - Report */}
        <div className="w-1/2 flex flex-col">
          <ReportViewer />
        </div>
      </main>

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
