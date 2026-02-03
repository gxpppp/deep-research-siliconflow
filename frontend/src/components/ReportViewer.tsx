import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText, ExternalLink, Clock, CheckCircle, BookOpen, Lightbulb, HelpCircle, BarChart3, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useResearchStore } from '@/stores/researchStore'
import { formatDuration } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

export function ReportViewer() {
  const [activeTab, setActiveTab] = useState<'report' | 'sources'>('report')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const { report, sources, processData } = useResearchStore()
  const { streamingContents } = processData
  
  // 获取合成阶段的流式内容
  const synthesisContent = streamingContents.find(c => c.stage === 'synthesis')
  
  // 自动滚动到底部
  useEffect(() => {
    if (scrollContainerRef.current && synthesisContent?.isStreaming) {
      const container = scrollContainerRef.current
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [synthesisContent?.content, synthesisContent?.isStreaming])

  // 如果没有报告且没有正在合成的内容，显示空状态
  if (!report && !synthesisContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <FileText className="h-16 w-16 mb-4 opacity-50" />
        <h3 className="text-lg font-medium">报告将在这里显示</h3>
        <p className="text-sm mt-2 text-center">
          在左侧输入研究问题，AI 将生成带溯源的结构化深度报告
        </p>
      </div>
    )
  }

  const rawContent = report?.report?.rawContent || ''

  // Parse report sections from raw content
  const parseReportSections = (content: string) => {
    if (!content) return {}
    
    const sections: Record<string, string> = {}
    const lines = content.split('\n')
    let currentSection = ''
    let currentContent: string[] = []
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Match section headers
      if (trimmedLine.startsWith('## ')) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n')
        }
        currentSection = trimmedLine.replace(/^##\s*/, '')
        currentContent = []
      } else if (currentSection) {
        currentContent.push(line)
      }
    }
    
    // Save last section
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n')
    }
    
    return sections
  }

  const reportSections = parseReportSections(rawContent)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{report?.query || synthesisContent?.title || '研究报告'}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              {report?.durationMs && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  研究耗时: {formatDuration(report.durationMs)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                参考来源: {sources?.length || 0} 个
              </span>
              {report ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  研究完成
                </span>
              ) : synthesisContent?.isStreaming ? (
                <span className="flex items-center gap-1 text-blue-600">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  正在生成报告...
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-background">
        <button
          onClick={() => setActiveTab('report')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'report'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          研究报告
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'sources'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          参考文献 ({sources?.length || 0})
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1" ref={scrollContainerRef}>
        <div className="p-6 max-w-4xl mx-auto">
          {activeTab === 'report' ? (
            <div className="space-y-6">
              {/* 实时生成中的报告内容 */}
              {!report && synthesisContent && (
                <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" />
                      正在生成研究报告
                      {synthesisContent.isStreaming && (
                        <span className="text-xs font-normal text-muted-foreground ml-2">
                          实时输出中...
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {synthesisContent.content}
                      </ReactMarkdown>
                      {synthesisContent.isStreaming && (
                        <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5"></span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Executive Summary Card */}
              {report && reportSections['📌 执行摘要'] && (
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                      执行摘要
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {reportSections['📌 执行摘要']}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Research Methodology */}
              {report && reportSections['🔍 研究方法与数据来源'] && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      研究方法与数据来源
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {reportSections['🔍 研究方法与数据来源']}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Key Findings */}
              {report && reportSections['📊 核心发现'] && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      核心发现
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {reportSections['📊 核心发现']}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Analysis */}
              {report && reportSections['📈 详细分析'] && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-green-500" />
                      详细分析
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {reportSections['📈 详细分析']}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Viewpoints Comparison */}
              {report && reportSections['⚖️ 观点对比与争议分析'] && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-purple-500" />
                      观点对比与争议分析
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {reportSections['⚖️ 观点对比与争议分析']}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Open Questions */}
              {report && reportSections['❓ 未解问题与研究缺口'] && (
                <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-amber-600" />
                      未解问题与研究缺口
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {reportSections['❓ 未解问题与研究缺口']}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Full Report */}
              {report && rawContent && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">完整报告</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {rawContent}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* Sources Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-lg">参考文献列表</h3>
                  <p className="text-sm text-muted-foreground">
                    本研究引用的所有来源，按引用顺序排列
                  </p>
                </div>
              </div>

              {sources && sources.length > 0 ? (
                <div className="space-y-3">
                  {sources.map((source, index) => (
                    <Card key={source.index || index} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-medium">
                            {source.index || index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm line-clamp-2 mb-1">
                              {source.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="secondary" className="text-xs">
                                {source.source || 'Web'}
                              </Badge>
                              {source.date && (
                                <span>{source.date}</span>
                              )}
                            </div>
                            {source.url && (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
                              >
                                <ExternalLink className="h-3 w-3" />
                                查看原始来源
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>暂无参考文献</p>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
