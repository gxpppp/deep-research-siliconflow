import { useState, useEffect, useCallback } from 'react'
import { Settings, AlertTriangle, Info, ExternalLink, History, X, Server, Key, Brain, Sliders, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useSettingsStore } from '@/stores/settingsStore'
import { fetchModels } from '@/services/api'
import type { ModelConfig } from '@/types'
import { PREDEFINED_PROVIDERS, COMMON_MODELS, isThinkingModel } from '@/types'
import { cn } from '@/lib/utils'
import { SearchEngineSelector } from './SearchEngineSelector'

export function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const [models, setModels] = useState<ModelConfig[]>([])
  const [showApiKey, setShowApiKey] = useState(false)
  const [activeTab, setActiveTab] = useState('provider')
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  
  const settings = useSettingsStore()
  
  const {
    provider,
    customProviderUrl,
    apiKey,
    model,
    customModel,
    useCustomModel,
    modelHistory,
    searchDays,
    maxResults,
    enablePdf,
    searchEngine,
    contextLength,
    maxTokens,
    temperature,
    enableTokenTracking,
    enableThinking,
    setProvider,
    setCustomProviderUrl,
    setApiKey,
    setModel,
    setCustomModel,
    setUseCustomModel,
    addModelToHistory,
    removeModelFromHistory,
    setSearchDays,
    setMaxResults,
    setEnablePdf,
    setSearchEngine,
    setContextLength,
    setMaxTokens,
    setTemperature,
    setEnableTokenTracking,
    setEnableThinking,
    resetSettings,
    getEffectiveModel,
  } = settings

  // Get current provider config
  const currentProvider = PREDEFINED_PROVIDERS.find(p => p.id === provider) || PREDEFINED_PROVIDERS[0]

  // Fetch models when provider or API key changes
  useEffect(() => {
    const loadModels = async () => {
      if (!apiKey || provider === 'custom') {
        // Use common models for the provider
        setModels(COMMON_MODELS[provider] || COMMON_MODELS['siliconflow'])
        return
      }

      setIsLoadingModels(true)
      try {
        const data = await fetchModels(provider, apiKey, currentProvider.baseUrl)
        if (data.models && data.models.length > 0) {
          setModels(data.models)
        } else {
          setModels(COMMON_MODELS[provider] || [])
        }
      } catch (err) {
        console.error('Failed to fetch models:', err)
        setModels(COMMON_MODELS[provider] || [])
      } finally {
        setIsLoadingModels(false)
      }
    }

    if (open) {
      loadModels()
    }
  }, [provider, apiKey, open, currentProvider.baseUrl])

  // Handle custom model input
  const handleCustomModelChange = useCallback((value: string) => {
    setCustomModel(value)
    if (value.trim()) {
      setUseCustomModel(true)
    }
  }, [setCustomModel, setUseCustomModel])

  // Handle custom model blur (add to history)
  const handleCustomModelBlur = useCallback(() => {
    if (customModel.trim() && useCustomModel) {
      addModelToHistory(customModel, customModel)
    }
  }, [customModel, useCustomModel, addModelToHistory])

  // Handle model selection from dropdown
  const handleModelSelect = useCallback((value: string) => {
    setModel(value)
    setUseCustomModel(false)
    const selectedModel = models.find(m => m.value === value)
    if (selectedModel) {
      addModelToHistory(value, selectedModel.label)
    }
  }, [setModel, setUseCustomModel, models, addModelToHistory])

  // Handle history model click
  const handleHistoryModelClick = useCallback((historyModel: string) => {
    // Check if it's in current models list
    const inCurrentList = models.find(m => m.value === historyModel)
    if (inCurrentList) {
      setModel(historyModel)
      setUseCustomModel(false)
    } else {
      setCustomModel(historyModel)
      setUseCustomModel(true)
    }
    addModelToHistory(historyModel, historyModel)
  }, [models, setModel, setCustomModel, setUseCustomModel, addModelToHistory])

  // Handle reset
  const handleReset = () => {
    if (confirm('确定要重置所有设置吗？历史模型记录将保留。')) {
      resetSettings()
    }
  }

  // Filter history for current provider
  const currentProviderHistory = modelHistory.filter(h => h.provider === provider)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Settings className="h-5 w-5" />
          {!apiKey && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500" />
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            设置
          </DialogTitle>
          <DialogDescription>
            配置模型提供商、API 密钥和研究参数
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="provider" className="flex items-center gap-1">
              <Server className="h-4 w-4" />
              <span className="hidden sm:inline">提供商</span>
            </TabsTrigger>
            <TabsTrigger value="model" className="flex items-center gap-1">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">模型</span>
            </TabsTrigger>
            <TabsTrigger value="parameters" className="flex items-center gap-1">
              <Sliders className="h-4 w-4" />
              <span className="hidden sm:inline">参数</span>
            </TabsTrigger>
          </TabsList>

          {/* Provider Tab */}
          <TabsContent value="provider" className="space-y-6">
            {/* Provider Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <Server className="h-4 w-4" />
                模型提供商
              </label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="选择提供商" />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex flex-col items-start">
                        <span>{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Custom Provider URL */}
              {provider === 'custom' && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">自定义 API 地址</label>
                  <Input
                    value={customProviderUrl}
                    onChange={(e) => setCustomProviderUrl(e.target.value)}
                    placeholder="https://api.example.com/v1"
                  />
                  <p className="text-xs text-muted-foreground">
                    输入兼容 OpenAI API 格式的自定义端点地址
                  </p>
                </div>
              )}
            </div>

            {/* API Key Section */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Key
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={currentProvider.apiKeyPlaceholder || '输入您的 API Key'}
                  className="pr-20"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? '隐藏' : '显示'}
                </Button>
              </div>
              
              {/* Provider Help Link */}
              {currentProvider.apiKeyHelpUrl && (
                <a
                  href={currentProvider.apiKeyHelpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  如何获取 {currentProvider.name} API Key
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              
              {/* Security Warning */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-amber-800 dark:text-amber-200">
                  API Key 仅存储在您的浏览器本地。请勿在公共设备上保存密钥。
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Model Tab */}
          <TabsContent value="model" className="space-y-6">
            {/* Model Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4" />
                选择模型
              </label>
              
              {/* Model Dropdown */}
              <Select 
                value={useCustomModel ? '' : model} 
                onValueChange={handleModelSelect}
                disabled={isLoadingModels}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingModels ? '加载中...' : '选择模型'} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {models.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex flex-col items-start">
                        <span>{m.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {m.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Custom Model Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">或输入自定义模型名称</label>
                  <Switch
                    checked={useCustomModel}
                    onCheckedChange={setUseCustomModel}
                  />
                </div>
                <Input
                  value={customModel}
                  onChange={(e) => handleCustomModelChange(e.target.value)}
                  onBlur={handleCustomModelBlur}
                  placeholder="例如: gpt-4o-mini, claude-3-sonnet-20241022"
                  disabled={!useCustomModel}
                  className={cn(useCustomModel && "border-blue-500")}
                />
                {useCustomModel && (
                  <p className="text-xs text-blue-600">
                    已启用自定义模型模式
                  </p>
                )}
              </div>

              {/* Current Model Display */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">当前生效模型</p>
                <p className="font-medium text-sm">{getEffectiveModel()}</p>
              </div>
            </div>

            {/* Model History */}
            {currentProviderHistory.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <History className="h-4 w-4" />
                  历史模型
                  <span className="text-xs text-muted-foreground">
                    ({currentProviderHistory.length})
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {currentProviderHistory.map((entry) => (
                    <Badge
                      key={entry.model}
                      variant={getEffectiveModel() === entry.model ? "default" : "secondary"}
                      className="cursor-pointer hover:bg-primary/90 group"
                      onClick={() => handleHistoryModelClick(entry.model)}
                    >
                      <span className="max-w-[150px] truncate">
                        {entry.label}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeModelFromHistory(entry.model)
                        }}
                        className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('确定要清空历史模型记录吗？')) {
                      currentProviderHistory.forEach(h => removeModelFromHistory(h.model))
                    }
                  }}
                  className="text-xs text-muted-foreground"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  清空历史
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Parameters Tab */}
          <TabsContent value="parameters" className="space-y-6">
            {/* Search Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                搜索设置
              </h4>

              {/* Search Engine Selector */}
              <SearchEngineSelector
                value={searchEngine}
                onChange={(engine) => setSearchEngine(engine)}
              />

              {/* Search Days */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm">搜索时间范围</label>
                  <span className="text-sm text-muted-foreground">
                    最近 {searchDays} 天
                  </span>
                </div>
                <Slider
                  value={[searchDays]}
                  onValueChange={([value]) => setSearchDays(value)}
                  min={7}
                  max={365}
                  step={7}
                />
              </div>

              {/* Max Results */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm">最大搜索结果数</label>
                  <span className="text-sm text-muted-foreground">
                    {maxResults} 条
                  </span>
                </div>
                <Slider
                  value={[maxResults]}
                  onValueChange={([value]) => setMaxResults(value)}
                  min={5}
                  max={50}
                  step={5}
                />
              </div>
            </div>

            {/* Model Parameters */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4" />
                模型参数
              </h4>
              
              {/* Context Length */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm">上下文长度</label>
                  <span className="text-sm text-muted-foreground">
                    {contextLength >= 1000 ? `${contextLength / 1000}K` : contextLength}
                  </span>
                </div>
                <Slider
                  value={[contextLength]}
                  onValueChange={([value]) => setContextLength(value)}
                  min={4096}
                  max={200000}
                  step={4096}
                />
                <p className="text-xs text-muted-foreground">
                  模型能处理的最大上下文 token 数
                </p>
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm">最大输出 Token</label>
                  <span className="text-sm text-muted-foreground">
                    {maxTokens}
                  </span>
                </div>
                <Slider
                  value={[maxTokens]}
                  onValueChange={([value]) => setMaxTokens(value)}
                  min={500}
                  max={8000}
                  step={500}
                />
                <p className="text-xs text-muted-foreground">
                  模型单次响应的最大 token 数
                </p>
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm">Temperature</label>
                  <span className="text-sm text-muted-foreground">
                    {temperature}
                  </span>
                </div>
                <Slider
                  value={[temperature]}
                  onValueChange={([value]) => setTemperature(value)}
                  min={0}
                  max={2}
                  step={0.1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>精确 (0)</span>
                  <span>平衡 (1)</span>
                  <span>创意 (2)</span>
                </div>
              </div>
            </div>

            {/* Other Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">其他设置</h4>
              
              {/* Enable PDF */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm">启用 PDF 分析</label>
                  <p className="text-xs text-muted-foreground">
                    允许分析 PDF 文档内容
                  </p>
                </div>
                <Switch
                  checked={enablePdf}
                  onCheckedChange={setEnablePdf}
                />
              </div>

              {/* Enable Token Tracking */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm">启用 Token 用量统计</label>
                  <p className="text-xs text-muted-foreground">
                    显示每次研究的 token 消耗情况
                  </p>
                </div>
                <Switch
                  checked={enableTokenTracking}
                  onCheckedChange={setEnableTokenTracking}
                />
              </div>

              {/* Enable Thinking Mode */}
              {isThinkingModel(getEffectiveModel()) && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm flex items-center gap-1">
                      启用思考模式
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        推理模型
                      </span>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      展示模型详细的推理思考过程，提升分析深度
                    </p>
                  </div>
                  <Switch
                    checked={enableThinking}
                    onCheckedChange={setEnableThinking}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Info Box */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">配置提示</p>
            <p>
              当前提供商: <strong>{currentProvider.name}</strong>
              <br />
              生效模型: <strong>{getEffectiveModel()}</strong>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset} size="sm">
            <Trash2 className="h-4 w-4 mr-1" />
            重置设置
          </Button>
          <Button onClick={() => setOpen(false)}>
            完成
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
