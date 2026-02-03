import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText, ExternalLink, Clock, CheckCircle, BookOpen, Lightbulb, HelpCircle, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useResearchStore } from '@/stores/researchStore'
import { formatDuration } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

export function ReportViewer() {
  const [activeTab, setActiveTab] = useState<'report' | 'sources'>('report')
  
  const { report, sources, isResearching } = useResearchStore()

  if (isResearching && !report) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <div className="animate-pulse text-6xl mb-4">📊</div>
        <h3 className="text-lg font-medium">正在生成深度研究报告...</h3>
        <p className="text-sm mt-2">AI 正在分析多个来源并综合信息，请稍候</p>
      </div>
    )
  }

  if (!report) {
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

  const { rawContent } = report.report || {}

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

  const reportSections = parseReportSections(rawContent || '')

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{report.query}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              {report.durationMs && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  研究耗时: {formatDuration(report.durationMs)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                参考来源: {sources?.length || 0} 个
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                研究完成
              </span>
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
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto">
          {activeTab === 'report' ? (
            <div className="space-y-6">
              {/* Executive Summary Card */}
              {reportSections['📌 执行摘要'] && (
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
              {reportSections['🔍 研究方法与数据来源'] && (
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
              {reportSections['📊 核心发现'] && (
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
              {reportSections['📈 详细分析'] && (
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
              {reportSections['⚖️ 观点对比与争议分析'] && (
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
              {reportSections['❓ 未解问题与研究缺口'] && (
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
              {rawContent && (
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
