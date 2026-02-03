import { useState, useEffect } from 'react'
import { Check, AlertCircle, Search, ChevronDown } from 'lucide-react'
import type { SearchEngine, SearchEngineConfig } from '@/types'
import { PREDEFINED_SEARCH_ENGINES } from '@/types'

interface SearchEngineSelectorProps {
  value: SearchEngine
  onChange: (engine: SearchEngine) => void
  disabled?: boolean
}

export function SearchEngineSelector({ value, onChange, disabled = false }: SearchEngineSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [engines, setEngines] = useState<SearchEngineConfig[]>(PREDEFINED_SEARCH_ENGINES)

  // Fetch available engines from backend
  useEffect(() => {
    const fetchEngines = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/search-engines`)
        if (response.ok) {
          const data = await response.json()
          if (data.engines) {
            setEngines(data.engines)
          }
        }
      } catch (error) {
        // Use predefined engines if backend endpoint not available
        console.log('Using predefined search engines')
      }
    }

    fetchEngines()
  }, [])

  const selectedEngine = engines.find(e => e.id === value) || engines[0]

  const handleSelect = (engineId: SearchEngine) => {
    onChange(engineId)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        搜索引擎
      </label>
      
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-4 py-2.5 rounded-lg
          border transition-all duration-200
          ${disabled 
            ? 'bg-slate-800/50 border-slate-700 cursor-not-allowed opacity-60' 
            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 cursor-pointer'
          }
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`
            w-8 h-8 rounded-lg flex items-center justify-center
            ${selectedEngine?.configured 
              ? 'bg-emerald-500/10 text-emerald-400' 
              : 'bg-amber-500/10 text-amber-400'
            }
          `}>
            <Search className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-slate-200">
              {selectedEngine?.name || '选择搜索引擎'}
            </div>
            <div className="text-xs text-slate-400">
              {selectedEngine?.description}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!selectedEngine?.configured && (
            <AlertCircle className="w-4 h-4 text-amber-400" />
          )}
          <ChevronDown className={`
            w-4 h-4 text-slate-400 transition-transform duration-200
            ${isOpen ? 'rotate-180' : ''}
          `} />
        </div>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-2 space-y-1">
              {engines.map((engine) => (
                <button
                  key={engine.id}
                  type="button"
                  onClick={() => handleSelect(engine.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-all duration-200 text-left
                    ${value === engine.id 
                      ? 'bg-blue-500/10 border border-blue-500/30' 
                      : 'hover:bg-slate-700/50 border border-transparent'
                    }
                  `}
                >
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${engine.configured 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'bg-amber-500/10 text-amber-400'
                    }
                  `}>
                    {value === engine.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">
                        {engine.name}
                      </span>
                      {!engine.configured && engine.requiresApiKey && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded">
                          需配置
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {engine.description}
                    </div>
                    {engine.requiresApiKey && engine.apiKeyEnv && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        环境变量: {engine.apiKeyEnv}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="px-4 py-2 bg-slate-900/50 border-t border-slate-700">
              <p className="text-xs text-slate-400">
                提示: Bing 搜索需要配置 BING_SEARCH_API_KEY 环境变量
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
