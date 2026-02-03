import { useResearchStore } from '@/stores/researchStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Search,
  Clock,
  CheckCircle2,
  Loader2,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react'
import { useState } from 'react'
import type { SearchRound, SearchResultItem } from '@/types'

export function SearchPanel() {
  const { processData, isResearching, status, toggleSearchRoundExpand } = useResearchStore()
  const { searchRounds } = processData
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
