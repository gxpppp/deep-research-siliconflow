import { useState, useEffect } from 'react'
import { Settings, AlertTriangle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
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

export function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const [models, setModels] = useState<ModelConfig[]>([])
  const [showApiKey, setShowApiKey] = useState(false)
  
  const {
    apiKey,
    model,
    searchDays,
    maxResults,
    enablePdf,
    setApiKey,
    setModel,
    setSearchDays,
    setMaxResults,
    setEnablePdf,
    resetSettings,
  } = useSettingsStore()

  // Default models as fallback
  const defaultModels: ModelConfig[] = [
    {
      value: 'deepseek-ai/DeepSeek-V2.5',
      label: 'DeepSeek-V2.5 (深度研究推荐)',
      description: '强推理能力，适合复杂分析，128K上下文'
    },
    {
      value: 'Qwen/Qwen2-72B-Instruct',
      label: 'Qwen2-72B (全能型)',
      description: '中英双语均衡，通用任务表现优秀'
    },
    {
      value: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
      label: 'Llama-3.1-70B (英文优先)',
      description: 'Meta开源模型，英文内容生成质量高'
    },
    {
      value: 'THUDM/glm-4-9b-chat',
      label: 'GLM-4-9B (轻量快速)',
      description: '轻量级模型，响应速度快，成本低'
    }
  ]

  // Fetch available models on mount
  useEffect(() => {
    fetchModels()
      .then((data) => {
        if (data.models && data.models.length > 0) {
          setModels(data.models)
        } else {
          setModels(defaultModels)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch models:', err)
        setModels(defaultModels)
      })
  }, [])

  const handleReset = () => {
    if (confirm('确定要重置所有设置吗？')) {
      resetSettings()
    }
  }

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
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>
            配置 API 密钥和研究参数
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* API Key Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              SiliconFlow API Key
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入您的 API Key"
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
            
            {/* Security Warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-amber-800 dark:text-amber-200">
                API Key 仅存储在您的浏览器本地。请勿在公共设备上保存密钥。
              </p>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">模型选择</label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
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
          </div>

          {/* Search Days */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">搜索时间范围</label>
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
              <label className="text-sm font-medium">最大搜索结果数</label>
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

          {/* Enable PDF */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">启用 PDF 分析</label>
              <p className="text-xs text-muted-foreground">
                允许分析 PDF 文档内容
              </p>
            </div>
            <Switch
              checked={enablePdf}
              onCheckedChange={setEnablePdf}
            />
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">关于 API Key</p>
              <p>
                请从{' '}
                <a
                  href="https://cloud.siliconflow.cn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  SiliconFlow 控制台
                </a>{' '}
                获取您的 API Key。
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
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
