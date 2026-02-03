/**
 * Mode Switcher - Toggle between Basic and Advanced modes
 */

import { Sparkles, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ModeSwitcherProps {
  currentMode: 'basic' | 'advanced';
  onModeChange: (mode: 'basic' | 'advanced') => void;
}

export function ModeSwitcher({ currentMode, onModeChange }: ModeSwitcherProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentMode === 'basic' ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
              onClick={() => onModeChange('basic')}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">基础模式</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>简洁的研究界面，适合快速研究</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentMode === 'advanced' ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
              onClick={() => onModeChange('advanced')}
            >
              <Workflow className="w-4 h-4" />
              <span className="hidden sm:inline">进阶模式</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>可视化工作流编辑器，自定义研究流程</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
