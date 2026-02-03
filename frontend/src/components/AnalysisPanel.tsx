import { useResearchStore } from '@/stores/researchStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  BrainCircuit,
  Clock,
  CheckCircle2,
  Loader2,
  Lightbulb,
  Scale,
  Target,
  Puzzle,
  ChevronRight
} from 'lucide-react'
import type { AnalysisStep } from '@/types'

export function AnalysisPanel() {
  const { processData, isResearching, status } = useResearchStore()
  const analysis = processData.analysis

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Get icon for analysis step type
  const getStepIcon = (type: AnalysisStep['type']) => {
    switch (type) {
      case 'insight':
        return <Lightbulb className="w-4 h-4 text-yellow-500"