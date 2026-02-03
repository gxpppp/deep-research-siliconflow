import { Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ProgressBar'
import { SettingsPanel } from '@/components/SettingsPanel'
import { ResearchChat } from '@/components/ResearchChat'
import { ReportViewer } from '@/components/ReportViewer'
import { ProcessVisualizer } from '@/components/ProcessVisualizer'
import { GitHubLinkWithRestore } from '@/components/GitHubLink'
import { useResearchStore } from '@/stores/researchStore'
import { cn } from '@/lib/utils'

function App() {
  const { isResearching, progress, currentStage, statusMessage, report } = useResearchStore()

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
        <