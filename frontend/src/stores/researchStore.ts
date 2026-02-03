import { create } from 'zustand'
import type { 
  ResearchStatus, 
  ResearchResponse, 
  ChatMessage, 
  Citation,
  ConsoleLog,
  ConsoleLogLevel,
  ProcessData,
  PlanningData,
  SearchRound,
  AnalysisData,
  AnalysisStep
} from '@/types'

/**
 * Research store for managing research state, chat messages, console logs, and process visualization
 */

interface ResearchState {
  // Current research
  isResearching: boolean
  currentResearchId: string | null
  status: ResearchStatus
  progress: number
  currentStage: string
  statusMessage: string
  
  // Results
  report: ResearchResponse | null
  sources: Citation[]
  
  // Chat messages
  messages: ChatMessage[]
  
  // Console logs
  consoleLogs: ConsoleLog[]
  isConsoleOpen: boolean
  isAutoScroll: boolean
  unreadLogCount: number
  
  // Process visualization data
  processData: ProcessData
  
  // Actions
  startResearch: (researchId: string) => void
  updateStatus: (status: ResearchStatus, stage: string, progress: number, message: string) => void
  setReport: (report: ResearchResponse) => void
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
  reset: () => void
  
  // Console actions
  addConsoleLog: (level: ConsoleLogLevel, message: string, details?: unknown, metadata?: Record<string, unknown>) => void
  clearConsoleLogs: () => void
  toggleConsole: () => void
  toggleAutoScroll: () => void
  markLogsAsRead: () => void
  
  // Process visualization actions
  setPlanningData: (data: PlanningData) => void
  addSearchRound: (round: SearchRound) => void
  updateSearchRound: (roundId: string, updates: Partial<SearchRound>) => void
  toggleSearchRoundExpand: (roundId: string) => void
  setAnalysisData: (data: AnalysisData) => void
  addAnalysisStep: (step: AnalysisStep) => void
  updateProcessPhase: (phase: ResearchStatus) => void
  clearProcessData: () => void
}

const initialProcessData: ProcessData = {
  planning: null,
  searchRounds: [],
  analysis: null,
  currentPhase: 'pending'
}

export const useResearchStore = create<ResearchState>((set) => ({
  // Initial state
  isResearching: false,
  currentResearchId: null,
  status: 'pending',
  progress: 0,
  currentStage: '',
  statusMessage: '',
  report: null,
  sources: [],
  messages: [],
  
  // Console initial state
  consoleLogs: [],
  isConsoleOpen: false,
  isAutoScroll: true,
  unreadLogCount: 0,
  
  // Process visualization initial state
  processData: initialProcessData,

  // Actions
  startResearch: (researchId) => set({
    isResearching: true,
    currentResearchId: researchId,
    status: 'planning',
    progress: 0,
    currentStage: '规划',
    statusMessage: '正在分析查询...',
    report: null,
    sources: [],
    consoleLogs: [],
    unreadLogCount: 0,
    processData: initialProcessData,
  }),

  updateStatus: (status, stage, progress, message) => set({
    status,
    currentStage: stage,
    progress,
    statusMessage: message,
  }),

  setReport: (report) => set({
    isResearching: false,
    status: report.status,
    report,
    sources: report.sources || [],
    progress: 100,
  }),

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),

  clearMessages: () => set({ messages: [] }),

  reset: () => set({
    isResearching: false,
    currentResearchId: null,
    status: 'pending',
    progress: 0,
    currentStage: '',
    statusMessage: '',
    report: null,
    sources: [],
    consoleLogs: [],
    unreadLogCount: 0,
    processData: initialProcessData,
  }),
  
  // Console actions
  addConsoleLog: (level, message, details, metadata) => set((state) => {
    const newLog: ConsoleLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      message,
      details,
      metadata,
    }
    return {
      consoleLogs: [...state.consoleLogs, newLog],
      unreadLogCount: state.isConsoleOpen ? 0 : state.unreadLogCount + 1,
    }
  }),
  
  clearConsoleLogs: () => set({ consoleLogs: [], unreadLogCount: 0 }),
  
  toggleConsole: () => set((state) => ({
    isConsoleOpen: !state.isConsoleOpen,
    unreadLogCount: !state.isConsoleOpen ? 0 : state.unreadLogCount,
  })),
  
  toggleAutoScroll: () => set((state) => ({
    isAutoScroll: !state.isAutoScroll,
  })),
  
  markLogsAsRead: () => set({ unreadLogCount: 0 }),
  
  // Process visualization actions
  setPlanningData: (data) => set((state) => ({
    processData: {
      ...state.processData,
      planning: data,
      currentPhase: 'planning'
    }
  })),
  
  addSearchRound: (round) => set((state) => ({
    processData: {
      ...state.processData,
      searchRounds: [...state.processData.searchRounds, round],
      currentPhase: 'searching'
    }
  })),
  
  updateSearchRound: (roundId, updates) => set((state) => ({
    processData: {
      ...state.processData,
      searchRounds: state.processData.searchRounds.map(round =>
        round.id === roundId ? { ...round, ...updates } : round
      )
    }
  })),
  
  toggleSearchRoundExpand: (roundId) => set((state) => ({
    processData: {
      ...state.processData,
      searchRounds: state.processData.searchRounds.map(round =>
        round.id === roundId ? { ...round, isExpanded: !round.isExpanded } : round
      )
    }
  })),
  
  setAnalysisData: (data) => set((state) => ({
    processData: {
      ...state.processData,
      analysis: data,
      currentPhase: 'analyzing'
    }
  })),
  
  addAnalysisStep: (step) => set((state) => ({
    processData: {
      ...state.processData,
      analysis: state.processData.analysis ? {
        ...state.processData.analysis,
        steps: [...state.processData.analysis.steps, step]
      } : {
        steps: [step],
        keyFindings: [],
        isComplete: false,
        timestamp: new Date()
      },
      currentPhase: 'analyzing'
    }
  })),
  
  updateProcessPhase: (phase) => set((state) => ({
    processData: {
      ...state.processData,
      currentPhase: phase
    }
  })),
  
  clearProcessData: () => set({
    processData: initialProcessData
  }),
}))
